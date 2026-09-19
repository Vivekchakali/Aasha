import pytest
from datetime import datetime, timedelta
from app import create_app
from database import db
from models.household_member import HouseholdMember, validate_phone_number, mask_phone_number
from models.followup import FollowUp
from models.sms_message import SMSMessage
from models.audit_log import AuditLog
from services.sms_service import render_template, can_send_sms, send_or_simulate_sms

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SMS_PROVIDER'] = 'mock'
    with app.app_context():
        db.create_all()
        from seed import seed_demo_database
        seed_demo_database()
        yield app.test_client()

def test_phone_validation_and_masking():
    assert validate_phone_number("9876543210") == "9876543210"
    assert validate_phone_number("+91 9876543210") == "9876543210"
    assert validate_phone_number("09876543210") == "9876543210"
    assert validate_phone_number("7890123456") == "7890123456"

    assert validate_phone_number("12345") is None
    assert validate_phone_number("5123456789") is None
    assert validate_phone_number("abc") is None
    assert validate_phone_number(None) is None

    assert mask_phone_number("9876543210") == "+91******3210"
    assert mask_phone_number(None) == ""

def test_multilingual_sms_templates():
    context = {"name": "Seetha", "due_date": "2026-09-20", "reason": "ANC Check"}
    
    en_body = render_template("vaccination", "en", context)
    assert "[Prototype" not in en_body
    assert "[Mock SMS" not in en_body
    assert "Seetha" in en_body
    assert "vaccination" in en_body

    te_body = render_template("iron_tablets", "te", context)
    assert "[Prototype" not in te_body
    assert "జ్ఞాపిక" in te_body or "ఐరన్" in te_body

    hi_body = render_template("medication", "hi", context)
    assert "[Prototype" not in hi_body
    assert "सूचना" in hi_body or "नमस्ते" in hi_body

def test_duplicate_prevention_and_cooldown(client):
    with client.application.app_context():
        member = HouseholdMember.query.filter_by(member_code="M1024-02").first()
        assert member is not None

        SMSMessage.query.filter_by(recipient_phone=member.phone_number).delete()
        db.session.commit()

        allowed, reason = can_send_sms(member.phone_number, member=member, template_type='iron_tablets')
        assert allowed is True

        res = send_or_simulate_sms(
            recipient_phone=member.phone_number,
            recipient_name=member.full_name,
            template_type='iron_tablets',
            language='te',
            context={'name': member.full_name, 'due_date': 'Today'},
            member_id=member.id
        )
        assert res['success'] is True

        allowed2, reason2 = can_send_sms(member.phone_number, member=member, template_type='iron_tablets')
        assert allowed2 is False
        assert "cooldown" in reason2.lower() or "duplicate" in reason2.lower()

def test_action_completion_cancels_and_blocks_sms(client):
    with client.application.app_context():
        fu = FollowUp.query.filter_by(status='pending').first()
        assert fu is not None
        fu_id = fu.id
    
    res = client.patch(f'/api/followups/{fu_id}', json={"status": "completed"})
    assert res.status_code == 200
    updated_fu = res.get_json()['followup']
    assert updated_fu['status'] == 'completed'
    assert updated_fu['completed_at'] is not None

    sms_res = client.post(f'/api/followups/{fu_id}/send-sms', json={})
    assert sms_res.status_code == 400
    assert "completed" in sms_res.get_json()['message'].lower()

def test_data_retrieval_categories(client):
    res = client.get('/api/retrieval?category=PEOPLE')
    assert res.status_code == 200
    data = res.get_json()
    assert data['total'] >= 10
    assert len(data['results']) > 0
    assert "counts" in data
    assert data['counts']['PEOPLE'] >= 10

    res_mat = client.get('/api/retrieval?category=MATERNAL')
    assert res_mat.status_code == 200
    data_mat = res_mat.get_json()
    assert all(r['is_pregnant'] is True for r in data_mat['results'])

    res_ch = client.get('/api/retrieval?category=CHILD')
    assert res_ch.status_code == 200
    data_ch = res_ch.get_json()
    assert all(r['age'] <= 5 for r in data_ch['results'])

    res_iron = client.get('/api/retrieval?category=IRON_TABLETS')
    assert res_iron.status_code == 200
    data_iron = res_iron.get_json()
    assert all(r['iron_tablets_required'] is True for r in data_iron['results'])

    res_fu = client.get('/api/retrieval?category=FOLLOW_UP')
    assert res_fu.status_code == 200
    data_fu = res_fu.get_json()
    assert len(data_fu['results']) > 0

    res_sms = client.get('/api/retrieval?category=SMS')
    assert res_sms.status_code == 200
    data_sms = res_sms.get_json()
    assert len(data_sms['results']) >= 2

