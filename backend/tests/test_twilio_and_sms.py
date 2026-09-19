import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

from app import create_app
from database import db
from models.household_member import (
    HouseholdMember, 
    validate_phone_number, 
    normalize_to_e164, 
    mask_phone_number
)
from models.followup import FollowUp
from models.sms_message import SMSMessage
from models.audit_log import AuditLog
from services.sms_providers.base_provider import BaseSMSProvider
from services.sms_providers.mock_provider import MockSMSProvider
from services.sms_providers.twilio_provider import TwilioSMSProvider
from services.sms_service import (
    get_sms_provider,
    render_template,
    check_realtime_eligibility,
    generate_sms_draft,
    send_or_simulate_sms,
    retry_failed_sms,
    cancel_pending_sms_for_followup,
    get_sms_statistics,
    SMS_TEMPLATES
)

from sqlalchemy.pool import StaticPool

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'poolclass': StaticPool,
        'connect_args': {'check_same_thread': False}
    }
    app.config['SMS_PROVIDER'] = 'mock'
    with app.app_context():
        db.create_all()
        from seed import seed_demo_database
        seed_demo_database()
        yield app.test_client()

# ============================================================
# 1. Phone Normalization, Validation, & Masking
# ============================================================

def test_phone_normalization_and_masking():
    # Indian 10 digits
    assert normalize_to_e164("9876543210") == "+919876543210"
    assert normalize_to_e164("+91 9876543210") == "+919876543210"
    assert normalize_to_e164("09876543210") == "+919876543210"
    assert normalize_to_e164("+919876543210") == "+919876543210"
    assert normalize_to_e164("7890123456") == "+917890123456"

    # Invalid phones
    assert normalize_to_e164("12345") is None
    assert normalize_to_e164("5123456789") is None
    assert normalize_to_e164(None) is None
    assert normalize_to_e164("") is None

    # Privacy masking
    assert mask_phone_number("9876543210") == "+91******3210"
    assert mask_phone_number("+919876543210") == "+91******3210"
    assert mask_phone_number(None) == ""

# ============================================================
# 2. SMS Provider Selection & Mock Provider
# ============================================================

def test_provider_factory():
    mock_p = get_sms_provider('mock')
    assert isinstance(mock_p, MockSMSProvider)
    assert mock_p.provider_name == 'mock'

    twilio_p = get_sms_provider('twilio')
    assert isinstance(twilio_p, TwilioSMSProvider)
    assert twilio_p.provider_name == 'twilio'

    # Fallback to mock on unknown
    unknown_p = get_sms_provider('unknown_provider')
    assert isinstance(unknown_p, MockSMSProvider)

def test_mock_provider_clean_dispatch():
    mock_p = MockSMSProvider()
    res = mock_p.send_sms(
        to_phone="+919876543210",
        message_body="Namaste Seetha, this is a health follow-up reminder.",
        template_key="FOLLOWUP_REMINDER"
    )
    assert res['success'] is True
    assert res['status'] == 'sent'
    assert res['provider'] == 'mock'
    assert res['is_simulated'] is True
    assert res['message_id'].startswith('MOCK-SM')
    # Critical rule: Body does NOT have prototype or mock prefixes
    assert "[Mock SMS" not in res['body']
    assert "[Prototype" not in res['body']

# ============================================================
# 3. Twilio SMS Provider Unit Test (Mocked SDK)
# ============================================================

def test_twilio_provider_missing_credentials():
    with patch.dict('os.environ', {}, clear=True):
        provider = TwilioSMSProvider(account_sid='', auth_token='', from_phone='')
        res = provider.send_sms(
            to_phone="+919876543210",
            message_body="Test Twilio Message"
        )
        assert res['success'] is False
        assert "not configured" in res['error'].lower() or "missing" in res['error'].lower()

