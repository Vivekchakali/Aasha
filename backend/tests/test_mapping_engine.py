import pytest
from services.normalization import normalize_encounter
from services.mapping_engine import run_mapping_engine

def test_mapping_engine_scenario_1_h1024():
    """
    Scenario 1: H1024
    Pregnant woman aged 25, 24 weeks gestation; 1 child aged 2 (vaccines complete); follow-up required.
    Expected: All 4 outputs generated.
    """
    raw = {
        "household_id": "H1024",
        "village_area": "Shanti Nagar",
        "visit_date": "2026-09-18",
        "household_members": 4,
        "pregnant": True,
        "maternal_age": 25,
        "gestational_age": 24,
        "children": [{"child_index": 1, "age": 2, "vaccination_status": "Complete"}],
        "follow_up_required": True,
        "follow_up_days": 14
    }
    normalized, _ = normalize_encounter(raw)
    result = run_mapping_engine(normalized)

    codes = [p['code'] for p in result['generated_programmes']]
    assert "MATERNAL_HEALTH" in codes
    assert "IMMUNISATION" in codes
    assert "HOUSEHOLD_REGISTER" in codes
    assert "FOLLOW_UP" in codes
    assert len(codes) == 4

    # Verify field mappings
    assert result['source_fields_count'] >= 7
    assert result['mapped_fields_count'] >= 7
    assert len(result['mappings']) >= 15
    assert len(result['flow_graph']['nodes']) > 0
    assert len(result['flow_graph']['edges']) > 0

def test_mapping_engine_scenario_2_h1025():
    """
    Scenario 2: H1025
    No pregnancy; 2 children; no follow-up.
    Expected: IMMUNISATION and HOUSEHOLD_REGISTER only (2 outputs).
    """
    raw = {
        "household_id": "H1025",
        "village_area": "Kalyan Basti",
        "visit_date": "2026-09-18",
        "household_members": 5,
        "pregnant": False,
        "maternal_age": None,
        "gestational_age": None,
        "children": [
            {"child_index": 1, "age": 4, "vaccination_status": "Complete"},
            {"child_index": 2, "age": 1, "vaccination_status": "Partial"}
        ],
        "follow_up_required": False
    }
    normalized, _ = normalize_encounter(raw)
    result = run_mapping_engine(normalized)

    codes = [p['code'] for p in result['generated_programmes']]
    assert "IMMUNISATION" in codes
    assert "HOUSEHOLD_REGISTER" in codes
    assert "MATERNAL_HEALTH" not in codes
    assert "FOLLOW_UP" not in codes
    assert len(codes) == 2

def test_mapping_engine_scenario_3_h1026():
    """
    Scenario 3: H1026
    Pregnant woman; no children; follow-up required.
    Expected: MATERNAL_HEALTH, HOUSEHOLD_REGISTER, and FOLLOW_UP (3 outputs).
    """
    raw = {
        "household_id": "H1026",
        "village_area": "Adarsh Gram",
        "visit_date": "2026-09-18",
        "household_members": 3,
        "pregnant": True,
        "maternal_age": 22,
        "gestational_age": 16,
        "children": [],
        "follow_up_required": True,
        "follow_up_days": 21
    }
    normalized, _ = normalize_encounter(raw)
    result = run_mapping_engine(normalized)

    codes = [p['code'] for p in result['generated_programmes']]
    assert "MATERNAL_HEALTH" in codes
    assert "HOUSEHOLD_REGISTER" in codes
    assert "FOLLOW_UP" in codes
    assert "IMMUNISATION" not in codes
    assert len(codes) == 3

def test_critical_test_case_a_normal_household():
    """
    CASE A — NORMAL HOUSEHOLD: No pregnancy, No child under 2, No illness.
    Expected: Household Record only.
    """
    raw = {
        "household_id": "H1027",
        "village_area": "Shanti Nagar",
        "visit_date": "2026-09-18",
        "household_members": 4,
        "pregnant": False,
        "children": [],
        "follow_up_required": False
    }
    normalized, _ = normalize_encounter(raw)
    result = run_mapping_engine(normalized)
    codes = [p['code'] for p in result['generated_programmes']]
    assert codes == ["HOUSEHOLD_REGISTER"]

