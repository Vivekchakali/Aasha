import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple

from database import db
from models.sms_message import SMSMessage, SMSLog
from models.household_member import HouseholdMember, validate_phone_number, normalize_to_e164, mask_phone_number
from models.followup import FollowUp
from services.audit_service import log_audit_event
from services.sms_providers import BaseSMSProvider, MockSMSProvider, TwilioSMSProvider

logger = logging.getLogger(__name__)

# -------------------------------------------------------------
# Approved Rule-Based Multilingual Template Catalog
# STRICT RULE: No medical diagnosis, no treatment/dosage advice.
# Purely administrative & scheduled care appointment reminders.
# -------------------------------------------------------------
SMS_TEMPLATES = {
    'vaccination': {
        'en': 'Reminder: {name} has a scheduled vaccination on {due_date}. Please visit the health centre or contact your ASHA worker.',
        'te': 'జ్ఞాపిక: {name} గారికి {due_date} తేదీన టీకా నిర్ణయించబడింది. దయచేసి ఆరోగ్య కేంద్రాన్ని సందర్శించండి లేదా మీ ఆశా కార్యకర్తను సంపద్రించండి.',
        'hi': 'सूचना: {name} का टीकाकरण {due_date} को निर्धारित है। कृपया स्वास्थ्य केंद्र पर आएं या अपनी आशा कार्यकर्ता से संपर्क करें।'
    },
    'iron_tablets': {
        'en': 'Reminder: {name} has iron and folic acid tablets ready for collection on {due_date}. Please contact your ASHA worker.',
        'te': 'జ్ఞాపిక: {name} గారికి {due_date} తేదీన ఐరన్ మరియు ఫోలిక్ యాసిడ్ మాత్రలు అందుబాటులో ఉన్నాయి. దయచేసి మీ ఆశా కార్యకర్తను సంప్రదించండి.',
        'hi': 'सूचना: {name} की आयरन एवं फोलिक एसिड की गोलियां {due_date} को उपलब्ध हैं। कृपया अपनी आशा कार्यकर्ता से संपर्क करें।'
    },
    'medication': {
        'en': 'Reminder: {name} has a scheduled health follow-up check on {due_date}. Please contact your ASHA worker.',
        'te': 'జ్ఞాపిక: {name} గారికి {due_date} తేదీన ఆరోగ్య ఫాలో-అప్ తనిఖీ నిర్ణయించబడింది. దయచేసి మీ ఆశా కార్యకర్తను సంప్రదించండి.',
        'hi': 'सूचना: {name} की स्वास्थ्य जांच {due_date} को निर्धारित है। कृपया अपनी आशा कार्यकर्ता से संपर्क करें।'
    },
    'general': {
        'en': 'Reminder: {name} has a scheduled follow-up on {due_date} for {reason}. Please contact your ASHA worker.',
        'te': 'జ్ఞాపిక: {name} గారికి {due_date} తేదీన {reason} కోసం ఫాలో-అప్ నిర్ణయించబడింది. దయచేసి మీ ఆశా కార్యకర్తను సంప్రదించండి.',
        'hi': 'सूचना: {name} का {due_date} को {reason} हेतु फॉलो-अप निर्धारित है। कृपया अपनी आशा कार्यकर्ता से संपर्क करें।'
    }
}

# Synonymous mappings for canonical reminder types
TYPE_ALIASES = {
    'VACCINATION_REMINDER': 'vaccination',
    'IRON_COLLECTION_REMINDER': 'iron_tablets',
    'FOLLOWUP_REMINDER': 'medication',
    'GENERAL_SCHEDULED_FOLLOWUP': 'general',
    'vaccination': 'vaccination',
    'iron_tablets': 'iron_tablets',
    'medication': 'medication',
    'general': 'general'
}

def get_sms_provider(provider_override: Optional[str] = None) -> BaseSMSProvider:
    """
    Returns the configured SMS Provider instance.
    Defaults to MockSMSProvider for safe offline/demo operation.
    """
    app_val = None
    try:
        from flask import current_app, has_app_context
        if has_app_context():
            app_val = current_app.config.get('SMS_PROVIDER')
    except Exception:
        pass

    provider_name = (provider_override or app_val or os.environ.get('SMS_PROVIDER', 'mock')).strip().lower()
    if provider_name == 'twilio':
        return TwilioSMSProvider()
    return MockSMSProvider()

