from flask import Blueprint, request, jsonify
from database import db
from models.household import Household
from models.household_member import HouseholdMember
from models.encounter import Encounter
from models.followup import FollowUp
from auth_middleware import require_auth
from services.audit_service import log_audit_event

household_bp = Blueprint('households', __name__, url_prefix='/api/households')

def find_household(hh_identifier):
    if str(hh_identifier).isdigit():
        hh = Household.query.get(int(hh_identifier))
        if hh:
            return hh
    return Household.query.filter_by(household_id=str(hh_identifier).upper()).first()

def enrich_household_dict(hh, include_members=True):
    data = hh.to_dict(include_members=include_members)
    
    # Last visit
    last_enc = Encounter.query.filter_by(household_id=hh.household_id).order_by(Encounter.created_at.desc()).first()
    data['last_visit'] = last_enc.visit_date if last_enc else None
    data['total_visits'] = Encounter.query.filter_by(household_id=hh.household_id).count()

    # Pending follow-up
    pending_fu = FollowUp.query.filter_by(household_id=hh.household_id, status='pending').first()
    data['pending_followup'] = pending_fu.to_dict() if pending_fu else None
    data['has_pending_followup'] = bool(pending_fu)

    return data

@household_bp.route('', methods=['GET'])
def list_households():
    households = Household.query.order_by(Household.household_id).all()
    return jsonify({
        "households": [enrich_household_dict(h, include_members=True) for h in households]
    }), 200

@household_bp.route('', methods=['POST'])
@require_auth(allowed_roles=['asha'])
def create_household():
    data = request.get_json() or {}
    hh_id = str(data.get("household_id", "")).strip().upper()
    village = str(data.get("village_area", "")).strip()

    if not hh_id:
        return jsonify({"error": "Household ID is required"}), 400
    if not village:
        return jsonify({"error": "Village/Area is required"}), 400

    existing = Household.query.filter_by(household_id=hh_id).first()
    if existing:
        return jsonify({"error": f"Household {hh_id} already exists"}), 409

    household = Household(
        household_id=hh_id,
        village_area=village,
        head_of_family=data.get("head_of_family", ""),
        total_members=int(data.get("total_members", 1)),
        notes=data.get("notes", "")
    )
    db.session.add(household)
    db.session.commit()

    log_audit_event("household_created", user=getattr(request, 'current_user', None), record_id=hh_id, details={"village": village, "head": data.get("head_of_family")})

    return jsonify({
        "message": "Household created successfully",
        "household": enrich_household_dict(household, include_members=True)
    }), 201

@household_bp.route('/<identifier>', methods=['GET'])
def get_household_detail(identifier):
    hh = find_household(identifier)
    if not hh:
        return jsonify({"error": "Household not found"}), 404
    return jsonify({"household": enrich_household_dict(hh, include_members=True)}), 200

@household_bp.route('/<identifier>', methods=['PUT', 'PATCH'])
@require_auth(allowed_roles=['asha'])
def update_household(identifier):
    hh = find_household(identifier)
    if not hh:
        return jsonify({"error": "Household not found"}), 404

    data = request.get_json() or {}
    if "village_area" in data:
        hh.village_area = str(data["village_area"]).strip()
    if "head_of_family" in data:
        hh.head_of_family = str(data["head_of_family"]).strip()
    if "notes" in data:
        hh.notes = str(data["notes"]).strip()
    if "total_members" in data:
        try:
            hh.total_members = int(data["total_members"])
        except (ValueError, TypeError):
            pass

    db.session.commit()
    log_audit_event("household_updated", user=getattr(request, 'current_user', None), record_id=hh.household_id)

    return jsonify({
        "message": "Household updated successfully",
        "household": enrich_household_dict(hh, include_members=True)
    }), 200

@household_bp.route('/<identifier>/history', methods=['GET'])
def get_household_history(identifier):
    hh = find_household(identifier)
    if not hh:
        return jsonify({"error": "Household not found"}), 404

    encounters = Encounter.query.filter_by(household_id=hh.household_id).order_by(Encounter.created_at.desc()).all()
    
    enc_list = []
    for enc in encounters:
        enc_dict = enc.to_dict()
        enc_dict['outputs'] = [o.to_dict() for o in enc.outputs]
        enc_dict['output_codes'] = [o.programme_code for o in enc.outputs]
        enc_dict['followups'] = [f.to_dict() for f in enc.followups]
        enc_dict['member_name'] = (enc.raw_data or {}).get('member_name', '')
        enc_list.append(enc_dict)

    return jsonify({
        "household": enrich_household_dict(hh, include_members=True),
        "history": enc_list,
        "count": len(enc_list)
    }), 200

@household_bp.route('/<identifier>/members', methods=['GET'])
def get_household_members(identifier):
    hh = find_household(identifier)
    if not hh:
        return jsonify({"error": "Household not found"}), 404

    members = HouseholdMember.query.filter_by(household_id=hh.id).order_by(HouseholdMember.id).all()
    return jsonify({
        "household_id": hh.household_id,
        "count": len(members),
        "members": [m.to_dict() for m in members]
    }), 200

