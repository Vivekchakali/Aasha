from datetime import datetime, date
from flask import Blueprint, request, jsonify, g
from database import db
from models.followup import FollowUp
from models.household_member import HouseholdMember
from models.sms_message import SMSMessage
from models.notification import Notification
from services.audit_service import log_audit_event
from services.sms_service import (
    send_or_simulate_sms, 
    cancel_pending_sms_for_followup,
    generate_sms_draft,
    retry_failed_sms,
    get_sms_statistics,
    get_current_provider_name
)
from auth_middleware import require_auth

followup_bp = Blueprint('followups', __name__, url_prefix='/api')

def get_followup_urgency(due_date_str, status):
    if status == 'completed':
        return 'completed'
    try:
        due_d = datetime.strptime(str(due_date_str)[:10], '%Y-%m-%d').date()
        today = date.today()
        if due_d < today:
            return 'overdue'
        elif due_d == today:
            return 'due_today'
        else:
            return 'upcoming'
    except Exception:
        return 'upcoming'

@followup_bp.route('/followups', methods=['GET'])
def list_followups():
    status = request.args.get('status')
    category = request.args.get('category')
    fu_type = request.args.get('type')
    household_id = request.args.get('household_id')
    
    query = FollowUp.query
    if status:
        query = query.filter_by(status=status)
    if fu_type:
        query = query.filter_by(followup_type=fu_type)
    if household_id:
        query = query.filter_by(household_id=household_id)
    
    followups = query.order_by(FollowUp.due_date.asc()).all()
    results = []
    
    for f in followups:
        f_dict = f.to_dict()
        urgency = get_followup_urgency(f.due_date, f.status)
        f_dict['urgency'] = urgency
        if category and urgency != category:
            continue
        results.append(f_dict)

    return jsonify({
        "total": len(results),
        "followups": results
    }), 200

@followup_bp.route('/followups/notifications', methods=['GET'])
def get_followup_notifications():
    today = date.today()
    all_followups = FollowUp.query.order_by(FollowUp.due_date.asc()).all()
    
    categorized = {
        'overdue': [],
        'due_today': [],
        'upcoming': [],
        'completed': []
    }
    
    for f in all_followups:
        urgency = get_followup_urgency(f.due_date, f.status)
        item = f.to_dict()
        item['urgency'] = urgency
        if urgency in categorized:
            categorized[urgency].append(item)
            
    urgent_count = len(categorized['overdue']) + len(categorized['due_today'])
    total_pending = len(categorized['overdue']) + len(categorized['due_today']) + len(categorized['upcoming'])

    notifications = []
    for f in categorized['overdue']:
        notifications.append({
            'id': f'fu-overdue-{f["id"]}',
            'type': 'warning',
            'title': f'OVERDUE: {f["beneficiary_name"] or f["household_id"]}',
            'message': f'{f["reason"]} was due on {f["due_date"]}',
            'timestamp': f['created_at'],
            'followup_id': f['id'],
            'household_id': f['household_id'],
            'urgency': 'overdue',
            'read': False
        })
        
    for f in categorized['due_today']:
        notifications.append({
            'id': f'fu-today-{f["id"]}',
            'type': 'info',
            'title': f'DUE TODAY: {f["beneficiary_name"] or f["household_id"]}',
            'message': f'{f["reason"]} is scheduled for today ({f["due_date"]})',
            'timestamp': f['created_at'],
            'followup_id': f['id'],
            'household_id': f['household_id'],
            'urgency': 'due_today',
            'read': False
        })

    return jsonify({
        "unread_count": urgent_count,
        "total_pending": total_pending,
        "overdue_count": len(categorized['overdue']),
        "due_today_count": len(categorized['due_today']),
        "upcoming_count": len(categorized['upcoming']),
        "completed_count": len(categorized['completed']),
        "categories": categorized,
        "notifications": notifications
    }), 200

