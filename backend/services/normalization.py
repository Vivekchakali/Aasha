import re
from datetime import datetime, timedelta

def parse_boolean(val):
    if val is None:
        return None
    if isinstance(val, bool):
        return val
    s = str(val).strip().lower()
    if s in ['true', 'yes', 'y', '1', 'hai', 'haan', 'positive', 'present']:
        return True
    if s in ['false', 'no', 'n', '0', 'nahi', 'negative', 'absent']:
        return False
    return None

def parse_int(val, default=None):
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return int(val)
    s = str(val).strip()
    match = re.search(r'\d+', s)
    if match:
        return int(match.group())
    word_map = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10}
    for word, num in word_map.items():
        if word in s.lower():
            return num
    return default

def parse_followup_days(val, default=14):
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return int(val)
    s = str(val).strip().lower()
    
    # check weeks
    week_match = re.search(r'(\d+)\s*(?:weeks?|wk|w|hafte)', s)
    if week_match:
        return int(week_match.group(1)) * 7
    if 'two weeks' in s or '2 weeks' in s:
        return 14
    if 'one week' in s or '1 week' in s:
        return 7
    if 'three weeks' in s or '3 weeks' in s:
        return 21
    if 'month' in s:
        return 30
    
    # check days
    day_match = re.search(r'(\d+)\s*(?:days?|d|din)', s)
    if day_match:
        return int(day_match.group(1))
        
    num = parse_int(s)
    return num if num is not None else default

def calculate_edd(visit_date_str, gestational_weeks):
    """Estimated Date of Delivery (typical human gestation is 40 weeks)"""
    if not gestational_weeks or not visit_date_str:
        return None
    try:
        visit_dt = datetime.strptime(visit_date_str, "%Y-%m-%d")
        remaining_weeks = max(0, 40 - int(gestational_weeks))
        edd = visit_dt + timedelta(weeks=remaining_weeks)
        return edd.strftime("%Y-%m-%d")
    except Exception:
        return None

def normalize_children(raw_children, count_hint=0):
    children_list = []
    if isinstance(raw_children, list):
        for idx, item in enumerate(raw_children):
            if isinstance(item, dict):
                age = parse_int(item.get('age'))
                status = str(item.get('vaccination_status', 'Complete')).strip().capitalize()
                if status.lower() in ['complete', 'completed', 'done', 'yes']:
                    status = 'Complete'
                elif status.lower() in ['pending', 'due', 'no', 'missed', 'incomplete']:
                    status = 'Pending'
                elif status.lower() in ['partial', 'partially']:
                    status = 'Partial'
                else:
                    status = 'Complete'
                    
                children_list.append({
                    "child_index": idx + 1,
                    "age": age if age is not None else 1,
                    "vaccination_status": status,
                    "observations": str(item.get('observations', 'Normal growth, age-appropriate milestones')).strip()
                })
    elif count_hint > 0:
        for idx in range(count_hint):
            children_list.append({
                "child_index": idx + 1,
                "age": 2,
                "vaccination_status": "Complete",
                "observations": "Routine checkup, age-appropriate growth"
            })
    return children_list