@patch('services.sms_providers.twilio_provider.TwilioClient')
def test_twilio_provider_mocked_success(mock_twilio_client_class):
    mock_messages = MagicMock()
    mock_sent_msg = MagicMock()
    mock_sent_msg.sid = "SM_MOCK_TWILIO_SID_12345"
    mock_sent_msg.status = "queued"
    mock_sent_msg.error_code = None
    mock_sent_msg.error_message = None
    mock_messages.create.return_value = mock_sent_msg

    mock_client_instance = MagicMock()
    mock_client_instance.messages = mock_messages
    mock_twilio_client_class.return_value = mock_client_instance

    provider = TwilioSMSProvider(
        account_sid="ACmockaccountsid1234567890",
        auth_token="mock_auth_token_secret",
        from_phone="+15005550006",
        status_callback_url="http://localhost:5000/api/sms/twilio/status"
    )

    res = provider.send_sms(
        to_phone="+919876543210",
        message_body="Namaste Sunitha, your scheduled vaccination is due.",
        template_key="VACCINATION_REMINDER"
    )

    assert res['success'] is True
    assert res['status'] == 'sent'
    assert res['provider'] == 'twilio'
    assert res['message_id'] == "SM_MOCK_TWILIO_SID_12345"
    assert res['is_simulated'] is False

    mock_messages.create.assert_called_once_with(
        to="+919876543210",
        from_="+15005550006",
        body="Namaste Sunitha, your scheduled vaccination is due.",
        status_callback="http://localhost:5000/api/sms/twilio/status"
    )

# ============================================================
# 4. Multilingual Template Catalog
# ============================================================

def test_sms_templates_en_te_hi():
    context = {"name": "Laxmi", "due_date": "2026-09-25", "reason": "ANC Checkup"}

    for key in ['VACCINATION_REMINDER', 'IRON_COLLECTION_REMINDER', 'FOLLOWUP_REMINDER', 'GENERAL_SCHEDULED_FOLLOWUP']:
        for lang in ['en', 'te', 'hi']:
            body = render_template(key, lang, context)
            assert body is not None
            assert len(body) > 10
            # Clean body verification
            assert "[Mock" not in body
            assert "[Prototype" not in body
            assert "Laxmi" in body

# ============================================================
# 5. Real-Time Eligibility & Cooldown Engine
# ============================================================

def test_realtime_eligibility_checks(client):
    with client.application.app_context():
        member = HouseholdMember.query.filter_by(member_code="M1024-02").first()
        assert member is not None

        # Clean state
        SMSMessage.query.filter_by(member_id=member.id).delete()
        db.session.commit()

        # 1. Eligible
        check = check_realtime_eligibility(member=member, template_type='iron_tablets')
        assert check['eligible'] is True

        # 2. Opt-out check
        member.sms_enabled = False
        db.session.commit()
        check_optout = check_realtime_eligibility(member=member, template_type='iron_tablets')
        assert check_optout['eligible'] is False
        assert "opted out" in check_optout['reason'].lower()

        # Reset opt-in
        member.sms_enabled = True
        db.session.commit()

        # 3. Invalid phone check
        orig_phone = member.phone_number
        member.phone_number = "123"
        db.session.commit()
        check_phone = check_realtime_eligibility(member=member, template_type='iron_tablets')
        assert check_phone['eligible'] is False
        assert ("valid" in check_phone['reason'].lower()) and ("phone" in check_phone['reason'].lower())

        # Restore phone
        member.phone_number = orig_phone
        db.session.commit()

        # 4. Action already completed check (IFA collected)
        member.iron_tablets_collected = True
        db.session.commit()
        check_done = check_realtime_eligibility(member=member, template_type='iron_tablets')
        assert check_done['eligible'] is False
        assert "collected" in check_done['reason'].lower()

        # Reset IFA
        member.iron_tablets_collected = False
        db.session.commit()

        # 5. 24-hour Cooldown check
        draft = generate_sms_draft(
            member_id=member.id,
            template_key='IRON_COLLECTION_REMINDER',
            language='en'
        )
        assert draft['success'] is True
        sms_id = draft['sms_id']

        # Dispatch
        send_res = send_or_simulate_sms(sms_id=sms_id)
        assert send_res['success'] is True

        # Second attempt should be blocked by cooldown
        check_cooldown = check_realtime_eligibility(member=member, template_type='iron_tablets')
        assert check_cooldown['eligible'] is False
        assert "cooldown" in check_cooldown['reason'].lower() or "recent" in check_cooldown['reason'].lower()

# ============================================================
# 6. Lifecycle Cancellation: Completion Cancels Pending SMS
# ============================================================