@followup_bp.route('/followups/<int:id>', methods=['PATCH'])
def update_followup(id):
    fu = FollowUp.query.get_or_404(id)
    data = request.get_json() or {}

    old_status = fu.status
    if 'status' in data:
        fu.status = data['status']  # 'pending', 'completed'
        if data['status'] == 'completed':
            if not fu.completed_at:
                fu.completed_at = datetime.utcnow()
            # 1. MANDATORY: Cancel pending/future SMS reminders
            cancel_pending_sms_for_followup(fu.id, reason="Follow-up marked completed")
            # 2. Update member vaccination or iron tablets status if linked
            if fu.member_id:
                member = HouseholdMember.query.get(fu.member_id)
                if member:
                    if fu.followup_type == 'vaccination':
                        member.vaccination_status = 'Complete'
                    elif fu.followup_type == 'iron_tablets':
                        member.iron_tablets_collected = True
                        member.iron_tablets_date = datetime.utcnow().strftime('%Y-%m-%d')
        elif data['status'] == 'pending':
            fu.completed_at = None

    if 'notes' in data:
        fu.notes = data['notes']
    if 'due_date' in data:
        fu.due_date = data['due_date']
    if 'beneficiary_name' in data:
        fu.beneficiary_name = data['beneficiary_name']
    if 'followup_type' in data:
        fu.followup_type = data['followup_type']
    if 'member_id' in data:
        fu.member_id = data['member_id']

    db.session.commit()

    # Log audit event
    try:
        user_id = getattr(g, 'user_id', None)
        username = getattr(g, 'username', 'asha_worker')
        role = getattr(g, 'user_role', 'asha')
        log_audit_event(
            action="followup_updated",
            user_id=user_id,
            username=username,
            role=role,
            record_id=fu.id,
            details={
                "household_id": fu.household_id,
                "old_status": old_status,
                "new_status": fu.status,
                "notes": fu.notes,
                "due_date": fu.due_date
            }
        )
    except Exception:
        pass

    return jsonify({
        "message": "Follow-up record updated successfully",
        "followup": fu.to_dict()
    }), 200

# -------------------------------------------------------------
# SMS Architecture Endpoints
# -------------------------------------------------------------

@followup_bp.route('/sms', methods=['GET'])
@require_auth(allowed_roles=['asha', 'admin'])
def list_sms():
    household_id = request.args.get('household_id')
    member_id = request.args.get('member_id', type=int)
    status = request.args.get('status')
    reminder_type = request.args.get('reminder_type') or request.args.get('type')
    language = request.args.get('language')
    provider = request.args.get('provider')
    page = max(1, request.args.get('page', 1, type=int))
    limit = min(max(1, request.args.get('limit', 20, type=int)), 100)

    query = SMSMessage.query
    if household_id:
        query = query.filter_by(household_id=household_id)
    if member_id:
        query = query.filter_by(member_id=member_id)
    if status:
        if status.lower() == 'sent':
            query = query.filter(SMSMessage.status.in_(['SENT', 'sent', 'simulated']))
        else:
            query = query.filter(SMSMessage.status.ilike(status))
    if reminder_type:
        query = query.filter(db.or_(
            SMSMessage.reminder_type == reminder_type,
            SMSMessage.template_type == reminder_type
        ))
    if language:
        query = query.filter_by(language=language)
    if provider:
        query = query.filter_by(provider=provider)

    total = query.count()
    items = query.order_by(SMSMessage.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'total': total,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit if limit else 1,
        'provider_mode': get_current_provider_name(),
        'messages': [item.to_dict(mask_phone=True) for item in items]
    }), 200

@followup_bp.route('/sms/<int:id>', methods=['GET'])
@require_auth(allowed_roles=['asha', 'admin'])
def get_sms_detail(id):
    sms = SMSMessage.query.get_or_404(id)
    return jsonify({
        'success': True,
        'sms': sms.to_dict(mask_phone=True)
    }), 200

