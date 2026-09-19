import pytest
from services.normalization import parse_boolean, parse_int, parse_followup_days, normalize_encounter

def test_parse_boolean():
    assert parse_boolean("yes") is True
    assert parse_boolean("Yes") is True
    assert parse_boolean("Y") is True
    assert parse_boolean("true") is True
    assert parse_boolean("hai") is True
    assert parse_boolean(True) is True
    assert parse_boolean("no") is False
    assert parse_boolean("false") is False
    assert parse_boolean("nahi") is False
    assert parse_boolean(None) is None

def test_parse_int():
    assert parse_int("24 weeks") == 24
    assert parse_int("24 wk") == 24
    assert parse_int("age 25") == 25
    assert parse_int(2) == 2
    assert parse_int("two") == 2

def test_parse_followup_days():
    assert parse_followup_days("two weeks") == 14
    assert parse_followup_days("2 weeks") == 14
    assert parse_followup_days("14 days") == 14
    assert parse_followup_days("1 week") == 7

def test_normalize_encounter():
    raw = {
        "household_id": "h1024",
        "village_area": "Shanti Nagar",
        "visit_date": "2026-09-18",
        "pregnant": "Yes",
        "maternal_age": "25 years",
        "gestational_age": "24 weeks",
        "children": [{"age": "2", "vaccination_status": "Complete"}],
        "follow_up_required": "yes",
        "follow_up_days": "two weeks"
    }
    normalized, errors = normalize_encounter(raw)
    assert len(errors) == 0
    assert normalized['household_id'] == "H1024"
    assert normalized['pregnant'] is True
    assert normalized['maternal_age'] == 25
    assert normalized['gestational_age'] == 24
    assert normalized['children_count'] == 1
    assert normalized['follow_up_required'] is True
    assert normalized['follow_up_days'] == 14
