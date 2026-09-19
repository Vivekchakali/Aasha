import io
import csv
import json
from flask import Blueprint, request, jsonify, Response
from models.programme_output import ProgrammeOutput
from models.encounter import Encounter

output_bp = Blueprint('outputs', __name__, url_prefix='/api')

def flatten_dict(d, parent_key='', sep='.'):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        elif isinstance(v, list):
            items.append((new_key, json.dumps(v)))
        else:
            items.append((new_key, v))
    return dict(items)

@output_bp.route('/outputs/<int:id>/export', methods=['GET'])
def export_output(id):
    output = ProgrammeOutput.query.get_or_404(id)
    fmt = request.args.get('format', 'json').lower()
    payload = output.payload

    if fmt == 'csv':
        flat = flatten_dict(payload)
        si = io.StringIO()
        cw = csv.writer(si)
        cw.writerow(['field', 'value'])
        for k, v in flat.items():
            cw.writerow([k, v])
        
        output_data = si.getvalue()
        return Response(
            output_data,
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment;filename={output.programme_code}_{output.id}.csv"}
        )

    return jsonify({
        "programme_code": output.programme_code,
        "programme_name": output.programme_name,
        "generated_at": output.generated_at.isoformat() if output.generated_at else None,
        "payload": payload
    }), 200

@output_bp.route('/encounters/<int:id>/export-all', methods=['GET'])
def export_all_encounter_outputs(id):
    encounter = Encounter.query.get_or_404(id)
    fmt = request.args.get('format', 'json').lower()
    outputs = encounter.outputs

    bundle = {
        "encounter_id": encounter.encounter_id,
        "household_id": encounter.household_id,
        "visit_date": encounter.visit_date,
        "generated_at": encounter.updated_at.isoformat() if encounter.updated_at else None,
        "total_programme_records": len(outputs),
        "disclaimer": "ASHA OneCapture Prototype Output Bundle — Synthetic Data Only",
        "records": {o.programme_code: o.payload for o in outputs}
    }

    if fmt == 'csv':
        si = io.StringIO()
        cw = csv.writer(si)
        cw.writerow(['programme_code', 'field', 'value'])
        for o in outputs:
            flat = flatten_dict(o.payload)
            for k, v in flat.items():
                cw.writerow([o.programme_code, k, v])

        return Response(
            si.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment;filename=ASHA_OneCapture_{encounter.household_id}_AllRecords.csv"}
        )

    return jsonify(bundle), 200