@followup_bp.route('/sms/generate', methods=['POST'])
@require_auth(allowed_roles=['asha', 'admin'])
def generate_sms():
    data = request.get_json() or {}
    followup_id = data.get('followup_id')
    if not followup_id:
        return jsonify({'success': False, 'message': 'followup_id is required.'}), 400

    user_info = {
        'user_id': getattr(g, 'user_id', None),
        'username': getattr(g, 'username', 'asha_worker'),
        'role': getattr(g, 'user_role', 'asha')
    }

    res = generate_sms_draft(
        followup_id=followup_id,
        language=data.get('language'),
        user_info=user_info
    )

    if not res['success']:
        return jsonify(res), 400

    return jsonify(res), 200

@followup_bp.route('/sms/<int:id>/send', methods=['POST'])
@require_auth(allowed_roles=['asha', 'admin'])
def send_sms_by_id(id):
    sms = SMSMessage.query.get_or_404(id)
    data = request.get_json() or {}
    custom_body = data.get('message_body') or data.get('custom_message_body')

    user_info = {
        'user_id': getattr(g, 'user_id', None),
        'username': getattr(g, 'username', 'asha_worker'),
        'role': getattr(g, 'user_role', 'asha')
    }

    res = send_or_simulate_sms(
        recipient_phone=sms.recipient_phone,
        recipient_name=sms.recipient_name,
        template_type=sms.template_type or sms.reminder_type or 'general',
        language=sms.language or 'en',
        member_id=sms.member_id,
        followup_id=sms.followup_id,
        household_id=sms.household_id,
        custom_message_body=custom_body or sms.message_body,
        user_info=user_info,
        sms_id=sms.id
    )

    if not res['success']:
        return jsonify(res), 400

    return jsonify(res), 200

@followup_bp.route('/sms/<int:id>/cancel', methods=['POST'])
@require_auth(allowed_roles=['asha', 'admin'])
def cancel_sms_by_id(id):
    sms = SMSMessage.query.get_or_404(id)
    data = request.get_json() or {}
    reason = data.get('reason', 'Cancelled by user')

    sms.status = 'CANCELLED'
    sms.failure_reason = reason
    sms.updated_at = datetime.utcnow()
    db.session.commit()

    try:
        log_audit_event(
            action='sms_cancelled',
            user_id=getattr(g, 'user_id', None),
            username=getattr(g, 'username', 'asha_worker'),
            role=getattr(g, 'user_role', 'asha'),
            record_id=sms.id,
            details={'reason': reason, 'household_id': sms.household_id}
        )
    except Exception:
        pass

    return jsonify({
        'success': True,
        'message': 'SMS reminder cancelled.',
        'sms': sms.to_dict(mask_phone=True)
    }), 200

@followup_bp.route('/sms/<int:id>/retry', methods=['POST'])
@require_auth(allowed_roles=['asha', 'admin'])
def retry_sms_by_id(id):
    user_info = {
        'user_id': getattr(g, 'user_id', None),
        'username': getattr(g, 'username', 'asha_worker'),
        'role': getattr(g, 'user_role', 'asha')
    }
    res = retry_failed_sms(id, user_info=user_info)
    if not res['success']:
        return jsonify(res), 400
    return jsonify(res), 200