def test_followup_completion_cancels_pending_sms(client):
    with client.application.app_context():
        fu = FollowUp.query.filter_by(status='pending').first()
        assert fu is not None
        fu_id = fu.id

        # Clear existing SMS for this member so cooldown doesn't block draft generation
        SMSMessage.query.filter_by(member_id=fu.member_id).delete()
        db.session.commit()

        # Generate SMS draft
        draft_res = generate_sms_draft(followup_id=fu_id, language='te')
        assert draft_res['success'] is True
        sms_id = draft_res['sms_id']

        sms_msg = SMSMessage.query.get(sms_id)
        assert sms_msg.status.lower() in ['pending', 'generated']

        # Complete follow-up via API
        patch_res = client.patch(f'/api/followups/{fu_id}', json={"status": "completed"})
        assert patch_res.status_code == 200

        # Verify SMS message is cancelled
        db.session.refresh(sms_msg)
        assert sms_msg.status.lower() == 'cancelled'

        # Attempting to send cancelled SMS must fail
        send_res = client.post(f'/api/sms/{sms_id}/send', json={})
        assert send_res.status_code in [400, 422]

# ============================================================
# 7. SMS Retry Logic & Maximum Attempts
# ============================================================

def test_sms_retry_mechanism(client):
    with client.application.app_context():
        member = HouseholdMember.query.first()
        assert member is not None

        # Create failed SMS record
        failed_sms = SMSMessage(
            member_id=member.id,
            household_id=member.household_id,
            recipient_name=member.full_name,
            recipient_phone=member.phone_number,
            message_body="Reminder test message",
            status='failed',
            attempt_count=1,
            failure_reason="Network error",
            provider='mock'
        )
        db.session.add(failed_sms)
        db.session.commit()
        sms_id = failed_sms.id

    # First retry via API
    res1 = client.post(f'/api/sms/{sms_id}/retry', json={})
    assert res1.status_code == 200
    data1 = res1.get_json()
    assert data1['sms']['attempt_count'] == 2

    # Second retry - simulate another failure
    with client.application.app_context():
        rec = SMSMessage.query.get(sms_id)
        rec.status = 'failed'
        db.session.commit()

    res2 = client.post(f'/api/sms/{sms_id}/retry', json={})
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2['sms']['attempt_count'] == 3

    # Third failure - reached max (3)
    with client.application.app_context():
        rec = SMSMessage.query.get(sms_id)
        rec.status = 'failed'
        db.session.commit()

    res3 = client.post(f'/api/sms/{sms_id}/retry', json={})
    assert res3.status_code == 400
    data3 = res3.get_json()
    assert "maximum" in data3['message'].lower() or "limit" in data3['message'].lower()

# ============================================================
# 8. Twilio Status Webhook Callback
# ============================================================

def test_twilio_webhook_delivery_callback(client):
    with client.application.app_context():
        sms = SMSMessage(
            recipient_name="Test User",
            recipient_phone="+919876543210",
            message_body="Test Webhook SMS",
            status='sent',
            provider='twilio',
            provider_message_id="SM_TEST_WEBHOOK_123"
        )
        db.session.add(sms)
        db.session.commit()
        sms_id = sms.id
        db.session.remove()

    # 1. Delivered callback
    res = client.post('/api/sms/twilio/status', data={
        'MessageSid': 'SM_TEST_WEBHOOK_123',
        'MessageStatus': 'delivered'
    })
    assert res.status_code == 200
    assert res.get_json()['success'] is True

    with client.application.app_context():
        db.session.remove()
        updated = SMSMessage.query.get(sms_id)
        assert updated.status == 'DELIVERED'
        assert updated.delivered_at is not None

    # 2. Failed callback
    res_fail = client.post('/api/sms/twilio/status', data={
        'MessageSid': 'SM_TEST_WEBHOOK_123',
        'MessageStatus': 'failed',
        'ErrorCode': '30008',
        'ErrorMessage': 'Unknown error'
    })
    assert res_fail.status_code == 200

    with client.application.app_context():
        db.session.remove()
        updated_fail = SMSMessage.query.get(sms_id)
        assert updated_fail.status == 'FAILED'
        assert "30008" in updated_fail.failure_reason

# ============================================================
# 9. SMS Statistics & Dashboard Integration
# ============================================================

def test_sms_statistics_and_dashboard(client):
    # Stats endpoint
    stats_res = client.get('/api/sms/stats')
    assert stats_res.status_code == 200
    stats = stats_res.get_json()
    assert 'total' in stats
    assert 'sent' in stats
    assert 'pending' in stats
    assert 'provider_mode' in stats

    # Dashboard overview
    dash_res = client.get('/api/dashboard/overview')
    assert dash_res.status_code == 200
    dash = dash_res.get_json()
    assert 'action_required' in dash
    assert 'sms_pending' in dash['action_required']
    assert 'sms_sent_today' in dash['action_required']
    assert 'sms_failed' in dash['action_required']