def test_critical_test_case_b_pregnant_woman():
    """
    CASE B — PREGNANT WOMAN: Pregnancy = YES
    Expected: Household Record + Maternal Record
    """
    raw = {
        "household_id": "H1024",
        "village_area": "Shanti Nagar",
        "visit_date": "2026-09-18",
        "pregnant": True,
        "pregnancy_month": 5,
        "children": [],
        "follow_up_required": False
    }
    normalized, _ = normalize_encounter(raw)
    result = run_mapping_engine(normalized)
    codes = [p['code'] for p in result['generated_programmes']]
    assert "HOUSEHOLD_REGISTER" in codes
    assert "MATERNAL_HEALTH" in codes
    assert "IMMUNISATION" not in codes
    assert "FOLLOW_UP" not in codes
    assert len(codes) == 2

def test_critical_test_case_c_child_under_2():
    """
    CASE C — CHILD UNDER 2: Child under 2 = YES
    Expected: Household Record + Child/Immunisation Record
    """
    raw = {
        "household_id": "H1025",
        "village_area": "Kalyan Basti",
        "visit_date": "2026-09-18",
        "pregnant": False,
        "children": [{"child_index": 1, "age": 1, "vaccination_status": "Complete"}],
        "follow_up_required": False
    }
    normalized, _ = normalize_encounter(raw)
    result = run_mapping_engine(normalized)
    codes = [p['code'] for p in result['generated_programmes']]
    assert "HOUSEHOLD_REGISTER" in codes
    assert "IMMUNISATION" in codes
    assert "MATERNAL_HEALTH" not in codes
    assert "FOLLOW_UP" not in codes
    assert len(codes) == 2

def test_critical_test_case_d_pregnancy_plus_child():
    """
    CASE D — PREGNANCY + CHILD
    Expected: Household Record + Maternal Record + Child/Immunisation Record
    """
    raw = {
        "household_id": "H1024",
        "village_area": "Shanti Nagar",
        "visit_date": "2026-09-18",
        "pregnant": True,
        "pregnancy_month": 5,
        "children": [{"child_index": 1, "age": 1, "vaccination_status": "Complete"}],
        "follow_up_required": False
    }
    normalized, _ = normalize_encounter(raw)
    result = run_mapping_engine(normalized)
    codes = [p['code'] for p in result['generated_programmes']]
    assert "HOUSEHOLD_REGISTER" in codes
    assert "MATERNAL_HEALTH" in codes
    assert "IMMUNISATION" in codes
    assert "FOLLOW_UP" not in codes
    assert len(codes) == 3

def test_critical_test_case_e_follow_up():
    """
    CASE E — FOLLOW-UP: Follow-up required
    Expected: Follow-up Task created along with Household Record.
    """
    raw = {
        "household_id": "H1024",
        "village_area": "Shanti Nagar",
        "visit_date": "2026-09-18",
        "pregnant": False,
        "children": [],
        "follow_up_required": True,
        "follow_up_days": 14
    }
    normalized, _ = normalize_encounter(raw)
    result = run_mapping_engine(normalized)
    codes = [p['code'] for p in result['generated_programmes']]
    assert "HOUSEHOLD_REGISTER" in codes
    assert "FOLLOW_UP" in codes
    assert len(codes) == 2

def test_critical_test_case_f_all_conditions():
    """
    CASE F — ALL CONDITIONS: Pregnancy + Child + Follow-up
    Expected: Multiple relevant structured outputs generated from ONE encounter.
    """
    raw = {
        "household_id": "H1024",
        "village_area": "Shanti Nagar",
        "visit_date": "2026-09-18",
        "pregnant": True,
        "pregnancy_month": 5,
        "children": [{"child_index": 1, "age": 1, "vaccination_status": "Complete"}],
        "follow_up_required": True,
        "follow_up_days": 14
    }
    normalized, _ = normalize_encounter(raw)
    result = run_mapping_engine(normalized)
    codes = [p['code'] for p in result['generated_programmes']]
    assert "HOUSEHOLD_REGISTER" in codes
    assert "MATERNAL_HEALTH" in codes
    assert "IMMUNISATION" in codes
    assert "FOLLOW_UP" in codes
    assert len(codes) == 4