def normalize_encounter(raw):
    """
    Receives raw encounter dictionary from user or voice input.
    Returns:
    (normalized_dict, validation_errors_list)
    """
    errors = []
    normalized = {}

    # 1. Household ID
    hh_id = str(raw.get('household_id', '')).strip().upper()
    if not hh_id:
        errors.append("Household ID is required.")
    else:
        # standard format: H1024 or similar
        normalized['household_id'] = hh_id

    # 2. Village / Area
    village = str(raw.get('village_area', 'Ward 4, North Sector')).strip()
    normalized['village_area'] = village if village else 'Ward 4, North Sector'

    # 3. Visit Date
    visit_date = str(raw.get('visit_date', '')).strip()
    if not visit_date:
        visit_date = datetime.utcnow().strftime("%Y-%m-%d")
    else:
        # validate format YYYY-MM-DD
        try:
            datetime.strptime(visit_date, "%Y-%m-%d")
        except ValueError:
            visit_date = datetime.utcnow().strftime("%Y-%m-%d")
    normalized['visit_date'] = visit_date

    # 4. Household Member Demographics (if linked to a specific member)
    normalized['member_id'] = str(raw.get('member_id', raw.get('member_code', ''))).strip() or None
    normalized['member_name'] = str(raw.get('member_name', raw.get('full_name', ''))).strip() or None
    raw_phone = str(raw.get('phone_number', raw.get('mobile_number', raw.get('phone', '')))).strip()
    normalized['phone_number'] = raw_phone if raw_phone else None
    normalized['preferred_language'] = str(raw.get('preferred_language', 'en')).strip() or 'en'
    gender = str(raw.get('gender', '')).strip().capitalize()
    normalized['gender'] = gender if gender in ['Female', 'Male', 'Other'] else None
    normalized['relationship_to_head'] = str(raw.get('relationship_to_head', '')).strip() or None

    # 5. Total Members
    total_members = parse_int(raw.get('household_members', raw.get('total_members', 4)), default=4)
    normalized['household_members'] = max(1, total_members)

    # 6. Maternal Health Fields
    pregnant = parse_boolean(raw.get('pregnant', raw.get('is_pregnant', False)))
    normalized['pregnant'] = bool(pregnant)

    if normalized['pregnant'] and normalized['gender'] == 'Male':
        errors.append("Validation Error: Pregnancy status cannot be recorded for male members.")

    maternal_age = parse_int(raw.get('maternal_age', raw.get('age', None)))
    if maternal_age is not None:
        if maternal_age < 12 or maternal_age > 65:
            errors.append(f"Maternal age {maternal_age} is outside the plausible range (12-65).")
        normalized['maternal_age'] = maternal_age
    else:
        normalized['maternal_age'] = None

    pregnancy_month = parse_int(raw.get('pregnancy_month', None))
    if pregnancy_month is not None:
        if pregnancy_month < 1 or pregnancy_month > 9:
            errors.append(f"Pregnancy month {pregnancy_month} must be between 1 and 9.")
        normalized['pregnancy_month'] = pregnancy_month
    else:
        normalized['pregnancy_month'] = None

    gestational_age = parse_int(raw.get('gestational_age', raw.get('gestation_weeks', None)))
    if gestational_age is None and normalized['pregnancy_month']:
        gestational_age = min(40, normalized['pregnancy_month'] * 4 + 2)

    if gestational_age is not None:
        if gestational_age < 1 or gestational_age > 45:
            errors.append(f"Gestational age {gestational_age} weeks is outside valid range (1-45).")
        normalized['gestational_age'] = gestational_age
    else:
        normalized['gestational_age'] = None

    edd = str(raw.get('expected_delivery_date', '')).strip()
    if edd:
        normalized['expected_delivery_date'] = edd
    elif normalized['pregnant'] and normalized['gestational_age']:
        normalized['expected_delivery_date'] = calculate_edd(visit_date, normalized['gestational_age'])
    else:
        normalized['expected_delivery_date'] = None

    normalized['maternal_observations'] = str(raw.get('maternal_observations', '')).strip()

    # 6. Children & Immunisation Fields
    children_count_hint = parse_int(raw.get('children_count', raw.get('children', 0)), default=0)
    raw_children = raw.get('children_list', raw.get('children', []))
    normalized_children = normalize_children(raw_children, count_hint=children_count_hint if not isinstance(raw_children, list) else 0)
    normalized['children'] = normalized_children
    normalized['children_count'] = len(normalized_children)

    # Overall vaccination summary
    if normalized['children']:
        has_pending = any(c['vaccination_status'] == 'Pending' for c in normalized['children'])
        has_partial = any(c['vaccination_status'] == 'Partial' for c in normalized['children'])
        if has_pending:
            normalized['vaccination_summary'] = 'Pending'
        elif has_partial:
            normalized['vaccination_summary'] = 'Partial'
        else:
            normalized['vaccination_summary'] = 'Complete'
    else:
        normalized['vaccination_summary'] = None

    # 7. Core Household Questionnaire Responses
    safe_water = parse_boolean(raw.get('safe_water', True))
    normalized['safe_water'] = True if safe_water is None else bool(safe_water)

    has_illness = parse_boolean(raw.get('has_illness', False))
    normalized['has_illness'] = bool(has_illness)
    normalized['illness_member_name'] = str(raw.get('illness_member_name', '')).strip() or None
    normalized['illness_details'] = str(raw.get('illness_details', raw.get('reported_illness', ''))).strip() or None
    normalized['illness_duration'] = str(raw.get('illness_duration', '')).strip() or None
    normalized['other_concerns'] = str(raw.get('other_concerns', '')).strip() or None

    # Maternal questionnaire verification
    has_pregnant_woman = parse_boolean(raw.get('has_pregnant_woman', raw.get('pregnant', False)))
    normalized['has_pregnant_woman'] = bool(has_pregnant_woman)
    if normalized['has_pregnant_woman']:
        normalized['pregnant'] = True
    normalized['pregnancy_registered'] = parse_boolean(raw.get('pregnancy_registered', True))
    normalized['pregnancy_vaccinated'] = parse_boolean(raw.get('pregnancy_vaccinated', True))

    # Child questionnaire verification
    has_child_under_2 = parse_boolean(raw.get('has_child_under_2', False))
    normalized['has_child_under_2'] = bool(has_child_under_2)
    normalized['child_dob'] = str(raw.get('child_dob', '')).strip() or None
    normalized['child_feeding'] = str(raw.get('child_feeding', 'Breastmilk & complementary home foods')).strip()
    normalized['child_meals_per_day'] = parse_int(raw.get('child_meals_per_day', 4), default=4)
    normalized['child_normal_weight'] = parse_boolean(raw.get('child_normal_weight', True))

    # 8. Health Observations & Clinical Encounter Data
    normalized['symptoms'] = str(raw.get('symptoms', '')).strip()
    normalized['temperature'] = str(raw.get('temperature', '98.4 F')).strip()
    normalized['blood_pressure'] = str(raw.get('blood_pressure', '118/76 mmHg')).strip()
    normalized['weight'] = str(raw.get('weight', '')).strip() or None
    normalized['hemoglobin'] = str(raw.get('hemoglobin', raw.get('hb', ''))).strip() or None
    normalized['danger_signs'] = str(raw.get('danger_signs', 'None')).strip()
    normalized['general_observations'] = str(raw.get('general_observations', raw.get('observations', 'General health stable; sanitation satisfactory'))).strip()

    # 9. Follow-up
    fu_req = parse_boolean(raw.get('follow_up_required', raw.get('followup_required', False)))
    normalized['follow_up_required'] = bool(fu_req)
    
    fu_days = parse_followup_days(raw.get('follow_up_days', raw.get('follow_up_period', 14)))
    normalized['follow_up_days'] = fu_days

    explicit_fu_date = str(raw.get('follow_up_date', '')).strip()
    if explicit_fu_date:
        normalized['follow_up_date'] = explicit_fu_date
    elif normalized['follow_up_required']:
        try:
            visit_dt = datetime.strptime(visit_date, "%Y-%m-%d")
            fu_dt = visit_dt + timedelta(days=fu_days)
            normalized['follow_up_date'] = fu_dt.strftime("%Y-%m-%d")
        except Exception:
            normalized['follow_up_date'] = None
    else:
        normalized['follow_up_date'] = None

    normalized['follow_up_notes'] = str(raw.get('follow_up_notes', raw.get('notes', 'Routine community follow-up and monitoring'))).strip()
    normalized['sms_note'] = str(raw.get('sms_note', normalized['follow_up_notes'])).strip()
    send_sms = parse_boolean(raw.get('send_sms_on_confirm', True))
    normalized['send_sms_on_confirm'] = True if send_sms is None else bool(send_sms)

    return normalized, errors
