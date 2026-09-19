import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from database import db
from models.encounter import Encounter
from models.household import Household
from models.household_member import HouseholdMember
from models.programme_output import ProgrammeOutput
from models.followup import FollowUp
from models.mapping_log import MappingLog
from models.sync_record import SyncRecord
from services.normalization import normalize_encounter
from services.mapping_engine import run_mapping_engine
from services.analytics import calculate_encounter_impact
from services.voice_parser import parse_voice_transcript
from auth_middleware import require_auth
from services.audit_service import log_audit_event

encounter_bp = Blueprint('encounters', __name__, url_prefix='/api')

@encounter_bp.route('/encounters', methods=['GET'])
def list_encounters():
    status = request.args.get('status')
    household_id = request.args.get('household_id')

    query = Encounter.query
    if status:
        query = query.filter_by(status=status)
    if household_id:
        query = query.filter_by(household_id=household_id.upper())

    encounters = query.order_by(Encounter.created_at.desc()).all()
    results = []
    for e in encounters:
        d = e.to_dict()
        d['outputs'] = [o.to_dict() for o in e.outputs]
        d['output_codes'] = [o.programme_code for o in e.outputs]
        d['followups'] = [f.to_dict() for f in e.followups]
        d['followup_status'] = e.followups[0].status if e.followups else 'None'
        d['member_name'] = (e.raw_data or {}).get('member_name', '')
        results.append(d)

    return jsonify({"encounters": results}), 200

@encounter_bp.route('/encounters', methods=['POST'])
@require_auth(allowed_roles=['asha'])
def create_encounter():
    data = request.get_json() or {}
    
    # Normalize before storing
    normalized, errors = normalize_encounter(data)
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    enc_id = f"ENC-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    
    duration = float(data.get('duration_seconds', 0.0))
    capture_mode = data.get('capture_mode', 'manual')
    sync_status = data.get('sync_status', 'synced')

    user = getattr(request, 'current_user', None)

    encounter = Encounter(
        encounter_id=enc_id,
        household_id=normalized['household_id'],
        user_id=user.id if user else None,
        visit_date=normalized['visit_date'],
        capture_mode=capture_mode,
        status='draft',
        duration_seconds=duration,
        sync_status=sync_status
    )
    encounter.raw_data = data
    encounter.normalized_data = normalized

    db.session.add(encounter)
    db.session.commit()

    log_audit_event("visit_created", user=user, record_id=enc_id, details={"household_id": normalized['household_id']})

    return jsonify({
        "message": "Encounter created in draft status",
        "encounter": encounter.to_dict()
    }), 201

@encounter_bp.route('/encounters/<int:id>', methods=['GET'])
def get_encounter(id):
    encounter = Encounter.query.get_or_404(id)
    impact = calculate_encounter_impact(encounter)
    data = encounter.to_dict()
    data['outputs'] = [o.to_dict() for o in encounter.outputs]
    data['output_codes'] = [o.programme_code for o in encounter.outputs]
    data['followups'] = [f.to_dict() for f in encounter.followups]
    data['member_name'] = (encounter.raw_data or {}).get('member_name', '')
    data['impact'] = impact
    return jsonify({"encounter": data}), 200

