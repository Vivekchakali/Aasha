import re
from datetime import datetime
from database import db

def validate_phone_number(phone):
    """
    Validates mobile phone number format.
    Accepts 10-digit Indian numbers starting with 6, 7, 8, or 9 (optionally with +91 or 0 prefix).
    Returns cleaned 10-digit string if valid, else None.
    """
    if not phone:
        return None
    cleaned = re.sub(r'[\s\-\(\)\+]', '', str(phone).strip())
    if cleaned.startswith('91') and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith('0') and len(cleaned) == 11:
        cleaned = cleaned[1:]
    
    if len(cleaned) == 10 and cleaned[0] in '6789' and cleaned.isdigit():
        return cleaned
    return None

def normalize_to_e164(phone):
    """
    Normalizes a valid 10-digit Indian mobile number to E.164 format (+91XXXXXXXXXX).
    Returns None if phone is invalid.
    """
    valid_10 = validate_phone_number(phone)
    if not valid_10:
        return None
    return f"+91{valid_10}"

def mask_phone_number(phone):
    """
    Masks a phone number for privacy in history, tables, and admin views.
    Formats e.g.:
    +919876543210 -> +91******3210
    9876543210 -> +91******3210
    """
    if not phone:
        return ""
    val = str(phone).strip()
    valid_10 = validate_phone_number(val)
    if valid_10:
        return f"+91******{valid_10[-4:]}"
    if len(val) >= 10:
        return f"{val[:2]}XXXX{val[-4:]}"
    elif len(val) > 4:
        return f"XXXX{val[-4:]}"
    return "XXXX"

class HouseholdMember(db.Model):
    __tablename__ = 'household_members'

    id = db.Column(db.Integer, primary_key=True)
    household_id = db.Column(db.Integer, db.ForeignKey('households.id', ondelete='CASCADE'), nullable=False)
    member_code = db.Column(db.String(50), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(20), nullable=False)  # Female, Male, Other
    relationship_to_head = db.Column(db.String(50), default='Member')  # Head, Spouse, Son, Daughter, Mother, Father, Other
    phone_number = db.Column(db.String(30), nullable=True)
    preferred_language = db.Column(db.String(10), default='en')  # en, te, hi
    sms_opt_in = db.Column(db.Boolean, default=True)
    sms_enabled = db.Column(db.Boolean, default=True)
    is_pregnant = db.Column(db.Boolean, default=False)
    pregnancy_month = db.Column(db.Integer, nullable=True)  # 1 to 9
    is_child = db.Column(db.Boolean, default=False)
    vaccination_status = db.Column(db.String(50), nullable=True)  # Complete, Partial, Pending
    iron_tablets_required = db.Column(db.Boolean, default=False)
    iron_tablets_collected = db.Column(db.Boolean, default=False)
    iron_tablets_date = db.Column(db.String(20), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self, mask_phone=False):
        raw_phone = self.phone_number
        display_phone = mask_phone_number(raw_phone) if mask_phone and raw_phone else raw_phone
        is_opted_in = self.sms_opt_in if self.sms_opt_in is not None else True
        is_sms_active = self.sms_enabled if self.sms_enabled is not None else is_opted_in
        return {
            'id': self.id,
            'household_id': self.household_id,
            'member_code': self.member_code,
            'full_name': self.full_name,
            'age': self.age,
            'gender': self.gender,
            'relationship_to_head': self.relationship_to_head,
            'phone_number': display_phone,
            'raw_phone': raw_phone,
            'e164_phone': normalize_to_e164(raw_phone),
            'masked_phone': mask_phone_number(raw_phone) if raw_phone else "",
            'preferred_language': self.preferred_language or 'en',
            'sms_opt_in': is_opted_in,
            'sms_enabled': is_sms_active,
            'is_pregnant': self.is_pregnant,
            'pregnancy_month': self.pregnancy_month,
            'is_child': self.is_child or (self.age is not None and self.age <= 5),
            'vaccination_status': self.vaccination_status,
            'iron_tablets_required': self.iron_tablets_required,
            'iron_tablets_collected': self.iron_tablets_collected,
            'iron_tablets_date': self.iron_tablets_date,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