@followup_bp.route('/sms/twilio/status', methods=['POST'])
def twilio_status_callback():
    data = request.form.to_dict() if request.form else (request.get_json() or {})
    message_sid = data.get('MessageSid') or data.get('SmsSid')
    twilio_status = (data.get('MessageStatus') or data.get('SmsStatus') or '').lower()
    error_code = data.get('ErrorCode')
    error_message = data.get('ErrorMessage')

    if not message_sid:
        return jsonify({'error': 'Missing MessageSid'}), 400

    sms = SMSMessage.query.filter_by(provider_message_id=message_sid).first()
    if not sms:
        return jsonify({'error': 'Message not found for provided SID'}), 404

    old_status = sms.status
    if twilio_status == 'delivered':
        sms.status = 'DELIVERED'
        sms.delivered_at = datetime.utcnow()
    elif twilio_status in ['failed', 'undelivered']:
        sms.status = 'FAILED'
        if error_code and error_message:
            sms.failure_reason = f'Twilio Error {error_code}: {error_message}'
        elif error_code:
            sms.failure_reason = f'Twilio Error Code: {error_code}'
        elif error_message:
            sms.failure_reason = error_message
        else:
            sms.failure_reason = 'SMS delivery failed at carrier.'
    elif twilio_status == 'sent':
        sms.status = 'SENT'
        if not sms.sent_at:
            sms.sent_at = datetime.utcnow()
    elif twilio_status in ['queued', 'sending']:
        sms.status = 'PENDING'

    sms.updated_at = datetime.utcnow()
    db.session.commit()

    try:
        log_audit_event(
            action='sms_delivery_status_changed',
            user_id=None,
            username='twilio_webhook',
            role='system',
            record_id=sms.id,
            details={
                'old_status': old_status,
                'new_status': sms.status,
                'provider_message_id': message_sid,
                'error_code': error_code
            }
        )
    except Exception:
        pass

    return jsonify({'success': True, 'status': 'acknowledged', 'sms_id': sms.id, 'status_updated_to': sms.status}), 200

@followup_bp.route('/sms/stats', methods=['GET'])
@require_auth(allowed_roles=['asha', 'admin'])
def get_sms_stats():
    stats = get_sms_statistics()
    return jsonify({
        'success': True,
        'stats': stats,
        **stats
    }), 200

@followup_bp.route('/sms/history', methods=['GET'])
@require_auth(allowed_roles=['asha', 'admin'])
def get_sms_history():
    household_id = request.args.get('household_id')
    member_id = request.args.get('member_id', type=int)
    page = request.args.get('page', 1, type=int)
    limit = min(request.args.get('limit', 20, type=int), 100)
    
    query = SMSMessage.query
    if household_id:
        query = query.filter_by(household_id=household_id)
    if member_id:
        query = query.filter_by(member_id=member_id)
        
    total = query.count()
    items = query.order_by(SMSMessage.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'total': total,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit if limit else 1,
        'messages': [item.to_dict(mask_phone=True) for item in items]
    }), 200

@followup_bp.route('/followups/<int:id>/send-sms', methods=['POST'])
@require_auth(allowed_roles=['asha', 'admin'])
def send_followup_sms(id):
    fu = FollowUp.query.get_or_404(id)
    payload = request.get_json() or {}
    
    if fu.status == 'completed':
        return jsonify({
            'success': False,
            'message': 'Cannot send SMS: Follow-up is already completed.'
        }), 400
        
    member = fu.member
    recipient_phone = payload.get('phone_number') or (member.phone_number if member else None)
    if not recipient_phone:
        return jsonify({
            'success': False,
            'message': 'No valid phone number associated with this recipient/follow-up.'
        }), 400
        
    recipient_name = payload.get('recipient_name') or fu.beneficiary_name or (member.full_name if member else 'Beneficiary')
    template_type = payload.get('template_type') or fu.followup_type or 'general'
    language = payload.get('language') or (member.preferred_language if member else 'en') or 'en'
    custom_body = payload.get('message_body') or payload.get('custom_message_body')
    
    context = {
        'name': recipient_name,
        'due_date': fu.due_date,
        'reason': fu.reason
    }
    
    user_info = {
        'user_id': getattr(g, 'user_id', None),
        'username': getattr(g, 'username', 'asha_worker'),
        'role': getattr(g, 'user_role', 'asha')
    }
    
    res = send_or_simulate_sms(
        recipient_phone=recipient_phone,
        recipient_name=recipient_name,
        template_type=template_type,
        language=language,
        context=context,
        member_id=fu.member_id,
        followup_id=fu.id,
        household_id=fu.household_id,
        custom_message_body=custom_body,
        user_info=user_info
    )
    
    if not res['success']:
        return jsonify(res), 400
        
    return jsonify({
        'success': True,
        'message': res['message'],
        'sms': res['sms'],
        'followup': fu.to_dict()
    }), 200

