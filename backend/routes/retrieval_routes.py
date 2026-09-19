import csv
import io
from datetime import datetime, date
from flask import Blueprint, request, jsonify, Response, g
from sqlalchemy import or_, and_
from database import db
from models.household import Household
from models.household_member import HouseholdMember, mask_phone_number
from models.followup import FollowUp
from models.sms_message import SMSMessage
from models.programme_output import ProgrammeOutput
from services.audit_service import log_audit_event
from auth_middleware import require_auth

retrieval_bp = Blueprint('retrieval', __name__, url_prefix='/api')

def get_followup_urgency(due_date_str, status):
    if status == 'completed':
        return 'completed'
    try:
        due_d = datetime.strptime(str(due_date_str)[:10], '%Y-%m-%d').date()
        today = date.today()
        if due_d < today:
            return 'overdue'
        elif due_d == today:
            return 'due_today'
        else:
            return 'upcoming'
    except Exception:
        return 'upcoming'

def interpret_query(q_str, current_cat):
    if not q_str:
        return current_cat, {}, ""
    q_clean = q_str.strip().lower()
    cat = current_cat
    filters = {}
    
    matched_cat_triggers = []
    if current_cat in ('ALL', 'PEOPLE', None, ''):
        category_trigger_map = {
            'MATERNAL': ['pregnant', 'maternal', 'pregnancy', 'anc', 'trimester'],
            'CHILD': ['children', 'child', 'infants', 'infant', 'babies', 'baby', 'kids', 'kid', 'vaccination', 'vaccin', 'immunisation', 'immunis'],
            'IRON_TABLETS': ['iron tablets', 'iron tablet', 'iron', 'ifa', 'tablets', 'tablet'],
            'FOLLOW_UP': ['follow-ups', 'follow-up', 'followups', 'followup', 'follow ups', 'follow up', 'overdue', 'due today', 'reschedule'],
            'SMS': ['reminders', 'reminder', 'messages', 'message', 'sms', 'text'],
            'HOUSEHOLDS': ['households', 'household', 'census', 'families', 'family']
        }
        for target_cat, triggers in category_trigger_map.items():
            for trig in triggers:
                if trig in q_clean:
                    cat = target_cat
                    matched_cat_triggers.append(trig)
                    break
            if cat != current_cat:
                break

    urgency_triggers = []
    if 'overdue' in q_clean:
        filters['urgency'] = 'overdue'
        urgency_triggers.append('overdue')
    elif 'due today' in q_clean:
        filters['urgency'] = 'due_today'
        urgency_triggers.append('due today')
    elif 'today' in q_clean:
        filters['urgency'] = 'due_today'
        urgency_triggers.append('today')
    elif 'upcoming' in q_clean:
        filters['urgency'] = 'upcoming'
        urgency_triggers.append('upcoming')

    residue = q_clean
    for trig in matched_cat_triggers + urgency_triggers:
        residue = residue.replace(trig, ' ')
    
    stop_words = {'in', 'for', 'the', 'a', 'an', 'and', 'with', 'all', 'of', 'to', 'show', 'list', 'find', 'get'}
    tokens = [w for w in residue.split() if w not in stop_words]
    clean_residue = " ".join(tokens)

    return cat, filters, clean_residue

