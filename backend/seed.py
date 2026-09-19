from datetime import datetime, timedelta
from database import db
from models.user import User
from models.household import Household
from models.household_member import HouseholdMember
from models.encounter import Encounter
from models.programme_output import ProgrammeOutput
from models.followup import FollowUp
from models.sms_message import SMSMessage
from models.mapping_log import MappingLog
from models.sync_record import SyncRecord
from services.normalization import normalize_encounter
from services.mapping_engine import run_mapping_engine
from services.sms_service import render_template

def seed_demo_database():
    db.drop_all()
    db.create_all()

    # 1. Users
    asha_user = User(
        username="asha",
        role="asha",
        full_name="Sunita Devi (ASHA)",
        area="Ward 4 & 5, Shanti Nagar"
    )
    asha_user.set_password("asha123")

    admin_user = User(
        username="admin",
        role="admin",
        full_name="Dr. Rajesh Sharma (Nodal Officer)",
        area="District Healthcare Administrative Division"
    )
    admin_user.set_password("admin123")

    db.session.add(asha_user)
    db.session.add(admin_user)
    db.session.commit()

    # 2. Synthetic Households and Detailed Members
    households_data = [
        {"household_id": "H1024", "village_area": "Shanti Nagar, Ward 4", "head_of_family": "Ravi Kumar", "total_members": 4, "notes": "Synthetic household — Multi-generational family"},
        {"household_id": "H1025", "village_area": "Kalyan Basti, Sector 2", "head_of_family": "Ramesh Verma", "total_members": 4, "notes": "Synthetic household — Two toddlers"},
        {"household_id": "H1026", "village_area": "Adarsh Gram, Zone 1", "head_of_family": "Amit Patel", "total_members": 3, "notes": "Synthetic household — Primigravida maternal patient"},
        {"household_id": "H1027", "village_area": "Shanti Nagar, Ward 5", "head_of_family": "Suman Devi", "total_members": 5, "notes": "Synthetic household — Joint family"},
        {"household_id": "H1028", "village_area": "Kalyan Basti, Sector 1", "head_of_family": "Manoj Singh", "total_members": 4, "notes": "Synthetic household — School-age children"},
    ]
    hh_map = {}
    for hd in households_data:
        h = Household(**hd)
        db.session.add(h)
        db.session.flush()
        hh_map[h.household_id] = h

    # Seed Structured Household Members
    # Member A: Seetha Kumar (Pregnant beneficiary, Telugu preferred, IFA required)
    # Member B: Priya Verma (Child < 2, pending vaccination, Hindi preferred)
    # Member C: Pooja Patel (Pregnant, IFA required = True, collected = False)
    members_data = [
        # H1024 Members (Ravi Kumar Family)
        {
            "household_id": hh_map["H1024"].id, "member_code": "M1024-01", "full_name": "Ravi Kumar",
            "age": 32, "gender": "Male", "relationship_to_head": "Head", "phone_number": "9876543210",
            "preferred_language": "te", "sms_opt_in": True, "notes": "Head of family, daily wage earner"
        },
        {
            "household_id": hh_map["H1024"].id, "member_code": "M1024-02", "full_name": "Seetha Kumar",
            "age": 27, "gender": "Female", "relationship_to_head": "Spouse", "phone_number": "9876543211",
            "preferred_language": "te", "sms_opt_in": True, "is_pregnant": True, "pregnancy_month": 5,
            "iron_tablets_required": True, "iron_tablets_collected": False,
            "notes": "Member A: Second pregnancy, registered for ANC, IFA tablet collection due"
        },
        {
            "household_id": hh_map["H1024"].id, "member_code": "M1024-03", "full_name": "Anjali Kumar",
            "age": 4, "gender": "Female", "relationship_to_head": "Daughter", "is_child": True,
            "vaccination_status": "Complete", "notes": "Immunization fully on schedule, normal growth milestones"
        },
        {
            "household_id": hh_map["H1024"].id, "member_code": "M1024-04", "full_name": "Arjun Kumar",
            "age": 1, "gender": "Male", "relationship_to_head": "Son", "is_child": True,
            "vaccination_status": "Complete", "notes": "Infant toddler, thriving growth trajectory"
        },

        # H1025 Members
        {
            "household_id": hh_map["H1025"].id, "member_code": "M1025-01", "full_name": "Ramesh Verma",
            "age": 35, "gender": "Male", "relationship_to_head": "Head", "phone_number": "9811223344",
            "preferred_language": "hi", "sms_opt_in": True, "notes": "Head of family"
        },
        {
            "household_id": hh_map["H1025"].id, "member_code": "M1025-02", "full_name": "Sunita Verma",
            "age": 30, "gender": "Female", "relationship_to_head": "Spouse", "phone_number": "9811223345",
            "preferred_language": "hi", "sms_opt_in": True, "notes": "Primary caregiver"
        },
        {
            "household_id": hh_map["H1025"].id, "member_code": "M1025-03", "full_name": "Rahul Verma",
            "age": 4, "gender": "Male", "relationship_to_head": "Son", "is_child": True,
            "vaccination_status": "Complete", "notes": "All primary vaccinations up to date"
        },
        {
            "household_id": hh_map["H1025"].id, "member_code": "M1025-04", "full_name": "Priya Verma",
            "age": 1, "gender": "Female", "relationship_to_head": "Daughter", "is_child": True,
            "phone_number": "9811223344", "preferred_language": "hi", "sms_opt_in": True,
            "vaccination_status": "Pending", "notes": "Member B: Measles-Rubella MR-1 dose overdue, booster required"
        },

        # H1026 Members
        {
            "household_id": hh_map["H1026"].id, "member_code": "M1026-01", "full_name": "Amit Patel",
            "age": 26, "gender": "Male", "relationship_to_head": "Head", "phone_number": "9844556677",
            "preferred_language": "te", "sms_opt_in": True
        },
        {
            "household_id": hh_map["H1026"].id, "member_code": "M1026-02", "full_name": "Pooja Patel",
            "age": 22, "gender": "Female", "relationship_to_head": "Spouse", "phone_number": "9844556678",
            "preferred_language": "te", "sms_opt_in": True, "is_pregnant": True, "pregnancy_month": 4,
            "iron_tablets_required": True, "iron_tablets_collected": False,
            "notes": "Member C: Primigravida, iron tablets prescribed but pending collection"
        },
        {
            "household_id": hh_map["H1026"].id, "member_code": "M1026-03", "full_name": "Deviben Patel",
            "age": 58, "gender": "Female", "relationship_to_head": "Mother", "phone_number": "9844556679",
            "preferred_language": "te", "sms_opt_in": True
        },

        # H1027 Members
        {
            "household_id": hh_map["H1027"].id, "member_code": "M1027-01", "full_name": "Suman Devi",
            "age": 48, "gender": "Female", "relationship_to_head": "Head", "phone_number": "9833445566",
            "preferred_language": "hi", "sms_opt_in": True
        },
        {
            "household_id": hh_map["H1027"].id, "member_code": "M1027-02", "full_name": "Vikram Singh",
            "age": 25, "gender": "Male", "relationship_to_head": "Son", "phone_number": "9833445567"
        },
        {
            "household_id": hh_map["H1027"].id, "member_code": "M1027-03", "full_name": "Kavita Singh",
            "age": 23, "gender": "Female", "relationship_to_head": "Daughter-in-law", "phone_number": "9833445568",
            "preferred_language": "hi", "sms_opt_in": True, "iron_tablets_required": True,
            "iron_tablets_collected": True, "iron_tablets_date": (datetime.utcnow() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "notes": "Completed IFA collection cycle"
        },
        {
            "household_id": hh_map["H1027"].id, "member_code": "M1027-04", "full_name": "Aarav Singh",
            "age": 3, "gender": "Male", "relationship_to_head": "Grandson", "is_child": True, "vaccination_status": "Complete"
        },
        {
            "household_id": hh_map["H1027"].id, "member_code": "M1027-05", "full_name": "Diya Singh",
            "age": 1, "gender": "Female", "relationship_to_head": "Granddaughter", "is_child": True, "vaccination_status": "Pending", "notes": "DPT booster pending"
        },

        # H1028 Members
        {
            "household_id": hh_map["H1028"].id, "member_code": "M1028-01", "full_name": "Manoj Singh",
            "age": 38, "gender": "Male", "relationship_to_head": "Head", "phone_number": "9822334455",
            "preferred_language": "en", "sms_opt_in": True
        },
        {
            "household_id": hh_map["H1028"].id, "member_code": "M1028-02", "full_name": "Geeta Singh",
            "age": 35, "gender": "Female", "relationship_to_head": "Spouse", "phone_number": "9822334456"
        },
        {
            "household_id": hh_map["H1028"].id, "member_code": "M1028-03", "full_name": "Neha Singh",
            "age": 8, "gender": "Female", "relationship_to_head": "Daughter"
        },
        {
            "household_id": hh_map["H1028"].id, "member_code": "M1028-04", "full_name": "Rohan Singh",
            "age": 5, "gender": "Male", "relationship_to_head": "Son", "is_child": True, "vaccination_status": "Complete"
        },
    ]

    saved_members = {}
    for md in members_data:
        m = HouseholdMember(**md)
        db.session.add(m)
        db.session.flush()
        saved_members[m.member_code] = m

    db.session.commit()

    # 3. Seed historical synthetic encounters for rich dashboard metrics
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday_str = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    two_days_ago = (datetime.utcnow() - timedelta(days=2)).strftime("%Y-%m-%d")

    historical_samples = [
        {
            "household_id": "H1024",
            "member_id": saved_members["M1024-02"].id,
            "member_name": "Seetha Kumar",
            "village_area": "Shanti Nagar, Ward 4",
            "visit_date": yesterday_str,
            "household_members": 4,
            "pregnant": True,
            "maternal_age": 27,
            "gestational_age": 20,
            "pregnancy_month": 5,
            "iron_tablets_required": True,
            "iron_tablets_collected": False,
            "preferred_language": "te",
            "children": [],
            "children_count": 0,
            "symptoms": "None",
            "temperature": "98.4 F",
            "blood_pressure": "116/74 mmHg",
            "general_observations": "Maternal vitals stable. Counseled on nutrition and iron tablets.",
            "follow_up_required": True,
            "follow_up_days": 1,
            "follow_up_date": today_str,
            "follow_up_notes": "Monthly IFA tablets collection due",
            "duration_seconds": 45.0,
            "sync_status": "synced"
        },
        {
            "household_id": "H1025",
            "member_id": saved_members["M1025-04"].id,
            "member_name": "Priya Verma",
            "village_area": "Kalyan Basti, Sector 2",
            "visit_date": two_days_ago,
            "household_members": 4,
            "pregnant": False,
            "children": [{"child_index": 1, "age": 1, "vaccination_status": "Pending", "observations": "MR-1 dose due"}],
            "children_count": 1,
            "symptoms": "None",
            "temperature": "98.6 F",
            "blood_pressure": "120/80 mmHg",
            "general_observations": "Infant active. MR-1 vaccine overdue.",
            "follow_up_required": True,
            "follow_up_days": 0,
            "follow_up_date": (datetime.utcnow() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "follow_up_notes": "Vaccination overdue reminder for MR-1 booster",
            "duration_seconds": 38.5,
            "sync_status": "synced"
        },
        {
            "household_id": "H1026",
            "member_id": saved_members["M1026-02"].id,
            "member_name": "Pooja Patel",
            "village_area": "Adarsh Gram, Zone 1",
            "visit_date": yesterday_str,
            "household_members": 3,
            "pregnant": True,
            "maternal_age": 22,
            "gestational_age": 16,
            "expected_delivery_date": "2027-03-05",
            "iron_tablets_required": True,
            "iron_tablets_collected": False,
            "preferred_language": "te",
            "children": [],
            "children_count": 0,
            "symptoms": "Mild morning nausea",
            "temperature": "98.2 F",
            "blood_pressure": "110/72 mmHg",
            "general_observations": "Healthy vital signs, family counseled",
            "follow_up_required": True,
            "follow_up_days": 21,
            "follow_up_date": (datetime.utcnow() + timedelta(days=14)).strftime("%Y-%m-%d"),
            "follow_up_notes": "ANC 2nd checkup and IFA iron tablets collection",
            "duration_seconds": 44.0,
            "sync_status": "synced"
        },
        {
            "household_id": "H1028",
            "village_area": "Kalyan Basti, Sector 1",
            "visit_date": today_str,
            "household_members": 4,
            "pregnant": False,
            "children": [],
            "children_count": 0,
            "symptoms": "None",
            "temperature": "98.4 F",
            "blood_pressure": "118/76 mmHg",
            "general_observations": "Routine census and health awareness check",
            "follow_up_required": False,
            "duration_seconds": 32.0,
            "sync_status": "offline_pending"
        }
    ]

    for idx, sample in enumerate(historical_samples):
        norm, _ = normalize_encounter(sample)
        enc_id = f"ENC-SEED-00{idx+1}"
        enc = Encounter(
            encounter_id=enc_id,
            household_id=norm['household_id'],
            user_id=asha_user.id,
            visit_date=norm['visit_date'],
            capture_mode='manual',
            status='processed' if sample['sync_status'] == 'synced' else 'draft',
            duration_seconds=sample['duration_seconds'],
            sync_status=sample['sync_status']
        )
        enc.raw_data = sample
        enc.normalized_data = norm
        db.session.add(enc)
        db.session.flush()

        if sample['sync_status'] == 'synced':
            result = run_mapping_engine(norm)
            for p in result['generated_programmes']:
                po = ProgrammeOutput(
                    encounter_id=enc.id,
                    programme_code=p['code'],
                    programme_name=p['name']
                )
                po.payload = p['payload']
                db.session.add(po)

            for m in result['mappings']:
                ml = MappingLog(
                    encounter_id=enc.id,
                    rule_name=m['rule_name'],
                    source_field=m['source_field'],
                    target_programme=m['target_programme'],
                    target_field=m['target_field'],
                    value_transformed=str(m['value'])
                )
                db.session.add(ml)

            fu_prog = next((p for p in result['generated_programmes'] if p['code'] == 'FOLLOW_UP'), None)
            if fu_prog:
                target_m_id = sample.get('member_id')
                f_type = 'general'
                if 'vaccin' in sample.get('follow_up_notes', '').lower():
                    f_type = 'vaccination'
                elif 'iron' in sample.get('follow_up_notes', '').lower() or 'ifa' in sample.get('follow_up_notes', '').lower():
                    f_type = 'iron_tablets'

                fu = FollowUp(
                    encounter_id=enc.id,
                    household_id=enc.household_id,
                    member_id=target_m_id,
                    beneficiary_name=sample.get('member_name'),
                    followup_type=f_type,
                    due_date=sample.get('follow_up_date', today_str),
                    reason=sample.get('follow_up_notes', 'Routine checkup'),
                    status='pending',
                    sms_status='pending',
                    notes=sample.get('follow_up_notes', '')
                )
                db.session.add(fu)

    # Add a completed follow-up for Kavita Singh (H1027)
    comp_fu = FollowUp(
        household_id="H1027",
        member_id=saved_members["M1027-03"].id,
        beneficiary_name="Kavita Singh",
        followup_type="iron_tablets",
        due_date=(datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d"),
        reason="IFA tablets distribution cycle",
        status="completed",
        sms_status="simulated",
        reminder_count=1,
        last_reminder_at=datetime.utcnow() - timedelta(days=8),
        completed_at=datetime.utcnow() - timedelta(days=5),
        notes="Tablets received and verified by ASHA worker."
    )
    db.session.add(comp_fu)
    db.session.flush()

    # Pre-seed simulated SMS messages for realistic demo history
    sms_1 = SMSMessage(
        household_id="H1024",
        member_id=saved_members["M1024-02"].id,
        recipient_name="Seetha Kumar",
        recipient_phone="9876543211",
        template_type="iron_tablets",
        language="te",
        message_body=render_template("iron_tablets", "te", {"name": "Seetha Kumar", "due_date": today_str}),
        status="simulated",
        simulated_flag=True,
        created_at=datetime.utcnow() - timedelta(hours=5),
        sent_at=datetime.utcnow() - timedelta(hours=5)
    )

    sms_2 = SMSMessage(
        household_id="H1025",
        member_id=saved_members["M1025-04"].id,
        recipient_name="Ramesh Verma (for Priya)",
        recipient_phone="9811223344",
        template_type="vaccination",
        language="hi",
        message_body=render_template("vaccination", "hi", {"name": "Priya Verma", "due_date": (datetime.utcnow() - timedelta(days=3)).strftime("%Y-%m-%d")}),
        status="simulated",
        simulated_flag=True,
        created_at=datetime.utcnow() - timedelta(days=2),
        sent_at=datetime.utcnow() - timedelta(days=2)
    )

    db.session.add(sms_1)
    db.session.add(sms_2)

    db.session.commit()
    print("Demo database successfully seeded with Members A, B, C, Follow-ups, and Simulated SMS messages.")

if __name__ == '__main__':
    from flask import Flask
    from config import Config
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    with app.app_context():
        seed_demo_database()
