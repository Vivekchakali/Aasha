from models.encounter import Encounter
from models.programme_output import ProgrammeOutput
from models.household import Household
from models.followup import FollowUp

# Prototype specification of manual entry requirements per separate programme register
TRADITIONAL_PROGRAMME_FIELD_COUNTS = {
    "MATERNAL_HEALTH": 9,      # HH ID, Village, Date, Pregnant, Age, Gestation, EDD, Obs, Follow-up
    "IMMUNISATION": 7,         # HH ID, Village, Date, Child count, Age/Dose, Status, Clinical Obs
    "HOUSEHOLD_REGISTER": 8,   # HH ID, Village, Date, Total Members, Children, Maternal Flag, Vitals, Obs
    "FOLLOW_UP": 6             # HH ID, Date, Follow-up flag, Due Date, Clinical Reason, Instructions
}

def calculate_encounter_impact(encounter):
    """
    Computes prototype workflow metrics for a single encounter based on its actual data.
    """
    norm = encounter.normalized_data or {}
    outputs = encounter.outputs or []

    # Count actual manual inputs populated in OneCapture
    onecapture_actions = 0
    candidate_keys = [
        "household_id", "village_area", "visit_date", "household_members",
        "pregnant", "maternal_age", "gestational_age", "expected_delivery_date",
        "maternal_observations", "children", "vaccination_summary",
        "temperature", "blood_pressure", "general_observations",
        "follow_up_required", "follow_up_date", "follow_up_notes"
    ]
    for k in candidate_keys:
        v = norm.get(k)
        if v is not None and v != '' and v != []:
            onecapture_actions += 1
    if onecapture_actions == 0:
        onecapture_actions = 8  # minimum fallback if unrecorded

    # Calculate traditional baseline: sum of separate form fields for all triggered programmes
    traditional_actions = 0
    generated_codes = [p.programme_code for p in outputs]
    for code in generated_codes:
        traditional_actions += TRADITIONAL_PROGRAMME_FIELD_COUNTS.get(code, 6)

    if traditional_actions == 0:
        # Default baseline if outputs not yet generated
        traditional_actions = onecapture_actions * 2

    actions_avoided = max(0, traditional_actions - onecapture_actions)
    reduction_percentage = round((actions_avoided / traditional_actions * 100), 1) if traditional_actions > 0 else 0.0

    # Measured duration vs estimated separate entry time
    # Baseline assumed at ~15s per manual field entry in legacy register
    simulated_baseline_seconds = traditional_actions * 15.0
    actual_duration_seconds = encounter.duration_seconds if encounter.duration_seconds and encounter.duration_seconds > 5 else 45.0
    time_saved_seconds = max(0.0, simulated_baseline_seconds - actual_duration_seconds)
    time_reduction_percentage = round((time_saved_seconds / simulated_baseline_seconds * 100), 1) if simulated_baseline_seconds > 0 else 0.0

    return {
        "encounter_id": encounter.encounter_id,
        "household_id": encounter.household_id,
        "onecapture_actions": onecapture_actions,
        "traditional_actions": traditional_actions,
        "actions_avoided": actions_avoided,
        "reduction_percentage": reduction_percentage,
        "onecapture_duration_seconds": round(actual_duration_seconds, 1),
        "traditional_estimated_duration_seconds": round(simulated_baseline_seconds, 1),
        "time_saved_seconds": round(time_saved_seconds, 1),
        "time_reduction_percentage": time_reduction_percentage,
        "programmes_generated_count": len(outputs),
        "methodology": {
            "disclaimer": "Prototype workflow measurement based on simulated legacy multi-register input counting vs OneCapture single capture.",
            "legacy_field_assumptions": TRADITIONAL_PROGRAMME_FIELD_COUNTS,
            "seconds_per_field_assumption": 15
        }
    }

def get_macro_analytics():
    """
    Computes aggregated system metrics across all synthetic encounters.
    """
    encounters = Encounter.query.all()
    households = Household.query.all()
    outputs = ProgrammeOutput.query.all()
    followups = FollowUp.query.all()

    total_encounters = len(encounters)
    total_households = len(households)
    total_outputs = len(outputs)
    total_followups = len(followups)

    # Sync breakdown
    synced_encounters = sum(1 for e in encounters if e.sync_status == 'synced')
    offline_encounters = sum(1 for e in encounters if e.sync_status == 'offline_pending')

    # Output distribution
    output_dist = {
        "MATERNAL_HEALTH": 0,
        "IMMUNISATION": 0,
        "HOUSEHOLD_REGISTER": 0,
        "FOLLOW_UP": 0
    }
    for op in outputs:
        if op.programme_code in output_dist:
            output_dist[op.programme_code] += 1

    # Macro impact calculation
    total_onecapture_actions = 0
    total_traditional_actions = 0
    total_time_saved_sec = 0.0

    for e in encounters:
        impact = calculate_encounter_impact(e)
        total_onecapture_actions += impact["onecapture_actions"]
        total_traditional_actions += impact["traditional_actions"]
        total_time_saved_sec += impact["time_saved_seconds"]

    total_actions_avoided = max(0, total_traditional_actions - total_onecapture_actions)
    macro_reduction_pct = round((total_actions_avoided / total_traditional_actions * 100), 1) if total_traditional_actions > 0 else 0.0

    # Chart 1: Programme distribution
    programme_chart_data = [
        {"name": "Maternal Health", "code": "MATERNAL_HEALTH", "count": output_dist["MATERNAL_HEALTH"]},
        {"name": "Child Immunisation", "code": "IMMUNISATION", "count": output_dist["IMMUNISATION"]},
        {"name": "Household Register", "code": "HOUSEHOLD_REGISTER", "count": output_dist["HOUSEHOLD_REGISTER"]},
        {"name": "Follow-up Tracking", "code": "FOLLOW_UP", "count": output_dist["FOLLOW_UP"]}
    ]

    # Chart 2: Actions comparison
    actions_chart_data = [
        {"category": "Manual Actions", "Traditional": total_traditional_actions, "OneCapture": total_onecapture_actions, "Avoided": total_actions_avoided}
    ]

    # Chart 3: Sync stats
    sync_chart_data = [
        {"status": "Synced Online", "count": synced_encounters},
        {"status": "Offline Pending", "count": offline_encounters}
    ]

    return {
        "total_households": total_households,
        "total_encounters": total_encounters,
        "total_programme_outputs": total_outputs,
        "total_followups": total_followups,
        "synced_encounters": synced_encounters,
        "offline_encounters": offline_encounters,
        "total_onecapture_actions": total_onecapture_actions,
        "total_traditional_actions": total_traditional_actions,
        "total_actions_avoided": total_actions_avoided,
        "macro_reduction_percentage": macro_reduction_pct,
        "total_time_saved_minutes": round(total_time_saved_sec / 60.0, 1),
        "charts": {
            "programme_distribution": programme_chart_data,
            "actions_comparison": actions_chart_data,
            "sync_distribution": sync_chart_data
        },
        "methodology": "Prototype workflow measurement: compares the sum of simulated required fields across separate programme registers with fields captured in OneCapture."
    }
