from flask import Blueprint, jsonify
from datetime import datetime
from models.encounter import Encounter
from models.household import Household
from models.programme_output import ProgrammeOutput
from models.followup import FollowUp
from services.analytics import calculate_encounter_impact

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api')

@dashboard_bp.route('/dashboard', methods=['GET'])
@dashboard_bp.route('/dashboard/overview', methods=['GET'])
def get_dashboard_summary():
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    encounters = Encounter.query.all()
    today_visits = [e for e in encounters if e.visit_date == today_str]
    completed_visits = [e for e in encounters if e.status == 'processed']
    pending_followups = FollowUp.query.filter_by(status='pending').all()
    all_outputs = ProgrammeOutput.query.all()
    offline_pending = [e for e in encounters if e.sync_status == 'offline_pending']

    # Total manual actions avoided calculated across all processed encounters
    total_actions_avoided = 0
    for e in completed_visits:
        impact = calculate_encounter_impact(e)
        total_actions_avoided += impact["actions_avoided"]

    # Action required metrics for quick dashboard triage
    from models.household_member import HouseholdMember
    from datetime import date
    from database import db
    today = date.today()
    today_str_date = today.strftime("%Y-%m-%d")

    overdue_followups = [f for f in pending_followups if f.due_date and f.due_date < today_str_date]
    due_today_followups = [f for f in pending_followups if f.due_date == today_str_date]
    pending_iron_tablets = HouseholdMember.query.filter_by(iron_tablets_required=True, iron_tablets_collected=False).count()
    pending_vaccinations = HouseholdMember.query.filter(HouseholdMember.vaccination_status.in_(['Pending', 'Partial'])).count()
    high_risk_pregnant = HouseholdMember.query.filter(
        HouseholdMember.is_pregnant == True,
        db.or_(HouseholdMember.age < 18, HouseholdMember.age > 35)
    ).count()


    from models.sms_message import SMSMessage
    from services.sms_service import get_current_provider_name

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    sms_pending = SMSMessage.query.filter(SMSMessage.status.in_(['PENDING', 'pending', 'GENERATED', 'generated'])).count()
    sms_sent_today = SMSMessage.query.filter(
        SMSMessage.status.in_(['SENT', 'sent', 'simulated']),
        SMSMessage.created_at >= today_start
    ).count()
    sms_failed = SMSMessage.query.filter(SMSMessage.status.in_(['FAILED', 'failed'])).count()

    action_required = {
        "overdue_followups": len(overdue_followups),
        "due_today_followups": len(due_today_followups),
        "pending_iron_tablets": pending_iron_tablets,
        "pending_vaccinations": pending_vaccinations,
        "high_risk_pregnant": high_risk_pregnant,
        "sms_pending": sms_pending,
        "sms_sent_today": sms_sent_today,
        "sms_failed": sms_failed,
        "provider_mode": get_current_provider_name(),
        "total_urgent": len(overdue_followups) + len(due_today_followups) + pending_iron_tablets + sms_pending + sms_failed
    }

    # Recent encounters (latest 6)
    recent = Encounter.query.order_by(Encounter.created_at.desc()).limit(6).all()
    recent_list = []
    for r in recent:
        item = r.to_dict()
        item['output_codes'] = [o.programme_code for o in r.outputs]
        recent_list.append(item)

    return jsonify({
        "summary": {
            "today_visits": len(today_visits),
            "completed_visits": len(completed_visits),
            "pending_followups": len(pending_followups),
            "programme_records_generated": len(all_outputs),
            "manual_actions_avoided": total_actions_avoided,
            "offline_pending": len(offline_pending)
        },
        "action_required": action_required,
        "recent_encounters": recent_list,
        "disclaimer": "Prototype for demonstration only. Uses synthetic data. No real patient information is processed."
    }), 200

