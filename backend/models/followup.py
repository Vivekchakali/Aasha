from datetime import datetime
from database import db

class FollowUp(db.Model):
    __tablename__ = 'followups'

    id = db.Column(db.Integer, primary_key=True)
    encounter_id = db.Column(db.Integer, db.ForeignKey('encounters.id'), nullable=True)
    household_id = db.Column(db.String(50), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey('household_members.id', ondelete='SET NULL'), nullable=True)
    beneficiary_name = db.Column(db.String(120), nullable=True)
    followup_type = db.Column(db.String(50), default='general')  # 'vaccination', 'iron_tablets', 'medication', 'general'
    due_date = db.Column(db.String(20), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'completed'
    sms_status = db.Column(db.String(30), default='none')  # 'none', 'pending', 'simulated', 'sent', 'failed', 'cancelled'
    last_reminder_at = db.Column(db.DateTime, nullable=True)
    reminder_count = db.Column(db.Integer, default=0)
    next_reminder_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    member = db.relationship('HouseholdMember', backref=db.backref('followups', lazy=True))

    def to_dict(self):
        phone = None
        masked_phone = None
        preferred_language = 'en'
        sms_opt_in = True
        if self.member:
            phone = self.member.phone_number
            preferred_language = self.member.preferred_language or 'en'
            sms_opt_in = self.member.sms_opt_in if self.member.sms_opt_in is not None else True
            from models.household_member import mask_phone_number
            masked_phone = mask_phone_number(phone) if phone else None

        raw_sms_status = (self.sms_status or 'none').lower()
        std_sms_status = 'SENT' if raw_sms_status == 'simulated' else raw_sms_status.upper()
        sms_eligible = (self.status == 'pending') and bool(phone) and sms_opt_in

        return {
            "id": self.id,
            "encounter_id": self.encounter_id,
            "household_id": self.household_id,
            "member_id": self.member_id,
            "beneficiary_name": self.beneficiary_name,
            "phone_number": phone,
            "masked_phone": masked_phone,
            "preferred_language": preferred_language,
            "sms_opt_in": sms_opt_in,
            "sms_enabled": sms_opt_in,
            "sms_required": sms_eligible,
            "followup_type": self.followup_type or 'general',
            "due_date": self.due_date,
            "reason": self.reason,
            "status": self.status,
            "sms_status": std_sms_status,
            "last_reminder_at": self.last_reminder_at.isoformat() if self.last_reminder_at else None,
            "last_sms_sent_at": self.last_reminder_at.isoformat() if self.last_reminder_at else None,
            "reminder_count": self.reminder_count or 0,
            "next_reminder_at": self.next_reminder_at.isoformat() if self.next_reminder_at else None,
            "next_sms_due_at": self.next_reminder_at.isoformat() if self.next_reminder_at else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }

