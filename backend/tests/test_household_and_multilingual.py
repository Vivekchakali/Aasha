import pytest
from app import create_app
from database import db
from models.household import Household
from models.household_member import HouseholdMember
from services.voice_parser import parse_voice_transcript
from services.normalization import normalize_encounter
from services.mapping_engine import run_mapping_engine

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.app_context():
        db.create_all()
        from seed import seed_demo_database
        seed_demo_database()
        yield app.test_client()

def test_household_and_member_crud(client):
    # 1. List households
    res = client.get('/api/households')
    assert res.status_code == 200
    data = res.get_json()
    assert len(data['households']) >= 5

    # 2. Get members of H1024
    res_m = client.get('/api/households/H1024/members')
    assert res_m.status_code == 200
    m_data = res_m.get_json()
    assert m_data['count'] == 4
    names = [m['full_name'] for m in m_data['members']]
    assert ('Seetha Kumar' in names) or ('Sita Kumar' in names)
    assert ('Ravi Kumar' in names) or ('Rajesh Kumar' in names)

    # 3. Add a new member to H1024
    new_member_payload = {
        "full_name": "Rohan Kumar",
        "age": 2,
        "gender": "Male",
        "relationship_to_head": "Son",
        "is_child": True,
        "vaccination_status": "Complete",
        "notes": "Toddler"
    }
    res_add = client.post('/api/households/H1024/members', json=new_member_payload)
    assert res_add.status_code == 201
    created_member = res_add.get_json()['member']
    member_id = created_member['id']
    assert created_member['full_name'] == "Rohan Kumar"

    # 4. Update member
    res_upd = client.put(f'/api/households/members/{member_id}', json={"notes": "Updated toddler notes"})
    assert res_upd.status_code == 200
    assert res_upd.get_json()['member']['notes'] == "Updated toddler notes"

    # 5. Delete member
    res_del = client.delete(f'/api/households/members/{member_id}')
    assert res_del.status_code == 200

def test_pregnancy_validation_rules(client):
    # Male cannot be pregnant
    invalid_male = {
        "full_name": "Kiran Kumar",
        "age": 28,
        "gender": "Male",
        "relationship_to_head": "Brother",
        "is_pregnant": True
    }
    res = client.post('/api/households/H1024/members', json=invalid_male)
    assert res.status_code == 400
    assert "cannot be assigned to male members" in res.get_json()['error']

    # Implausible age
    invalid_age = {
        "full_name": "Old Woman",
        "age": 75,
        "gender": "Female",
        "is_pregnant": True
    }
    res = client.post('/api/households/H1024/members', json=invalid_age)
    assert res.status_code == 400
    assert "Plausible maternal age" in res.get_json()['error']

    # Invalid pregnancy month
    invalid_month = {
        "full_name": "Young Woman",
        "age": 24,
        "gender": "Female",
        "is_pregnant": True,
        "pregnancy_month": 12
    }
    res = client.post('/api/households/H1024/members', json=invalid_month)
    assert res.status_code == 400
    assert "between 1 and 9" in res.get_json()['error']

def test_multilingual_speech_parsing():
    # Telugu
    te_res = parse_voice_transcript("సీత కుమార్ ఐదు నెలల గర్భిణి")
    assert te_res['language'] == 'te'
    assert te_res['extracted_fields']['member_name'] in ['Sita Kumar', 'Seetha Kumar']
    assert te_res['extracted_fields']['pregnant'] is True
    assert te_res['extracted_fields']['pregnancy_month'] == 5

    # Hindi
    hi_res = parse_voice_transcript("सीता कुमार पाँच महीने की गर्भवती हैं")
    assert hi_res['language'] == 'hi'
    assert hi_res['extracted_fields']['member_name'] in ['Sita Kumar', 'Seetha Kumar']
    assert hi_res['extracted_fields']['pregnant'] is True
    assert hi_res['extracted_fields']['pregnancy_month'] == 5

    # English
    en_res = parse_voice_transcript("Sita Kumar 5 months pregnant")
    assert en_res['language'] == 'en'
    assert en_res['extracted_fields']['member_name'] == 'Sita Kumar'
    assert en_res['extracted_fields']['pregnant'] is True
    assert en_res['extracted_fields']['pregnancy_month'] == 5

def test_mapping_engine_with_member_tracing():
    encounter_input = {
        "household_id": "H1024",
        "village_area": "Shanti Nagar",
        "visit_date": "2026-09-18",
        "member_id": "M1024-02",
        "member_name": "Sita Kumar",
        "age": 27,
        "gender": "Female",
        "relationship_to_head": "Spouse",
        "pregnant": True,
        "pregnancy_month": 5,
        "blood_pressure": "120/80 mmHg",
        "weight": "56 kg",
        "hemoglobin": "11.8 g/dL",
        "follow_up_required": True,
        "follow_up_days": 14
    }

    normalized, errors = normalize_encounter(encounter_input)
    assert not errors
    assert normalized['member_name'] == "Sita Kumar"
    assert normalized['member_id'] == "M1024-02"

    result = run_mapping_engine(normalized)
    progs = {p['code']: p['payload'] for p in result['generated_programmes']}

    assert "MATERNAL_HEALTH" in progs
    assert progs["MATERNAL_HEALTH"]["beneficiary_name"] == "Sita Kumar"
    assert progs["MATERNAL_HEALTH"]["member_id"] == "M1024-02"
    assert progs["MATERNAL_HEALTH"]["pregnancy_month"] == 5
    assert progs["MATERNAL_HEALTH"]["blood_pressure"] == "120/80 mmHg"

    assert "HOUSEHOLD_REGISTER" in progs
    assert progs["HOUSEHOLD_REGISTER"]["active_member_name"] == "Sita Kumar"
    assert progs["HOUSEHOLD_REGISTER"]["active_member_id"] == "M1024-02"

    assert "FOLLOW_UP" in progs
    assert progs["FOLLOW_UP"]["member_name"] == "Sita Kumar"