@encounter_bp.route('/encounters/<int:id>/process', methods=['POST'])
@require_auth(allowed_roles=['asha'])
def process_encounter(id):
    encounter = Encounter.query.get_or_404(id)
    user = getattr(request, 'current_user', None)
    
    # 1. Re-normalize to ensure integrity
    raw = encounter.raw_data or {}
    normalized, errors = normalize_encounter(raw)
    if errors:
        return jsonify({"error": "Normalization failed", "details": errors}), 400
    encounter.normalized_data = normalized

    # 2. Clear any previous outputs/mappings for idempotency
    ProgrammeOutput.query.filter_by(encounter_id=encounter.id).delete()
    MappingLog.query.filter_by(encounter_id=encounter.id).delete()
    FollowUp.query.filter_by(encounter_id=encounter.id).delete()

    # 3. Run Rule-based Mapping Engine SILENTLY
    mapping_result = run_mapping_engine(normalized)
    generated_progs = mapping_result['generated_programmes']
    mappings = mapping_result['mappings']

    # 4. Save Programme Outputs / Reports
    saved_outputs = []
    for prog in generated_progs:
        po = ProgrammeOutput(
            encounter_id=encounter.id,
            programme_code=prog['code'],
            programme_name=prog['name']
        )
        po.payload = prog['payload']
        db.session.add(po)
        saved_outputs.append(po)

    # 5. Save Internal Mapping Logs
    for m in mappings:
        ml = MappingLog(
            encounter_id=encounter.id,
            rule_name=m['rule_name'],
            source_field=m['source_field'],
            target_programme=m['target_programme'],
            target_field=m['target_field'],
            value_transformed=str(m['value'])
        )
        db.session.add(ml)

    # 6. Save FollowUp if triggered
    followup_prog = next((p for p in generated_progs if p['code'] == 'FOLLOW_UP'), None)
    if followup_prog:
        fu_payload = followup_prog['payload']
        target_member_id = normalized.get('member_id')
        hh_obj = Household.query.filter_by(household_id=encounter.household_id).first()
        m_obj = None

        if not target_member_id and normalized.get('member_name') and hh_obj:
            m_match = HouseholdMember.query.filter_by(household_id=hh_obj.id, full_name=normalized.get('member_name')).first()
            if m_match:
                target_member_id = m_match.id
                m_obj = m_match
            else:
                prefix = encounter.household_id.replace('H', '') if encounter.household_id else '1024'
                mem_count = HouseholdMember.query.filter_by(household_id=hh_obj.id).count()
                m_code = f"M{prefix}-{mem_count + 1:02d}"
                new_mem = HouseholdMember(
                    household_id=hh_obj.id,
                    member_code=m_code,
                    full_name=normalized.get('member_name'),
                    gender=normalized.get('gender') or ('Female' if normalized.get('pregnant') else 'Other'),
                    age=normalized.get('maternal_age') or 25,
                    relationship_to_head=normalized.get('relationship_to_head') or 'Beneficiary',
                    phone_number=normalized.get('phone_number'),
                    preferred_language=normalized.get('preferred_language', 'en'),
                    sms_opt_in=True,
                    is_pregnant=normalized.get('pregnant', False),
                    pregnancy_month=normalized.get('pregnancy_month'),
                    iron_tablets_required=normalized.get('iron_tablets_required', False),
                    iron_tablets_collected=normalized.get('iron_tablets_collected', False),
                    notes=normalized.get('general_observations') or 'Encounter intake record'
                )
                db.session.add(new_mem)
                db.session.flush()
                target_member_id = new_mem.id
                m_obj = new_mem
        elif target_member_id:
            m_obj = HouseholdMember.query.get(target_member_id)

        if m_obj:
            if normalized.get('phone_number'):
                m_obj.phone_number = normalized.get('phone_number')
            if normalized.get('iron_tablets_required') is not None:
                m_obj.iron_tablets_required = bool(normalized.get('iron_tablets_required'))
            if normalized.get('iron_tablets_collected') is not None:
                m_obj.iron_tablets_collected = bool(normalized.get('iron_tablets_collected'))
            if normalized.get('preferred_language'):
                m_obj.preferred_language = normalized.get('preferred_language')

        reason_str = fu_payload.get('reason', 'Routine follow-up')
        reason_lower = reason_str.lower()
        followup_type = 'general'
        if 'vaccin' in reason_lower or 'dose' in reason_lower:
            followup_type = 'vaccination'
        elif 'iron' in reason_lower or 'tablet' in reason_lower or 'ifa' in reason_lower:
            followup_type = 'iron_tablets'
        elif 'medicat' in reason_lower or 'symptom' in reason_lower:
            followup_type = 'medication'

        fu = FollowUp(
            encounter_id=encounter.id,
            household_id=encounter.household_id,
            member_id=target_member_id,
            beneficiary_name=normalized.get('member_name'),
            followup_type=followup_type,
            due_date=fu_payload.get('follow_up_date', 'Scheduled'),
            reason=reason_str,
            status='pending',
            sms_status='pending',
            notes=normalized.get('sms_note') or fu_payload.get('notes', '')
        )
        db.session.add(fu)
        db.session.flush()

        # Auto-dispatch simulated SMS if requested and phone number available
        actual_phone = normalized.get('phone_number') or (m_obj.phone_number if m_obj else None)
        if normalized.get('send_sms_on_confirm') and actual_phone:
            from services.sms_service import send_or_simulate_sms
            send_or_simulate_sms(
                recipient_phone=actual_phone,
                recipient_name=normalized.get('member_name') or (m_obj.full_name if m_obj else 'Beneficiary'),
                template_type=followup_type,
                language=normalized.get('preferred_language') or (m_obj.preferred_language if m_obj else 'en'),
                context={
                    'name': normalized.get('member_name') or (m_obj.full_name if m_obj else 'Beneficiary'),
                    'due_date': fu.due_date,
                    'reason': fu.notes or fu.reason
                },
                member_id=target_member_id,
                followup_id=fu.id,
                household_id=encounter.household_id,
                user_info={
                    'user_id': user.id if user else None,
                    'username': user.username if user else 'asha_worker',
                    'role': 'asha'
                }
            )


    encounter.status = 'processed'
    db.session.commit()

    log_audit_event("visit_confirmed", user=user, record_id=encounter.encounter_id, details={"reports_generated": len(saved_outputs)})
    log_audit_event("reports_generated", user=user, record_id=encounter.encounter_id, details={"codes": [p['code'] for p in generated_progs]})

    # 7. Compute prototype impact
    impact = calculate_encounter_impact(encounter)

    return jsonify({
        "message": f"Encounter confirmed. {len(saved_outputs)} programme reports generated successfully.",
        "encounter": encounter.to_dict(),
        "generated_outputs": [o.to_dict() for o in saved_outputs],
        "mapping_stats": {
            "source_fields_count": mapping_result['source_fields_count'],
            "mapped_fields_count": mapping_result['mapped_fields_count'],
            "unmapped_fields": mapping_result['unmapped_fields'],
            "total_rules_triggered": len(generated_progs)
        },
        "flow_graph": mapping_result['flow_graph'],
        "impact": impact
    }), 200