@retrieval_bp.route('/retrieval', methods=['GET'])
@require_auth(allowed_roles=['asha', 'admin'])
def retrieve_data():
    raw_cat = request.args.get('category', 'PEOPLE').upper()
    q_str = (request.args.get('q') or request.args.get('query') or '').strip()
    page = max(1, request.args.get('page', 1, type=int))
    limit = min(max(1, request.args.get('limit', 15, type=int)), 100)
    export_format = request.args.get('format', 'json').lower()
    
    cat, query_filters, query_text = interpret_query(q_str, raw_cat)
    
    # Calculate live system category counts for badges
    total_people = HouseholdMember.query.count()
    total_maternal = HouseholdMember.query.filter(HouseholdMember.is_pregnant == True).count()
    total_child = HouseholdMember.query.filter(HouseholdMember.age <= 5).count()
    total_followup = FollowUp.query.filter(FollowUp.status == 'pending').count()
    total_iron = HouseholdMember.query.filter(HouseholdMember.iron_tablets_required == True).count()
    total_sms = SMSMessage.query.count()
    total_households = Household.query.count()
    
    counts = {
        "PEOPLE": total_people,
        "MATERNAL": total_maternal,
        "CHILD": total_child,
        "FOLLOW_UP": total_followup,
        "IRON_TABLETS": total_iron,
        "SMS": total_sms,
        "HOUSEHOLDS": total_households
    }

    results = []
    total = 0

    if cat == 'PEOPLE':
        query = HouseholdMember.query.join(Household, HouseholdMember.household_id == Household.id)
        if query_text:
            query = query.filter(
                or_(
                    HouseholdMember.full_name.ilike(f'%{query_text}%'),
                    HouseholdMember.member_code.ilike(f'%{query_text}%'),
                    HouseholdMember.phone_number.ilike(f'%{query_text}%'),
                    Household.household_id.ilike(f'%{query_text}%'),
                    Household.village_area.ilike(f'%{query_text}%')
                )
            )
        preset = request.args.get('preset')
        if preset == 'pregnant' or request.args.get('is_pregnant') == 'true':
            query = query.filter(HouseholdMember.is_pregnant == True)
        elif preset == 'under2':
            query = query.filter(HouseholdMember.age <= 2)
        elif preset == 'newborn':
            query = query.filter(HouseholdMember.age <= 1)
        elif preset == 'elderly':
            query = query.filter(HouseholdMember.age >= 60)
        elif preset == 'health_concerns':
            query = query.filter(
                HouseholdMember.notes.isnot(None),
                HouseholdMember.notes != ''
            )
        if request.args.get('gender'):
            query = query.filter(HouseholdMember.gender == request.args.get('gender'))
        if request.args.get('min_age', type=int) is not None:
            query = query.filter(HouseholdMember.age >= request.args.get('min_age', type=int))
        if request.args.get('max_age', type=int) is not None:
            query = query.filter(HouseholdMember.age <= request.args.get('max_age', type=int))
        if request.args.get('village'):
            query = query.filter(Household.village_area.ilike(f'%{request.args.get("village")}%'))

        total = query.count()
        members = query.order_by(HouseholdMember.id.asc()).offset((page - 1) * limit).limit(limit).all() if export_format != 'csv' else query.order_by(HouseholdMember.id.asc()).all()
        
        for m in members:
            results.append({
                "id": m.id,
                "member_code": m.member_code,
                "full_name": m.full_name,
                "age": m.age,
                "gender": m.gender,
                "relationship": m.relationship_to_head,
                "household_id": m.household.household_id if m.household else '',
                "village_area": m.household.village_area if m.household else '',
                "phone_number": mask_phone_number(m.phone_number),
                "preferred_language": m.preferred_language or 'en',
                "sms_opt_in": m.sms_opt_in if m.sms_opt_in is not None else True,
                "is_pregnant": m.is_pregnant,
                "vaccination_status": m.vaccination_status or 'N/A',
                "iron_tablets_required": m.iron_tablets_required,
                "iron_tablets_collected": m.iron_tablets_collected,
                "iron_tablets_date": m.iron_tablets_date,
                "health_concerns": m.notes or 'None'
            })

    elif cat == 'MATERNAL':
        query = HouseholdMember.query.join(Household, HouseholdMember.household_id == Household.id).filter(HouseholdMember.is_pregnant == True)
        if query_text:
            query = query.filter(
                or_(
                    HouseholdMember.full_name.ilike(f'%{query_text}%'),
                    HouseholdMember.member_code.ilike(f'%{query_text}%'),
                    Household.household_id.ilike(f'%{query_text}%'),
                    Household.village_area.ilike(f'%{query_text}%')
                )
            )
        if request.args.get('village'):
            query = query.filter(Household.village_area.ilike(f'%{request.args.get("village")}%'))

        total = query.count()
        members = query.order_by(HouseholdMember.id.asc()).offset((page - 1) * limit).limit(limit).all() if export_format != 'csv' else query.order_by(HouseholdMember.id.asc()).all()
        
        for m in members:
            # Check high risk heuristics
            high_risk = m.age < 18 or m.age > 35
            results.append({
                "id": m.id,
                "member_code": m.member_code,
                "full_name": m.full_name,
                "age": m.age,
                "gender": m.gender,
                "household_id": m.household.household_id if m.household else '',
                "village_area": m.household.village_area if m.household else '',
                "phone_number": mask_phone_number(m.phone_number),
                "preferred_language": m.preferred_language or 'en',
                "sms_opt_in": m.sms_opt_in if m.sms_opt_in is not None else True,
                "is_pregnant": True,
                "pregnancy_details": f"Month {m.pregnancy_month}" if m.pregnancy_month else "ANC active",
                "high_risk": high_risk,
                "iron_tablets_required": m.iron_tablets_required,
                "iron_tablets_collected": m.iron_tablets_collected,
                "iron_tablets_date": m.iron_tablets_date
            })

    elif cat == 'CHILD':
        query = HouseholdMember.query.join(Household, HouseholdMember.household_id == Household.id).filter(HouseholdMember.age <= 5)
        if query_text:
            query = query.filter(
                or_(
                    HouseholdMember.full_name.ilike(f'%{query_text}%'),
                    HouseholdMember.member_code.ilike(f'%{query_text}%'),
                    Household.household_id.ilike(f'%{query_text}%'),
                    Household.village_area.ilike(f'%{query_text}%')
                )
            )
        if request.args.get('vaccination_status'):
            query = query.filter(HouseholdMember.vaccination_status == request.args.get('vaccination_status'))
        if request.args.get('max_age', type=int) is not None:
            query = query.filter(HouseholdMember.age <= request.args.get('max_age', type=int))
        if request.args.get('village'):
            query = query.filter(Household.village_area.ilike(f'%{request.args.get("village")}%'))

        total = query.count()
        members = query.order_by(HouseholdMember.id.asc()).offset((page - 1) * limit).limit(limit).all() if export_format != 'csv' else query.order_by(HouseholdMember.id.asc()).all()
        
        for m in members:
            results.append({
                "id": m.id,
                "member_code": m.member_code,
                "full_name": m.full_name,
                "age": m.age,
                "gender": m.gender,
                "household_id": m.household.household_id if m.household else '',
                "village_area": m.household.village_area if m.household else '',
                "phone_number": mask_phone_number(m.phone_number),
                "preferred_language": m.preferred_language or 'en',
                "sms_opt_in": m.sms_opt_in if m.sms_opt_in is not None else True,
                "vaccination_status": m.vaccination_status or 'Pending',
                "health_concerns": m.notes or 'None'
            })


    elif cat == 'FOLLOW_UP':
        query = FollowUp.query
        if query_text:
            query = query.filter(
                or_(
                    FollowUp.beneficiary_name.ilike(f'%{query_text}%'),
                    FollowUp.household_id.ilike(f'%{query_text}%'),
                    FollowUp.reason.ilike(f'%{query_text}%')
                )
            )
        if request.args.get('status'):
            query = query.filter(FollowUp.status == request.args.get('status'))
        if request.args.get('type') or request.args.get('followup_type'):
            ftype = request.args.get('type') or request.args.get('followup_type')
            query = query.filter(FollowUp.followup_type == ftype)
        if request.args.get('sms_status'):
            query = query.filter(FollowUp.sms_status == request.args.get('sms_status'))

        target_urgency = request.args.get('urgency') or query_filters.get('urgency')

        all_fus = query.order_by(FollowUp.due_date.asc()).all()
        filtered_fus = []
        for f in all_fus:
            urgency = get_followup_urgency(f.due_date, f.status)
            if target_urgency and urgency != target_urgency:
                continue
            item = f.to_dict()
            item['urgency'] = urgency
            filtered_fus.append(item)

        total = len(filtered_fus)
        results = filtered_fus[(page - 1) * limit : page * limit] if export_format != 'csv' else filtered_fus

    elif cat == 'IRON_TABLETS':
        query = HouseholdMember.query.join(Household, HouseholdMember.household_id == Household.id).filter(HouseholdMember.iron_tablets_required == True)
        if query_text:
            query = query.filter(
                or_(
                    HouseholdMember.full_name.ilike(f'%{query_text}%'),
                    Household.household_id.ilike(f'%{query_text}%'),
                    Household.village_area.ilike(f'%{query_text}%')
                )
            )
        coll = request.args.get('collected') or request.args.get('iron_tablets_collected')
        if coll is not None and coll != '':
            is_coll = (coll.lower() == 'true')
            query = query.filter(HouseholdMember.iron_tablets_collected == is_coll)
        if request.args.get('village'):
            query = query.filter(Household.village_area.ilike(f'%{request.args.get("village")}%'))

        total = query.count()
        members = query.order_by(HouseholdMember.id.asc()).offset((page - 1) * limit).limit(limit).all() if export_format != 'csv' else query.order_by(HouseholdMember.id.asc()).all()

        for m in members:
            results.append({
                "id": m.id,
                "full_name": m.full_name,
                "age": m.age,
                "gender": m.gender,
                "is_pregnant": m.is_pregnant,
                "household_id": m.household.household_id if m.household else '',
                "village_area": m.household.village_area if m.household else '',
                "phone_number": mask_phone_number(m.phone_number),
                "preferred_language": m.preferred_language or 'en',
                "sms_opt_in": m.sms_opt_in if m.sms_opt_in is not None else True,
                "iron_tablets_required": True,
                "iron_tablets_collected": m.iron_tablets_collected,
                "iron_tablets_date": m.iron_tablets_date
            })

    elif cat == 'SMS':
        query = SMSMessage.query
        if query_text:
            query = query.filter(
                or_(
                    SMSMessage.recipient_name.ilike(f'%{query_text}%'),
                    SMSMessage.recipient_phone.ilike(f'%{query_text}%'),
                    SMSMessage.household_id.ilike(f'%{query_text}%'),
                    SMSMessage.message_body.ilike(f'%{query_text}%')
                )
            )
        status_param = request.args.get('status')
        if status_param and status_param.upper() != 'ALL':
            if status_param.lower() == 'sent':
                query = query.filter(SMSMessage.status.in_(['SENT', 'sent', 'simulated']))
            else:
                query = query.filter(SMSMessage.status.ilike(status_param))
        if request.args.get('template_type'):
            query = query.filter(SMSMessage.template_type == request.args.get('template_type'))
        if request.args.get('reminder_type'):
            query = query.filter(or_(
                SMSMessage.reminder_type == request.args.get('reminder_type'),
                SMSMessage.template_type == request.args.get('reminder_type')
            ))
        if request.args.get('language'):
            query = query.filter(SMSMessage.language == request.args.get('language'))
        if request.args.get('provider'):
            query = query.filter(SMSMessage.provider == request.args.get('provider'))
        if request.args.get('household_id'):
            query = query.filter(SMSMessage.household_id == request.args.get('household_id'))
        if request.args.get('member_id'):
            query = query.filter(SMSMessage.member_id == request.args.get('member_id', type=int))

        total = query.count()
        messages = query.order_by(SMSMessage.created_at.desc()).offset((page - 1) * limit).limit(limit).all() if export_format != 'csv' else query.order_by(SMSMessage.created_at.desc()).all()

        for msg in messages:
            results.append(msg.to_dict(mask_phone=True))

    elif cat == 'HOUSEHOLDS':
        query = Household.query
        if query_text:
            query = query.filter(
                or_(
                    Household.household_id.ilike(f'%{query_text}%'),
                    Household.head_of_household.ilike(f'%{query_text}%'),
                    Household.village_area.ilike(f'%{query_text}%')
                )
            )
        if request.args.get('village'):
            query = query.filter(Household.village_area.ilike(f'%{request.args.get("village")}%'))
        if request.args.get('vulnerable') == 'true':
            query = query.filter(Household.vulnerable_status == True)

        total = query.count()
        hh_list = query.order_by(Household.id.asc()).offset((page - 1) * limit).limit(limit).all() if export_format != 'csv' else query.order_by(Household.id.asc()).all()

        for hh in hh_list:
            results.append(hh.to_dict())

    # Log query audit
    try:
        user_id = getattr(g, 'user_id', None)
        username = getattr(g, 'username', 'asha_worker')
        role = getattr(g, 'user_role', 'asha')
        log_audit_event(
            action="retrieval_queried",
            user_id=user_id,
            username=username,
            role=role,
            record_id=None,
            details={"category": cat, "query": q_str, "total_matches": total}
        )
    except Exception:
        pass

    # If CSV Export requested
    if export_format == 'csv':
        try:
            log_audit_event(
                action="retrieval_exported",
                user_id=getattr(g, 'user_id', None),
                username=getattr(g, 'username', 'asha_worker'),
                role=getattr(g, 'user_role', 'asha'),
                record_id=None,
                details={"category": cat, "count": len(results)}
            )
        except Exception:
            pass

        output = io.StringIO()
        if results:
            fieldnames = list(results[0].keys())
            # Ensure raw phone numbers never appear in export
            if 'raw_phone' in fieldnames:
                fieldnames.remove('raw_phone')
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for row in results:
                clean_row = {k: v for k, v in row.items() if k != 'raw_phone'}
                writer.writerow(clean_row)
        else:
            output.write("No records found for the specified query and filters.\n")

        filename = f"asha_{cat.lower()}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment;filename={filename}"}
        )

    return jsonify({
        "category": cat,
        "query": q_str,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if limit else 1,
        "results": results,
        "counts": counts
    }), 200

@retrieval_bp.route('/retrieval/export', methods=['GET'])
@require_auth(allowed_roles=['asha', 'admin'])
def export_data():
    # Alias to export directly as CSV
    from flask import redirect
    params = dict(request.args)
    params['format'] = 'csv'
    from urllib.parse import urlencode
    return retrieve_data()
