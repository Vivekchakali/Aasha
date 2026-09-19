import json
from datetime import datetime

def run_mapping_engine(normalized):
    """
    Core Rule-Based Mapping Engine for ASHA OneCapture.
    Receives: normalized encounter dictionary
    Supports: Household -> HouseholdMember -> Encounter -> Normalized Data -> Multiple Outputs
    Returns:
      {
        "generated_programmes": [ { "code", "name", "payload", "rules_triggered" } ],
        "mappings": [ { "rule_name", "source_field", "target_programme", "target_field", "value" } ],
        "source_fields_count": int,
        "mapped_fields_count": int,
        "unmapped_fields": [str],
        "flow_graph": { "nodes": [...], "edges": [...] }
      }
    """
    generated_programmes = []
    mappings = []
    used_source_fields = set()

    hh_id = normalized.get('household_id')
    visit_date = normalized.get('visit_date')
    village_area = normalized.get('village_area')
    member_name = normalized.get('member_name')
    member_id = normalized.get('member_id')
    general_obs = normalized.get('general_observations', 'No critical concerns noted.')

    def add_mapping(rule, src_field, prog_code, tgt_field, value):
        mappings.append({
            "rule_name": rule,
            "source_field": src_field,
            "target_programme": prog_code,
            "target_field": tgt_field,
            "value": str(value) if value is not None else ""
        })
        used_source_fields.add(src_field)

    # =========================================================================
    # RULE 1: MATERNAL HEALTH RECORD
    # Trigger: pregnant == True OR gestational_age exists OR maternal_age exists OR pregnancy_month exists
    # =========================================================================
    is_pregnant = bool(normalized.get('pregnant', False))
    gest_age = normalized.get('gestational_age')
    mat_age = normalized.get('maternal_age')
    preg_month = normalized.get('pregnancy_month')

    if is_pregnant or (preg_month is not None) or (gest_age is not None and normalized.get('pregnant') is not False):
        rule_name = "RULE_MATERNAL_HEALTH_01"
        
        # High risk checks (prototype heuristic)
        high_risk = False
        risk_reasons = []
        if mat_age and (mat_age < 18 or mat_age > 35):
            high_risk = True
            risk_reasons.append(f"Age {mat_age}")
        if gest_age and gest_age >= 36:
            risk_reasons.append("Near term / 3rd trimester")
        if normalized.get('blood_pressure') and '140/' in normalized.get('blood_pressure', ''):
            high_risk = True
            risk_reasons.append("Elevated blood pressure (Pre-eclampsia check)")

        payload_maternal = {
            "household_id": hh_id,
            "village_area": village_area,
            "beneficiary_name": member_name or "Maternal Beneficiary",
            "member_id": member_id or "M-UNLINKED",
            "visit_date": visit_date,
            "pregnant": is_pregnant,
            "maternal_age": mat_age,
            "pregnancy_month": preg_month,
            "gestational_age_weeks": gest_age,
            "expected_delivery_date": normalized.get('expected_delivery_date'),
            "blood_pressure": normalized.get('blood_pressure', '118/76 mmHg'),
            "weight": normalized.get('weight', '54 kg'),
            "hemoglobin": normalized.get('hemoglobin', '11.5 g/dL'),
            "danger_signs": normalized.get('danger_signs', 'None'),
            "pregnancy_registered": normalized.get('pregnancy_registered', True),
            "pregnancy_vaccinated": normalized.get('pregnancy_vaccinated', True),
            "observations": normalized.get('maternal_observations') or general_obs,
            "high_risk_flag": high_risk,
            "risk_factors": ", ".join(risk_reasons) if risk_reasons else "Normal prenatal parameters",
            "follow_up_required": normalized.get('follow_up_required', False)
        }

        add_mapping(rule_name, "household_id", "MATERNAL_HEALTH", "household_id", hh_id)
        add_mapping(rule_name, "village_area", "MATERNAL_HEALTH", "village_area", village_area)
        if member_name:
            add_mapping(rule_name, "member_name", "MATERNAL_HEALTH", "beneficiary_name", member_name)
        if member_id:
            add_mapping(rule_name, "member_id", "MATERNAL_HEALTH", "member_id", member_id)
        add_mapping(rule_name, "visit_date", "MATERNAL_HEALTH", "visit_date", visit_date)
        add_mapping(rule_name, "pregnant", "MATERNAL_HEALTH", "pregnant", is_pregnant)
        if mat_age:
            add_mapping(rule_name, "maternal_age", "MATERNAL_HEALTH", "maternal_age", mat_age)
        if preg_month:
            add_mapping(rule_name, "pregnancy_month", "MATERNAL_HEALTH", "pregnancy_month", preg_month)
        if gest_age:
            add_mapping(rule_name, "gestational_age", "MATERNAL_HEALTH", "gestational_age_weeks", gest_age)
        if normalized.get('expected_delivery_date'):
            add_mapping(rule_name, "expected_delivery_date", "MATERNAL_HEALTH", "expected_delivery_date", normalized.get('expected_delivery_date'))
        if normalized.get('blood_pressure'):
            add_mapping(rule_name, "blood_pressure", "MATERNAL_HEALTH", "blood_pressure", normalized.get('blood_pressure'))
        if normalized.get('weight'):
            add_mapping(rule_name, "weight", "MATERNAL_HEALTH", "weight", normalized.get('weight'))
        if normalized.get('hemoglobin'):
            add_mapping(rule_name, "hemoglobin", "MATERNAL_HEALTH", "hemoglobin", normalized.get('hemoglobin'))
        add_mapping(rule_name, "maternal_observations", "MATERNAL_HEALTH", "observations", normalized.get('maternal_observations'))
        add_mapping(rule_name, "follow_up_required", "MATERNAL_HEALTH", "follow_up_required", normalized.get('follow_up_required'))

        generated_programmes.append({
            "code": "MATERNAL_HEALTH",
            "name": "Maternal Health Record",
            "payload": payload_maternal,
            "rule_triggered": rule_name,
            "reason": "Pregnancy indicator, gestational details, or prenatal vitals detected"
        })

    # =========================================================================
    # RULE 2: CHILD IMMUNISATION RECORD
    # Trigger: children exists and len(children) > 0
    # =========================================================================
    children = normalized.get('children', [])
    if children and len(children) > 0:
        rule_name = "RULE_IMMUNISATION_02"
        
        has_due = any(c.get('vaccination_status') in ['Pending', 'Partial'] for c in children)

        payload_immunisation = {
            "household_id": hh_id,
            "village_area": village_area,
            "visit_date": visit_date,
            "children_count": len(children),
            "vaccination_status_summary": normalized.get('vaccination_summary', 'Complete'),
            "immunisation_due_flag": has_due,
            "child_dob": normalized.get('child_dob'),
            "child_feeding": normalized.get('child_feeding', 'Breastmilk & complementary home foods'),
            "child_meals_per_day": normalized.get('child_meals_per_day', 4),
            "child_normal_weight": normalized.get('child_normal_weight', True),
            "children": children,
            "clinical_observations": general_obs
        }

        add_mapping(rule_name, "household_id", "IMMUNISATION", "household_id", hh_id)
        add_mapping(rule_name, "village_area", "IMMUNISATION", "village_area", village_area)
        add_mapping(rule_name, "visit_date", "IMMUNISATION", "visit_date", visit_date)
        add_mapping(rule_name, "children", "IMMUNISATION", "children", f"{len(children)} child records")
        add_mapping(rule_name, "children_count", "IMMUNISATION", "children_count", len(children))
        add_mapping(rule_name, "vaccination_summary", "IMMUNISATION", "vaccination_status_summary", normalized.get('vaccination_summary'))
        add_mapping(rule_name, "general_observations", "IMMUNISATION", "clinical_observations", general_obs)

        generated_programmes.append({
            "code": "IMMUNISATION",
            "name": "Child Immunisation Record",
            "payload": payload_immunisation,
            "rule_triggered": rule_name,
            "reason": f"{len(children)} child profile(s) present with immunization status"
        })

    # =========================================================================
    # RULE 3: HOUSEHOLD REGISTER
    # Trigger: household_id exists (core census register)
    # =========================================================================
    if hh_id:
        rule_name = "RULE_HOUSEHOLD_REGISTER_03"

        payload_household = {
            "household_id": hh_id,
            "village_area": village_area,
            "visit_date": visit_date,
            "active_member_name": member_name,
            "active_member_id": member_id,
            "relationship_to_head": normalized.get('relationship_to_head'),
            "household_members": normalized.get('household_members', 4),
            "children_count": normalized.get('children_count', 0),
            "safe_drinking_water": normalized.get('safe_water', True),
            "reported_illness": normalized.get('has_illness', False),
            "illness_details": normalized.get('illness_details'),
            "other_health_concerns": normalized.get('other_concerns'),
            "maternal_health_flag": is_pregnant,
            "vulnerable_household_flag": is_pregnant or (normalized.get('children_count', 0) > 2) or normalized.get('has_illness', False),
            "vital_signs": {
                "temperature": normalized.get('temperature', '98.4 F'),
                "blood_pressure": normalized.get('blood_pressure', '118/76 mmHg'),
                "weight": normalized.get('weight', 'N/A'),
                "symptoms": normalized.get('symptoms', 'None')
            },
            "observations": general_obs
        }

        add_mapping(rule_name, "household_id", "HOUSEHOLD_REGISTER", "household_id", hh_id)
        add_mapping(rule_name, "village_area", "HOUSEHOLD_REGISTER", "village_area", village_area)
        add_mapping(rule_name, "visit_date", "HOUSEHOLD_REGISTER", "visit_date", visit_date)
        if member_name:
            add_mapping(rule_name, "member_name", "HOUSEHOLD_REGISTER", "active_member_name", member_name)
        if member_id:
            add_mapping(rule_name, "member_id", "HOUSEHOLD_REGISTER", "active_member_id", member_id)
        add_mapping(rule_name, "household_members", "HOUSEHOLD_REGISTER", "household_members", normalized.get('household_members'))
        add_mapping(rule_name, "children_count", "HOUSEHOLD_REGISTER", "children_count", normalized.get('children_count'))
        add_mapping(rule_name, "pregnant", "HOUSEHOLD_REGISTER", "maternal_health_flag", is_pregnant)
        add_mapping(rule_name, "temperature", "HOUSEHOLD_REGISTER", "vital_signs.temperature", normalized.get('temperature'))
        add_mapping(rule_name, "blood_pressure", "HOUSEHOLD_REGISTER", "vital_signs.blood_pressure", normalized.get('blood_pressure'))
        add_mapping(rule_name, "general_observations", "HOUSEHOLD_REGISTER", "observations", general_obs)

        generated_programmes.append({
            "code": "HOUSEHOLD_REGISTER",
            "name": "Household Register",
            "payload": payload_household,
            "rule_triggered": rule_name,
            "reason": "Standard household census and baseline community vitals"
        })

    # =========================================================================
    # RULE 4: FOLLOW-UP TRACKING RECORD
    # Trigger: follow_up_required == True OR follow_up_date exists
    # =========================================================================
    fu_required = normalized.get('follow_up_required', False)
    fu_date = normalized.get('follow_up_date')

    if fu_required or fu_date:
        rule_name = "RULE_FOLLOW_UP_04"

        reasons = []
        if is_pregnant:
            reasons.append("Prenatal check & ANC scheduling")
        if any(c.get('vaccination_status') in ['Pending', 'Partial'] for c in children):
            reasons.append("Child vaccine dose due")
        if normalized.get('symptoms'):
            reasons.append(f"Monitor symptoms: {normalized.get('symptoms')}")
        if not reasons:
            reasons.append("Routine community health monitoring")

        payload_followup = {
            "household_id": hh_id,
            "member_name": member_name,
            "member_id": member_id,
            "visit_date": visit_date,
            "follow_up_required": True,
            "follow_up_days": normalized.get('follow_up_days', 14),
            "follow_up_date": fu_date or "Scheduled in 14 days",
            "reason": "; ".join(reasons),
            "notes": normalized.get('follow_up_notes', 'Verify maternal vitals and child immunization adherence.')
        }

        add_mapping(rule_name, "household_id", "FOLLOW_UP", "household_id", hh_id)
        if member_name:
            add_mapping(rule_name, "member_name", "FOLLOW_UP", "member_name", member_name)
        add_mapping(rule_name, "visit_date", "FOLLOW_UP", "visit_date", visit_date)
        add_mapping(rule_name, "follow_up_required", "FOLLOW_UP", "follow_up_required", True)
        add_mapping(rule_name, "follow_up_days", "FOLLOW_UP", "follow_up_days", normalized.get('follow_up_days'))
        add_mapping(rule_name, "follow_up_date", "FOLLOW_UP", "follow_up_date", fu_date)
        add_mapping(rule_name, "follow_up_notes", "FOLLOW_UP", "notes", normalized.get('follow_up_notes'))

        generated_programmes.append({
            "code": "FOLLOW_UP",
            "name": "Follow-up Tracking Record",
            "payload": payload_followup,
            "rule_triggered": rule_name,
            "reason": "Scheduled re-visit or monitoring protocol indicated"
        })

    # Candidate input fields
    candidate_source_fields = [
        "household_id", "village_area", "visit_date", "member_name", "member_id",
        "household_members", "pregnant", "pregnancy_month", "maternal_age",
        "gestational_age", "expected_delivery_date", "maternal_observations",
        "children", "children_count", "vaccination_summary", "symptoms",
        "temperature", "blood_pressure", "weight", "hemoglobin", "danger_signs",
        "general_observations", "follow_up_required", "follow_up_days", "follow_up_date", "follow_up_notes"
    ]

    active_source_fields = [f for f in candidate_source_fields if normalized.get(f) is not None and normalized.get(f) != '' and normalized.get(f) != []]
    mapped_source_fields = list(used_source_fields.intersection(set(active_source_fields)))
    unmapped_fields = [f for f in active_source_fields if f not in used_source_fields]

    # Flow Graph for frontend
    nodes = []
    edges = []

    for prog in generated_programmes:
        nodes.append({
            "id": f"prog_{prog['code']}",
            "label": prog['name'],
            "type": "target_programme",
            "code": prog['code']
        })

    for src in mapped_source_fields:
        nodes.append({
            "id": f"src_{src}",
            "label": src.replace('_', ' ').title(),
            "type": "source_field"
        })

    for m in mappings:
        edges.append({
            "source": f"src_{m['source_field']}",
            "target": f"prog_{m['target_programme']}",
            "target_field": m['target_field'],
            "rule": m['rule_name']
        })

    return {
        "generated_programmes": generated_programmes,
        "mappings": mappings,
        "source_fields_count": len(active_source_fields),
        "mapped_fields_count": len(mapped_source_fields),
        "unmapped_fields": unmapped_fields,
        "flow_graph": {
            "nodes": nodes,
            "edges": edges
        }
    }
