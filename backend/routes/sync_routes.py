import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from database import db
from models.encounter import Encounter
from models.sync_record import SyncRecord
from services.normalization import normalize_encounter
from services.mapping_engine import run_mapping_engine
from models.programme_output import ProgrammeOutput
from models.followup import FollowUp
from models.mapping_log import MappingLog

sync_bp = Blueprint('sync', __name__, url_prefix='/api')

@sync_bp.route('/sync', methods=['POST'])
def sync_offline_encounters():
    """
    Synchronizes encounters captured while offline.
    Payload: { "encounters": [ { "client_uuid": "...", "data": {...} } ] }
    """
    body = request.get_json() or {}
    items = body.get('encounters', [])
    
    if not items:
        return jsonify({"message": "No offline items provided for synchronization", "synced_count": 0}), 200

    synced_results = []
    
    for item in items:
        client_uuid = item.get('client_uuid', str(uuid.uuid4()))
        raw_data = item.get('data', {})
        duration = float(item.get('duration_seconds', 30.0))
        
        normalized, errors = normalize_encounter(raw_data)
        if errors:
            synced_results.append({
                "client_uuid": client_uuid,
                "status": "failed",
                "reason": "; ".join(errors)
            })
            continue

        enc_id = f"ENC-OFFLINE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        
        encounter = Encounter(
            encounter_id=enc_id,
            household_id=normalized['household_id'],
            visit_date=normalized['visit_date'],
            capture_mode='offline_synced',
            status='processed',
            duration_seconds=duration,
            sync_status='synced'
        )
        encounter.raw_data = raw_data
        encounter.normalized_data = normalized
        db.session.add(encounter)
        db.session.flush()

        # Run mapping engine
        mapping_result = run_mapping_engine(normalized)
        for prog in mapping_result['generated_programmes']:
            po = ProgrammeOutput(
                encounter_id=encounter.id,
                programme_code=prog['code'],
                programme_name=prog['name']
            )
            po.payload = prog['payload']
            db.session.add(po)

        for m in mapping_result['mappings']:
            ml = MappingLog(
                encounter_id=encounter.id,
                rule_name=m['rule_name'],
                source_field=m['source_field'],
                target_programme=m['target_programme'],
                target_field=m['target_field'],
                value_transformed=str(m['value'])
            )
            db.session.add(ml)

        followup_prog = next((p for p in mapping_result['generated_programmes'] if p['code'] == 'FOLLOW_UP'), None)
        if followup_prog:
            fu_payload = followup_prog['payload']
            fu = FollowUp(
                encounter_id=encounter.id,
                household_id=encounter.household_id,
                due_date=fu_payload.get('follow_up_date', 'Scheduled'),
                reason=fu_payload.get('reason', 'Routine follow-up'),
                status='pending',
                notes=fu_payload.get('notes', '')
            )
            db.session.add(fu)

        # Record Sync log
        sr = SyncRecord(
            encounter_id=encounter.id,
            client_uuid=client_uuid,
            sync_mode='batch_offline',
            status='synced'
        )
        db.session.add(sr)

        synced_results.append({
            "client_uuid": client_uuid,
            "encounter_id": encounter.encounter_id,
            "household_id": encounter.household_id,
            "programmes_generated": len(mapping_result['generated_programmes']),
            "status": "synced"
        })

    db.session.commit()

    return jsonify({
        "message": f"Successfully synchronized {len(synced_results)} encounters",
        "synced_count": len(synced_results),
        "results": synced_results
    }), 200