@household_bp.route('/<identifier>/members', methods=['POST'])
@require_auth(allowed_roles=['asha'])
def add_household_member(identifier):
    hh = find_household(identifier)
    if not hh:
        return jsonify({"error": "Household not found"}), 404

    data = request.get_json() or {}
    name = str(data.get("full_name", "")).strip()
    if not name:
        return jsonify({"error": "Full name is required"}), 400

    try:
        age = int(data.get("age", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Valid age is required"}), 400

    gender = str(data.get("gender", "Female")).strip().capitalize()
    if gender not in ["Female", "Male", "Other"]:
        gender = "Female"

    rel = str(data.get("relationship_to_head", "Member")).strip()
    phone = str(data.get("phone_number", "")).strip()

    is_pregnant = bool(data.get("is_pregnant", False))
    pregnancy_month = data.get("pregnancy_month")

    if is_pregnant:
        if gender == "Male":
            return jsonify({"error": "Validation Error: Pregnancy status cannot be assigned to male members."}), 400
        if age < 12 or age > 55:
            return jsonify({"error": f"Validation Error: Plausible maternal age is 12-55. Provided: {age}."}), 400
        if pregnancy_month is not None and pregnancy_month != "":
            try:
                m = int(pregnancy_month)
                if m < 1 or m > 9:
                    return jsonify({"error": "Validation Error: Pregnancy month must be between 1 and 9."}), 400
                pregnancy_month = m
            except ValueError:
                pregnancy_month = None
        else:
            pregnancy_month = None
    else:
        pregnancy_month = None

    is_child = bool(data.get("is_child", False)) or (age <= 5)
    vaccination_status = data.get("vaccination_status", "Complete" if is_child else None)

    existing_count = HouseholdMember.query.filter_by(household_id=hh.id).count()
    num_part = hh.household_id.replace("H", "")
    member_code = data.get("member_code") or f"M{num_part}-{existing_count + 1:02d}"

    member = HouseholdMember(
        household_id=hh.id,
        member_code=member_code,
        full_name=name,
        age=age,
        gender=gender,
        relationship_to_head=rel,
        phone_number=phone or None,
        is_pregnant=is_pregnant,
        pregnancy_month=pregnancy_month,
        is_child=is_child,
        vaccination_status=vaccination_status,
        notes=data.get("notes", "")
    )
    db.session.add(member)
    hh.total_members = existing_count + 1
    db.session.commit()

    log_audit_event("member_created", user=getattr(request, 'current_user', None), record_id=member_code, details={"name": name, "household": hh.household_id})

    return jsonify({
        "message": "Member added successfully",
        "member": member.to_dict()
    }), 201

@household_bp.route('/members/<int:member_id>', methods=['PUT', 'PATCH'])
@require_auth(allowed_roles=['asha'])
def update_household_member(member_id):
    member = HouseholdMember.query.get(member_id)
    if not member:
        return jsonify({"error": "Member not found"}), 404

    data = request.get_json() or {}

    if "full_name" in data:
        name = str(data["full_name"]).strip()
        if not name:
            return jsonify({"error": "Full name cannot be empty"}), 400
        member.full_name = name

    if "age" in data:
        try:
            member.age = int(data["age"])
            member.is_child = member.age <= 5
        except (ValueError, TypeError):
            return jsonify({"error": "Valid age required"}), 400

    if "gender" in data:
        member.gender = str(data["gender"]).strip().capitalize()

    if "relationship_to_head" in data:
        member.relationship_to_head = str(data["relationship_to_head"]).strip()

    if "phone_number" in data:
        member.phone_number = str(data["phone_number"]).strip() or None

    if "is_pregnant" in data:
        is_preg = bool(data["is_pregnant"])
        if is_preg and member.gender == "Male":
            return jsonify({"error": "Validation Error: Pregnancy status cannot be assigned to male members."}), 400
        member.is_pregnant = is_preg

    if "pregnancy_month" in data:
        pm = data["pregnancy_month"]
        if pm is not None and pm != "":
            try:
                m = int(pm)
                if m < 1 or m > 9:
                    return jsonify({"error": "Pregnancy month must be between 1 and 9"}), 400
                member.pregnancy_month = m
            except ValueError:
                pass
        else:
            member.pregnancy_month = None

    if "vaccination_status" in data:
        member.vaccination_status = data["vaccination_status"]

    if "notes" in data:
        member.notes = data["notes"]

    db.session.commit()
    log_audit_event("member_updated", user=getattr(request, 'current_user', None), record_id=member.member_code)

    return jsonify({
        "message": "Member updated successfully",
        "member": member.to_dict()
    }), 200

@household_bp.route('/members/<int:member_id>', methods=['DELETE'])
@require_auth(allowed_roles=['asha'])
def delete_household_member(member_id):
    member = HouseholdMember.query.get(member_id)
    if not member:
        return jsonify({"error": "Member not found"}), 404

    hh = Household.query.get(member.household_id)
    m_code = member.member_code
    db.session.delete(member)
    if hh:
        remaining = HouseholdMember.query.filter_by(household_id=hh.id).count()
        hh.total_members = max(0, remaining)
    db.session.commit()

    log_audit_event("member_deleted", user=getattr(request, 'current_user', None), record_id=m_code)

    return jsonify({"message": "Member deleted successfully", "member_id": member_id}), 200