def test_safe_natural_language_search(client):
    res = client.get('/api/retrieval?q=pregnant')
    assert res.status_code == 200
    data = res.get_json()
    assert data['category'] == 'MATERNAL'

    res_iron = client.get('/api/retrieval?q=iron%20tablets')
    assert res_iron.status_code == 200
    data_iron = res_iron.get_json()
    assert data_iron['category'] == 'IRON_TABLETS'

    res_name = client.get('/api/retrieval?category=PEOPLE&q=Seetha')
    assert res_name.status_code == 200
    data_name = res_name.get_json()
    assert len(data_name['results']) >= 1
    assert any("Seetha" in r['full_name'] for r in data_name['results'])

def test_csv_export_and_audit_logging(client):
    res = client.get('/api/retrieval?category=PEOPLE&format=csv')
    assert res.status_code == 200
    assert "text/csv" in res.content_type
    csv_text = res.get_data(as_text=True)
    assert "member_code" in csv_text or "full_name" in csv_text
    assert "******" in csv_text or "XXXX" in csv_text

    with client.application.app_context():
        audit = AuditLog.query.filter_by(action="retrieval_exported").first()
        assert audit is not None
        assert "PEOPLE" in str(audit.details)

def test_bulk_sms_generation(client):
    res = client.post('/api/sms/bulk-generate', json={
        "items": [
            {
                "phone_number": "9876543219",
                "recipient_name": "Test Beneficiary 1",
                "template_type": "medication",
                "language": "en",
                "due_date": "2026-09-22",
                "reason": "Blood pressure review"
            }
        ]
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['sent_count'] == 1
    assert data['total'] == 1

def test_end_to_end_flow_section_26(client):
    """
    Section 26 End-to-End Verification:
    Member A: Pregnant = YES, Preferred language = Telugu, Pending follow-up, Synthetic phone
    Member B: Child under 2, Vaccination follow-up pending, Synthetic phone
    Member C: Iron tablets required = YES, Iron tablets collected = NO, Synthetic phone
    Verify:
      - Data Retrieval finds A, B, C in respective categories
      - Multilingual SMS generated with correct language/template
      - B vaccination = COMPLETED halts future reminders and updates DB/counts
      - C iron tablets = COLLECTED halts future reminders and updates DB/counts
      - SMS history remains preserved throughout
    """
    with client.application.app_context():
        # 1. Verify Members A, B, C setup
        member_a = HouseholdMember.query.filter_by(member_code="M1024-02").first()
        assert member_a is not None
        assert member_a.is_pregnant is True
        assert member_a.preferred_language == 'te'
        assert member_a.phone_number is not None

        member_b = HouseholdMember.query.filter_by(member_code="M1025-04").first()
        assert member_b is not None
        assert member_b.age < 2
        assert member_b.vaccination_status == 'Pending'
        assert member_b.preferred_language == 'hi'

        member_c = HouseholdMember.query.filter_by(member_code="M1026-02").first()
        assert member_c is not None
        assert member_c.iron_tablets_required is True
        assert member_c.iron_tablets_collected is False

        fu_b = FollowUp.query.filter_by(member_id=member_b.id, status='pending').first()
        assert fu_b is not None
        assert fu_b.followup_type == 'vaccination'
        fu_b_id = fu_b.id

        fu_c = FollowUp.query.filter_by(member_id=member_c.id, status='pending').first()
        assert fu_c is not None
        assert fu_c.followup_type == 'iron_tablets'
        fu_c_id = fu_c.id

    # 2. Verify Data Retrieval
    # Pregnant Women -> Member A
    res_mat = client.get('/api/retrieval?category=MATERNAL')
    assert res_mat.status_code == 200
    mat_data = res_mat.get_json()
    assert any(r['full_name'] == member_a.full_name for r in mat_data['results'])

    # Children Under 2 -> Member B
    res_child = client.get('/api/retrieval?category=CHILD')
    assert res_child.status_code == 200
    ch_data = res_child.get_json()
    assert any(r['full_name'] == member_b.full_name for r in ch_data['results'])

    # Pending Vaccinations -> Member B
    res_vax = client.get('/api/retrieval?category=CHILD&vaccination_status=Pending')
    assert res_vax.status_code == 200
    vax_data = res_vax.get_json()
    assert any(r['full_name'] == member_b.full_name for r in vax_data['results'])

    # Pending Iron Collection -> Member C
    res_iron = client.get('/api/retrieval?category=IRON_TABLETS&collected=false')
    assert res_iron.status_code == 200
    iron_data = res_iron.get_json()
    assert any(r['full_name'] == member_c.full_name for r in iron_data['results'])

    # 3. Verify SMS Language & Templates
    # Send SMS to Member B (Hindi Vaccination)
    sms_b_res = client.post(f'/api/followups/{fu_b_id}/send-sms', json={
        "language": "hi",
        "template_type": "vaccination"
    })
    assert sms_b_res.status_code == 200
    b_json = sms_b_res.get_json()
    assert b_json['success'] is True
    assert b_json['sms']['provider'] == 'mock'
    assert b_json['sms']['simulated_flag'] is True
    assert "[Prototype" not in b_json['sms']['message_body']

    # Send SMS to Member C (Telugu Iron Tablets)
    sms_c_res = client.post(f'/api/followups/{fu_c_id}/send-sms', json={
        "language": "te",
        "template_type": "iron_tablets"
    })
    assert sms_c_res.status_code == 200
    c_json = sms_c_res.get_json()
    assert c_json['success'] is True
    assert c_json['sms']['provider'] == 'mock'
    assert c_json['sms']['simulated_flag'] is True
    assert "[Prototype" not in c_json['sms']['message_body']

    # 4. Action Completion: Member B vaccination = COMPLETED
    res_comp_b = client.patch(f'/api/followups/{fu_b_id}', json={"status": "completed"})
    assert res_comp_b.status_code == 200
    
    with client.application.app_context():
        # Follow-up status is completed
        fu_b_refreshed = FollowUp.query.get(fu_b_id)
        assert fu_b_refreshed.status == 'completed'
        assert fu_b_refreshed.completed_at is not None
        # Member vaccination status is now Complete
        m_b_refreshed = HouseholdMember.query.get(member_b.id)
        assert m_b_refreshed.vaccination_status == 'Complete'

    # Future reminders stop (returns 400)
    sms_retry_b = client.post(f'/api/followups/{fu_b_id}/send-sms', json={})
    assert sms_retry_b.status_code == 400
    assert "completed" in sms_retry_b.get_json()['message'].lower()

    # Retrieval results update: Member B is no longer in pending vaccination
    res_vax_after = client.get('/api/retrieval?category=CHILD&vaccination_status=Pending')
    assert not any(r['full_name'] == member_b.full_name for r in res_vax_after.get_json()['results'])

    # 5. Action Completion: Member C iron tablets = COLLECTED
    res_comp_c = client.patch(f'/api/followups/{fu_c_id}', json={"status": "completed"})
    assert res_comp_c.status_code == 200

    with client.application.app_context():
        fu_c_refreshed = FollowUp.query.get(fu_c_id)
        assert fu_c_refreshed.status == 'completed'
        m_c_refreshed = HouseholdMember.query.get(member_c.id)
        assert m_c_refreshed.iron_tablets_collected is True

    # Future reminders stop for Member C
    sms_retry_c = client.post(f'/api/followups/{fu_c_id}/send-sms', json={})
    assert sms_retry_c.status_code == 400

    # Retrieval results update: Member C is no longer in pending iron collection
    res_iron_after = client.get('/api/retrieval?category=IRON_TABLETS&collected=false')
    assert not any(r['full_name'] == member_c.full_name for r in res_iron_after.get_json()['results'])

    # 6. Verify SMS history remains preserved
    sms_hist_res = client.get('/api/sms/history')
    assert sms_hist_res.status_code == 200
    messages = sms_hist_res.get_json()['messages']
    assert len(messages) >= 2
    # Verify phone numbers are masked in history
    for m in messages:
        assert "******" in m['recipient_phone'] or "XXXX" in m['recipient_phone']