def get_current_provider_name() -> str:
    app_val = None
    try:
        from flask import current_app, has_app_context
        if has_app_context():
            app_val = current_app.config.get('SMS_PROVIDER')
    except Exception:
        pass
    return (app_val or os.environ.get('SMS_PROVIDER', 'mock')).strip().lower()

class EligibilityResult(tuple):
    def __new__(cls, eligible: bool, reason: Optional[str]):
        return super().__new__(cls, (bool(eligible), reason))

    @property
    def eligible(self) -> bool:
        return self[0]

    @property
    def reason(self) -> Optional[str]:
        return self[1]

    def __getitem__(self, item):
        if item == 'eligible':
            return self[0]
        if item == 'reason':
            return self[1]
        return super().__getitem__(item)

def render_template(template_type: str, language: str = 'en', context: Optional[Dict[str, Any]] = None) -> str:
    """
    Renders an approved template using structured variables only.
    Contains ONLY the beneficiary message without mock tags in the body text.
    """
    if context is None:
        context = {}
    
    clean_lang = (language or 'en').strip().lower()
    if clean_lang not in ['en', 'te', 'hi']:
        clean_lang = 'en'
        
    canonical_type = TYPE_ALIASES.get(template_type, 'general')
    tpl_group = SMS_TEMPLATES.get(canonical_type, SMS_TEMPLATES['general'])
    template = tpl_group.get(clean_lang, tpl_group['en'])
    
    name = context.get('name') or context.get('member_name') or 'Beneficiary'
    due_date = str(context.get('due_date') or context.get('date') or 'the scheduled date')
    reason = str(context.get('reason') or 'health follow-up')

    return template.format(name=name, due_date=due_date, reason=reason)

def check_realtime_eligibility(
    recipient_phone: Optional[str] = None,
    member: Optional[HouseholdMember] = None,
    followup: Optional[FollowUp] = None,
    reminder_type: str = 'general',
    is_retry: bool = False,
    template_type: Optional[str] = None
) -> EligibilityResult:
    """
    13-point real-time eligibility check executed immediately before generating or dispatching SMS.
    """
    canonical_type = TYPE_ALIASES.get(template_type or reminder_type, 'general')

    # 1. Member existence
    if member is None and followup and followup.member:
        member = followup.member

    # 2. Household check
    if followup and not followup.household_id:
        return EligibilityResult(False, "Eligibility failure: Follow-up is not associated with any household.")

    # 3. SMS enabled check
    if member:
        is_opted_in = member.sms_opt_in if member.sms_opt_in is not None else True
        is_enabled = member.sms_enabled if hasattr(member, 'sms_enabled') and member.sms_enabled is not None else is_opted_in
        if not is_enabled:
            return EligibilityResult(False, "Recipient has opted out or disabled SMS reminders.")

    # 4 & 5. Phone validation and E.164 normalization
    actual_phone = recipient_phone or (member.phone_number if member else None)
    if not actual_phone:
        return EligibilityResult(False, "Phone number required for SMS.")

    valid_phone = validate_phone_number(actual_phone)
    if not valid_phone:
        return EligibilityResult(False, "Invalid mobile phone number format. A valid 10-digit Indian mobile number is required.")

    normalized = normalize_to_e164(actual_phone)
    if not normalized:
        return EligibilityResult(False, "Could not normalize phone number to E.164 format (+91XXXXXXXXXX).")

    # 6 & 7. Follow-up existence and pending status
    if followup:
        if followup.status == 'completed':
            return EligibilityResult(False, "Follow-up is already marked completed. Reminders are halted.")
        if followup.status not in ['pending', 'open']:
            return EligibilityResult(False, f"Follow-up status is '{followup.status}', not pending.")

    # 8. Action completion check
    if member:
        if canonical_type == 'vaccination' and member.vaccination_status == 'Complete':
            return EligibilityResult(False, "Action completed: Vaccination is already recorded as Complete.")
        if canonical_type == 'iron_tablets' and getattr(member, 'iron_tablets_collected', False) is True:
            return EligibilityResult(False, "Action completed: Iron tablets have already been collected.")

    # 9. Cooldown check (24 hours default, skipped for deliberate retry)
    if not is_retry:
        cooldown_hours = int(os.environ.get('SMS_COOLDOWN_HOURS', '24'))
        cutoff_time = datetime.utcnow() - timedelta(hours=cooldown_hours)
        
        recent_sent = SMSMessage.query.filter(
            SMSMessage.recipient_phone == valid_phone,
            SMSMessage.template_type == canonical_type,
            SMSMessage.status.in_(['SENT', 'DELIVERED', 'sent', 'simulated']),
            SMSMessage.created_at >= cutoff_time
        ).first()

        if recent_sent:
            time_str = recent_sent.created_at.strftime("%d %b %Y, %H:%M")
            return EligibilityResult(False, f"An SMS reminder was already sent recently ({time_str}). Duplicate prevented by cooldown.")

    # 10. Provider configuration check if twilio
    provider_name = get_current_provider_name()
    if provider_name == 'twilio':
        provider = get_sms_provider()
        if hasattr(provider, 'is_configured') and not provider.is_configured():
            return EligibilityResult(False, "TWILIO CONFIGURATION INCOMPLETE: Backend credentials are missing.")

    return EligibilityResult(True, None)

