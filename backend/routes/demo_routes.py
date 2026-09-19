from flask import Blueprint, request, jsonify
from database import db
from seed import seed_demo_database

demo_bp = Blueprint('demo', __name__, url_prefix='/api/demo')

SCENARIOS = {
    "1": {
        "scenario_id": "1",
        "household_id": "H1024",
        "title": "Household H1024 (Full Quad-Record Flow)",
        "description": "Woman aged 25, pregnant 24 weeks; 1 child aged 2 years (vaccines complete); follow-up in 14 days.",
        "expected_outputs": ["MATERNAL_HEALTH", "IMMUNISATION", "HOUSEHOLD_REGISTER", "FOLLOW_UP"],
        "data": {
            "household_id": "H1024",
            "village_area": "Shanti Nagar, Ward 4",
            "visit_date": "2026-09-18",
            "household_members": 4,
            "pregnant": True,
            "maternal_age": 25,
            "gestational_age": 24,
            "expected_delivery_date": "2027-01-08",
            "maternal_observations": "Normal fetal heart tones, mild pedal edema, iron supplements provided",
            "children": [
                {
                    "child_index": 1,
                    "age": 2,
                    "vaccination_status": "Complete",
                    "observations": "Growth on green trajectory, completed primary series"
                }
            ],
            "children_count": 1,
            "symptoms": "Mild fatigue",
            "temperature": "98.4 F",
            "blood_pressure": "118/76 mmHg",
            "general_observations": "Clean water storage observed, sanitation satisfactory",
            "follow_up_required": True,
            "follow_up_days": 14,
            "follow_up_date": "2026-10-02",
            "follow_up_notes": "Follow-up checkup on maternal BP and prenatal vitamin adherence."
        }
    },
    "2": {
        "scenario_id": "2",
        "household_id": "H1025",
        "title": "Household H1025 (Child Health & Census Focus)",
        "description": "No pregnancy; 2 children (1 complete, 1 partial vaccine); no follow-up needed.",
        "expected_outputs": ["IMMUNISATION", "HOUSEHOLD_REGISTER"],
        "data": {
            "household_id": "H1025",
            "village_area": "Kalyan Basti, Sector 2",
            "visit_date": "2026-09-18",
            "household_members": 5,
            "pregnant": False,
            "maternal_age": None,
            "gestational_age": None,
            "expected_delivery_date": None,
            "maternal_observations": "",
            "children": [
                {
                    "child_index": 1,
                    "age": 4,
                    "vaccination_status": "Complete",
                    "observations": "Booster administered during previous camp"
                },
                {
                    "child_index": 2,
                    "age": 1,
                    "vaccination_status": "Partial",
                    "observations": "Measles-Rubella 1st dose scheduled for next outreach"
                }
            ],
            "children_count": 2,
            "symptoms": "None",
            "temperature": "98.6 F",
            "blood_pressure": "120/80 mmHg",
            "general_observations": "Family aware of upcoming outreach immunization session",
            "follow_up_required": False,
            "follow_up_days": 0,
            "follow_up_date": None,
            "follow_up_notes": ""
        }
    },
    "3": {
        "scenario_id": "3",
        "household_id": "H1026",
        "title": "Household H1026 (Prenatal Monitoring Focus)",
        "description": "First-time pregnant woman aged 22, 16 weeks gestation; no children; follow-up scheduled.",
        "expected_outputs": ["MATERNAL_HEALTH", "HOUSEHOLD_REGISTER", "FOLLOW_UP"],
        "data": {
            "household_id": "H1026",
            "village_area": "Adarsh Gram, Zone 1",
            "visit_date": "2026-09-18",
            "household_members": 3,
            "pregnant": True,
            "maternal_age": 22,
            "gestational_age": 16,
            "expected_delivery_date": "2027-03-05",
            "maternal_observations": "1st trimester registration completed, IFA tablets distributed, TT-1 scheduled",
            "children": [],
            "children_count": 0,
            "symptoms": "Mild morning nausea",
            "temperature": "98.2 F",
            "blood_pressure": "110/72 mmHg",
            "general_observations": "Dietary counselling conducted on dietary diversity and hydration",
            "follow_up_required": True,
            "follow_up_days": 21,
            "follow_up_date": "2026-10-09",
            "follow_up_notes": "ANC 2nd checkup, weight gain check, and ultrasound verification."
        }
    }
}

@demo_bp.route('/reset', methods=['POST'])
def reset_database():
    try:
        seed_demo_database()
        return jsonify({"message": "Database reset and seeded with synthetic demo scenarios successfully."}), 200
    except Exception as e:
        return jsonify({"error": f"Reset failed: {str(e)}"}), 500

@demo_bp.route('/scenarios', methods=['GET'])
def get_scenarios():
    return jsonify({"scenarios": list(SCENARIOS.values())}), 200

@demo_bp.route('/load-scenario', methods=['POST'])
def load_scenario():
    data = request.get_json() or {}
    scenario_id = str(data.get('scenario_id', '1'))
    scenario = SCENARIOS.get(scenario_id)
    if not scenario:
        return jsonify({"error": f"Scenario {scenario_id} not found"}), 404

    return jsonify({
        "message": f"Scenario {scenario_id} loaded: {scenario['title']}",
        "scenario": scenario
    }), 200