@encounter_bp.route('/encounters/<int:id>/outputs', methods=['GET'])
@encounter_bp.route('/encounters/<int:id>/reports', methods=['GET'])
def get_encounter_outputs(id):
    encounter = Encounter.query.get_or_404(id)
    outputs = [o.to_dict() for o in encounter.outputs]
    return jsonify({
        "encounter_id": encounter.encounter_id,
        "household_id": encounter.household_id,
        "output_count": len(outputs),
        "outputs": outputs,
        "reports": outputs
    }), 200

@encounter_bp.route('/encounters/<int:id>/mappings', methods=['GET'])
def get_encounter_mappings(id):
    encounter = Encounter.query.get_or_404(id)
    normalized = encounter.normalized_data or {}
    mapping_result = run_mapping_engine(normalized)
    
    logs = [log.to_dict() for log in encounter.mapping_logs]

    return jsonify({
        "encounter_id": encounter.encounter_id,
        "household_id": encounter.household_id,
        "source_fields_count": mapping_result['source_fields_count'],
        "mapped_fields_count": mapping_result['mapped_fields_count'],
        "unmapped_fields": mapping_result['unmapped_fields'],
        "mapping_logs": logs,
        "flow_graph": mapping_result['flow_graph']
    }), 200

@encounter_bp.route('/voice/parse', methods=['POST'])
def parse_voice():
    data = request.get_json() or {}
    transcript = data.get('transcript', '')
    if not transcript:
        return jsonify({"error": "Transcript text is required"}), 400

    preferred_lang = data.get('language') or data.get('lang')
    result = parse_voice_transcript(transcript, preferred_lang=preferred_lang)
    return jsonify(result), 200