# Backward compatibility alias
can_send_sms = check_realtime_eligibility

def generate_sms_draft(
    followup_id: Optional[int] = None,
    member_id: Optional[int] = None,
    template_key: Optional[str] = None,
    template_type: Optional[str] = None,
    language: Optional[str] = None,
    user_info: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generates a reviewed SMS draft without sending it.
    Follows: Follow-up Created -> Eligibility Verified -> Generate/Preview.
    """
    followup = FollowUp.query.get(followup_id) if followup_id else None
    if followup:
        member = followup.member
        actual_phone = member.phone_number if member else None
        reminder_type = followup.followup_type or 'general'
        canonical_type = TYPE_ALIASES.get(template_key or template_type or reminder_type, 'general')
        lang = language or (member.preferred_language if member else 'en') or 'en'
        recipient_name = followup.beneficiary_name or (member.full_name if member else 'Beneficiary')
        due_date = followup.due_date
        reason = followup.reason
        household_id = followup.household_id
        target_member_id = followup.member_id
    elif member_id:
        member = HouseholdMember.query.get(member_id)
        if not member:
            return {'success': False, 'message': 'Household member not found.'}
        actual_phone = member.phone_number
        canonical_type = TYPE_ALIASES.get(template_key or template_type or 'general', 'general')
        lang = language or member.preferred_language or 'en'
        recipient_name = member.full_name
        due_date = 'the scheduled date'
        reason = 'health follow-up'
        household_id = member.household.household_id if member.household else None
        target_member_id = member.id
    else:
        return {'success': False, 'message': 'Either followup_id or member_id is required.'}

    is_eligible, err_reason = check_realtime_eligibility(
        recipient_phone=actual_phone,
        member=member,
        followup=followup,
        reminder_type=canonical_type,
        is_retry=False
    )

    if not is_eligible:
        return {'success': False, 'message': err_reason}

    valid_phone = validate_phone_number(actual_phone)
    normalized = normalize_to_e164(actual_phone)

    context = {
        'name': recipient_name,
        'due_date': due_date,
        'reason': reason
    }
    body = render_template(canonical_type, lang, context)
    provider_name = get_current_provider_name()

    existing_draft = None
    if followup:
        existing_draft = SMSMessage.query.filter_by(
            followup_id=followup.id,
            status='GENERATED'
        ).first()

    if existing_draft:
        existing_draft.recipient_name = recipient_name
        existing_draft.recipient_phone = valid_phone
        existing_draft.language = lang
        existing_draft.template_type = canonical_type
        existing_draft.reminder_type = canonical_type
        existing_draft.message_body = body
        existing_draft.provider = provider_name
        existing_draft.updated_at = datetime.utcnow()
        sms = existing_draft
    else:
        sms = SMSMessage(
            household_id=household_id,
            member_id=target_member_id,
            followup_id=followup.id if followup else None,
            recipient_name=recipient_name,
            recipient_phone=valid_phone,
            template_type=canonical_type,
            reminder_type=canonical_type,
            template_key=canonical_type,
            language=lang,
            message_body=body,
            status='GENERATED',
            provider=provider_name,
            attempt_count=0,
            simulated_flag=(provider_name == 'mock')
        )
        db.session.add(sms)

    if followup:
        followup.sms_status = 'GENERATED'
    db.session.commit()

    # Log audit event
    try:
        log_audit_event(
            action='sms_generated',
            user_id=user_info.get('user_id') if user_info else None,
            username=user_info.get('username', 'asha_worker') if user_info else 'asha_worker',
            role=user_info.get('role', 'asha') if user_info else 'asha',
            record_id=sms.id,
            details={
                'followup_id': followup.id if followup else None,
                'member_id': target_member_id,
                'recipient': mask_phone_number(valid_phone),
                'reminder_type': canonical_type,
                'language': lang,
                'provider': provider_name
            }
        )
    except Exception:
        pass

    return {
        'success': True,
        'message': 'SMS draft generated successfully for review.',
        'sms': sms.to_dict(mask_phone=True),
        'sms_id': sms.id,
        'normalized_phone': normalized,
        'provider': provider_name
    }

def send_or_simulate_sms(
    recipient_phone: Optional[str] = None,
    recipient_name: Optional[str] = None,
    template_type: Optional[str] = 'general',
    language: str = 'en',
    context: Optional[Dict[str, Any]] = None,
    member_id: Optional[int] = None,
    followup_id: Optional[int] = None,
    household_id: Optional[str] = None,
    custom_message_body: Optional[str] = None,
    user_info: Optional[Dict[str, Any]] = None,
    sms_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Dispatches an SMS message using the active provider (Mock or Twilio)
    following explicit confirmation and real-time backend eligibility validation.
    """
    if sms_id:
        sms_record = SMSMessage.query.get(sms_id)
        if not sms_record:
            return {'success': False, 'message': f'SMS #{sms_id} not found.', 'sms': None}
        if sms_record.status and sms_record.status.lower() == 'cancelled':
            return {'success': False, 'message': 'Cannot send cancelled SMS reminder.', 'sms': None}
        if not recipient_phone:
            recipient_phone = sms_record.recipient_phone
        if not recipient_name:
            recipient_name = sms_record.recipient_name
        if not member_id and sms_record.member_id:
            member_id = sms_record.member_id
        if not followup_id and sms_record.followup_id:
            followup_id = sms_record.followup_id
        if not custom_message_body and sms_record.message_body:
            custom_message_body = sms_record.message_body
        if (not template_type or template_type == 'general') and sms_record.template_type:
            template_type = sms_record.template_type

    if context is None:
        context = {}
    if not context.get('name'):
        context['name'] = recipient_name or 'Beneficiary'

    member = HouseholdMember.query.get(member_id) if member_id else None
    followup = FollowUp.query.get(followup_id) if followup_id else None
    canonical_type = TYPE_ALIASES.get(template_type or 'general', 'general')
    actual_phone = recipient_phone or (member.phone_number if member else None)

    # 1. Fresh real-time eligibility validation
    is_eligible, err_reason = check_realtime_eligibility(
        recipient_phone=actual_phone,
        member=member,
        followup=followup,
        reminder_type=canonical_type,
        is_retry=False
    )
    if not is_eligible:
        return {'success': False, 'message': err_reason, 'sms': None}

    valid_phone = validate_phone_number(actual_phone)
    normalized_e164 = normalize_to_e164(actual_phone)

    # 2. Prepare message body
    if custom_message_body and custom_message_body.strip():
        body = custom_message_body.strip()
    else:
        body = render_template(canonical_type, language, context)

    # 3. Provider invocation
    provider = get_sms_provider()
    provider_name = get_current_provider_name()

    try:
        dispatch_res = provider.send_sms(to_phone=normalized_e164, message_body=body)
    except Exception as e:
        dispatch_res = {
            'success': False,
            'status': 'FAILED',
            'provider': provider_name,
            'provider_message_id': None,
            'error': f'SMS dispatch encountered an unexpected error: {str(e)}',
            'is_simulated': (provider_name == 'mock')
        }

    status = dispatch_res.get('status', 'SENT')
    provider_msg_id = dispatch_res.get('provider_message_id')
    failure_err = dispatch_res.get('error')

    # 4. Persistence
    if sms_id:
        sms = SMSMessage.query.get(sms_id)
        if sms:
            sms.message_body = body
            sms.status = status
            sms.provider = provider_name
            sms.provider_message_id = provider_msg_id
            sms.failure_reason = failure_err
            sms.attempt_count = (sms.attempt_count or 0) + 1
            sms.sent_at = datetime.utcnow() if status != 'FAILED' else None
            sms.updated_at = datetime.utcnow()
    else:
        # Check if draft exists for followup
        existing_draft = SMSMessage.query.filter_by(followup_id=followup_id, status='GENERATED').first() if followup_id else None
        if existing_draft:
            existing_draft.recipient_name = recipient_name
            existing_draft.recipient_phone = valid_phone
            existing_draft.message_body = body
            existing_draft.status = status
            existing_draft.provider = provider_name
            existing_draft.provider_message_id = provider_msg_id
            existing_draft.failure_reason = failure_err
            existing_draft.attempt_count = (existing_draft.attempt_count or 0) + 1
            existing_draft.sent_at = datetime.utcnow() if status != 'FAILED' else None
            existing_draft.updated_at = datetime.utcnow()
            sms = existing_draft
        else:
            sms = SMSMessage(
                household_id=household_id or (followup.household_id if followup else None) or (member.household.household_id if member and member.household else None),
                member_id=member_id,
                followup_id=followup_id,
                recipient_name=recipient_name,
                recipient_phone=valid_phone,
                template_type=canonical_type,
                reminder_type=canonical_type,
                template_key=canonical_type,
                language=language or 'en',
                message_body=body,
                status=status,
                provider=provider_name,
                provider_message_id=provider_msg_id,
                attempt_count=1,
                simulated_flag=(provider_name == 'mock'),
                failure_reason=failure_err,
                sent_at=datetime.utcnow() if status != 'FAILED' else None
            )
            db.session.add(sms)

    if followup:
        followup.sms_status = status
        if status != 'FAILED':
            followup.last_reminder_at = datetime.utcnow()
            followup.reminder_count = (followup.reminder_count or 0) + 1

    db.session.commit()

    # 5. Audit log
    try:
        user_id = user_info.get('user_id') if user_info else None
        username = user_info.get('username', 'asha_worker') if user_info else 'asha_worker'
        role = user_info.get('role', 'asha') if user_info else 'asha'
        log_audit_event(
            action='sms_sent' if status != 'FAILED' else 'sms_failed',
            user_id=user_id,
            username=username,
            role=role,
            record_id=sms.id,
            details={
                'recipient': mask_phone_number(valid_phone),
                'template_type': canonical_type,
                'language': language,
                'status': status,
                'provider': provider_name,
                'provider_message_id': provider_msg_id,
                'error': failure_err
            }
        )
    except Exception:
        pass

    if status == 'FAILED':
        return {
            'success': False,
            'message': failure_err or 'SMS could not be sent. Please check the phone number or try again.',
            'sms': sms.to_dict(mask_phone=True)
        }

    return {
        'success': True,
        'message': f"SMS reminder successfully {status.lower()} to {mask_phone_number(valid_phone)}.",
        'sms': sms.to_dict(mask_phone=True)
    }

def retry_failed_sms(sms_id: int, user_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Retries a FAILED SMS record up to SMS_MAX_RETRIES (default 3),
    re-running the full eligibility check.
    """
    sms = SMSMessage.query.get(sms_id)
    if not sms:
        return {'success': False, 'message': 'SMS record not found.'}

    if (sms.status or '').upper() not in ['FAILED', 'failed']:
        return {'success': False, 'message': f'Cannot retry SMS with status {sms.status}. Only FAILED messages can be retried.'}

    max_retries = int(os.environ.get('SMS_MAX_RETRIES', '3'))
    if (sms.attempt_count or 0) >= max_retries:
        return {'success': False, 'message': f'Maximum retry limit ({max_retries} attempts) reached for this message.'}

    member = sms.member
    followup = sms.followup

    # Fresh eligibility check for retry
    is_eligible, err_reason = check_realtime_eligibility(
        recipient_phone=sms.recipient_phone,
        member=member,
        followup=followup,
        reminder_type=sms.template_type or 'general',
        is_retry=True
    )
    if not is_eligible:
        return {'success': False, 'message': f'Retry blocked: {err_reason}'}

    normalized_e164 = normalize_to_e164(sms.recipient_phone)
    provider = get_sms_provider()
    provider_name = get_current_provider_name()

    try:
        dispatch_res = provider.send_sms(to_phone=normalized_e164, message_body=sms.message_body)
    except Exception as e:
        dispatch_res = {
            'success': False,
            'status': 'FAILED',
            'provider': provider_name,
            'provider_message_id': None,
            'error': str(e)
        }

    status = dispatch_res.get('status', 'SENT')
    sms.status = status
    sms.provider = provider_name
    sms.provider_message_id = dispatch_res.get('provider_message_id')
    sms.failure_reason = dispatch_res.get('error')
    sms.attempt_count = (sms.attempt_count or 1) + 1
    sms.updated_at = datetime.utcnow()
    if status != 'FAILED':
        sms.sent_at = datetime.utcnow()

    if followup:
        followup.sms_status = status
        if status != 'FAILED':
            followup.last_reminder_at = datetime.utcnow()

    db.session.commit()

    # Log audit event
    try:
        log_audit_event(
            action='sms_retry',
            user_id=user_info.get('user_id') if user_info else None,
            username=user_info.get('username', 'asha_worker') if user_info else 'asha_worker',
            role=user_info.get('role', 'asha') if user_info else 'asha',
            record_id=sms.id,
            details={
                'recipient': mask_phone_number(sms.recipient_phone),
                'attempt_count': sms.attempt_count,
                'status': status,
                'error': sms.failure_reason
            }
        )
    except Exception:
        pass

    if status == 'FAILED':
        return {
            'success': False,
            'message': sms.failure_reason or 'Retry attempt failed. Please check phone number.',
            'sms': sms.to_dict(mask_phone=True)
        }

    return {
        'success': True,
        'message': f'SMS retry succeeded ({status.lower()}) to {mask_phone_number(sms.recipient_phone)}.',
        'sms': sms.to_dict(mask_phone=True)
    }

def cancel_pending_sms_for_followup(followup_id: int, reason: str = 'Follow-up completed') -> None:
    """
    Mandatory lifecycle rule: When a follow-up is completed,
    automatically halt and mark CANCELLED all pending or generated SMS reminders.
    """
    pending_messages = SMSMessage.query.filter(
        SMSMessage.followup_id == followup_id,
        SMSMessage.status.in_(['PENDING', 'GENERATED', 'pending', 'generated', 'none'])
    ).all()

    for msg in pending_messages:
        msg.status = 'CANCELLED'
        msg.failure_reason = reason
        msg.updated_at = datetime.utcnow()

    fu = FollowUp.query.get(followup_id)
    if fu:
        if (fu.sms_status or '').lower() in ['pending', 'generated', 'none']:
            fu.sms_status = 'CANCELLED'

    db.session.commit()

def cancel_pending_sms_for_member(member_id: int, template_type: Optional[str] = None, reason: str = 'Action completed') -> None:
    """
    Cancels pending reminders for a specific member when their clinical action is satisfied.
    """
    query = SMSMessage.query.filter(
        SMSMessage.member_id == member_id,
        SMSMessage.status.in_(['PENDING', 'GENERATED', 'pending', 'generated'])
    )
    if template_type:
        canonical_type = TYPE_ALIASES.get(template_type, template_type)
        query = query.filter(SMSMessage.template_type == canonical_type)
    for msg in query.all():
        msg.status = 'CANCELLED'
        msg.failure_reason = reason
        msg.updated_at = datetime.utcnow()
    db.session.commit()

def get_sms_statistics() -> Dict[str, Any]:
    """
    Returns live database statistics for SMS operations and provider mode.
    """
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    provider_name = get_current_provider_name()

    total_count = SMSMessage.query.count()
    pending_count = SMSMessage.query.filter(SMSMessage.status.in_(['PENDING', 'pending'])).count()
    generated_count = SMSMessage.query.filter(SMSMessage.status.in_(['GENERATED', 'generated'])).count()
    failed_count = SMSMessage.query.filter(SMSMessage.status.in_(['FAILED', 'failed'])).count()
    cancelled_count = SMSMessage.query.filter(SMSMessage.status.in_(['CANCELLED', 'cancelled'])).count()

    sent_today = SMSMessage.query.filter(
        SMSMessage.status.in_(['SENT', 'sent', 'simulated']),
        SMSMessage.created_at >= today_start
    ).count()

    delivered_today = SMSMessage.query.filter(
        SMSMessage.status.in_(['DELIVERED', 'delivered']),
        SMSMessage.created_at >= today_start
    ).count()

    sent_count = SMSMessage.query.filter(SMSMessage.status.in_(['SENT', 'sent', 'simulated', 'DELIVERED', 'delivered'])).count()
    delivered_count = SMSMessage.query.filter(SMSMessage.status.in_(['DELIVERED', 'delivered'])).count()

    provider_configured = True
    if provider_name == 'twilio':
        provider = get_sms_provider()
        provider_configured = getattr(provider, 'is_configured', lambda: False)()

    return {
        'provider_mode': provider_name,
        'provider_configured': provider_configured,
        'total': total_count,
        'sent': sent_count,
        'delivered': delivered_count,
        'pending': pending_count,
        'generated': generated_count,
        'sent_today': sent_today,
        'delivered_today': delivered_today,
        'failed': failed_count,
        'cancelled': cancelled_count,
        'notice': 'MOCK SMS — NOT ACTUALLY SENT' if provider_name == 'mock' else 'TWILIO PRODUCTION'
    }