@followup_bp.route('/sms/bulk-generate', methods=['POST'])
@require_auth(allowed_roles=['asha', 'admin'])
def bulk_generate_sms():
    data = request.get_json() or {}
    items = data.get('items', [])
    
    user_info = {
        'user_id': getattr(g, 'user_id', None),
        'username': getattr(g, 'username', 'asha_worker'),
        'role': getattr(g, 'user_role', 'asha')
    }
    
    results = []
    sent_count = 0
    skipped_count = 0
    
    if 'followup_ids' in data and not items:
        for fid in data['followup_ids']:
            fu = FollowUp.query.get(fid)
            if not fu or fu.status == 'completed':
                skipped_count += 1
                results.append({'id': fid, 'status': 'skipped', 'reason': 'Follow-up not found or already completed'})
                continue
            m = fu.member
            phone = m.phone_number if m else None
            if not phone:
                skipped_count += 1
                results.append({'id': fid, 'status': 'skipped', 'reason': 'No phone number'})
                continue
            res = send_or_simulate_sms(
                recipient_phone=phone,
                recipient_name=fu.beneficiary_name or (m.full_name if m else 'Beneficiary'),
                template_type=fu.followup_type or 'general',
                language=m.preferred_language if m else 'en',
                context={'name': fu.beneficiary_name or (m.full_name if m else 'Beneficiary'), 'due_date': fu.due_date, 'reason': fu.reason},
                member_id=fu.member_id,
                followup_id=fu.id,
                household_id=fu.household_id,
                user_info=user_info
            )
            if res['success']:
                sent_count += 1
                results.append({'id': fid, 'status': 'sent', 'message': res['message']})
            else:
                skipped_count += 1
                results.append({'id': fid, 'status': 'skipped', 'reason': res['message']})
    elif 'member_ids' in data and not items:
        template_type = data.get('template_type', 'general')
        for mid in data['member_ids']:
            m = HouseholdMember.query.get(mid)
            if not m or not m.phone_number:
                skipped_count += 1
                results.append({'id': mid, 'status': 'skipped', 'reason': 'Member not found or no phone number'})
                continue
            res = send_or_simulate_sms(
                recipient_phone=m.phone_number,
                recipient_name=m.full_name,
                template_type=template_type,
                language=m.preferred_language or 'en',
                context={'name': m.full_name, 'due_date': data.get('due_date', 'scheduled date'), 'reason': data.get('reason', 'health check')},
                member_id=m.id,
                household_id=m.household.household_id if m.household else None,
                user_info=user_info
            )
            if res['success']:
                sent_count += 1
                results.append({'id': mid, 'status': 'sent', 'message': res['message']})
            else:
                skipped_count += 1
                results.append({'id': mid, 'status': 'skipped', 'reason': res['message']})
    else:
        for item in items:
            m_id = item.get('member_id')
            fu_id = item.get('followup_id')
            phone = item.get('phone_number')
            name = item.get('recipient_name', 'Beneficiary')
            t_type = item.get('template_type', 'general')
            lang = item.get('language', 'en')
            due_d = item.get('due_date', 'scheduled date')
            rsn = item.get('reason', 'health check')
            
            res = send_or_simulate_sms(
                recipient_phone=phone,
                recipient_name=name,
                template_type=t_type,
                language=lang,
                context={'name': name, 'due_date': due_d, 'reason': rsn},
                member_id=m_id,
                followup_id=fu_id,
                household_id=item.get('household_id'),
                user_info=user_info
            )
            if res['success']:
                sent_count += 1
                results.append({'id': fu_id or m_id, 'status': 'sent', 'message': res['message']})
            else:
                skipped_count += 1
                results.append({'id': fu_id or m_id, 'status': 'skipped', 'reason': res['message']})
                
    return jsonify({
        'sent_count': sent_count,
        'skipped_count': skipped_count,
        'total': sent_count + skipped_count,
        'results': results
    }), 200
