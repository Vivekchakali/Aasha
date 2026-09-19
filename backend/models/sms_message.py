from datetime import datetime
from database import db
from models.household_member import mask_phone_number

class SMSMessage(db.Model):
    __tablename__ = 'sms_messages'

    id = db.Column(db.Integer, primary_key=True)
    household_id = db.Column(db.String(50), nullable=True)
    member_id = db.Column(db.Integer, db.ForeignKey('household_members.id', ondelete='SET NULL'), nullable=True)
    followup_id = db.Column(db.Integer, db.ForeignKey('followups.id', ondelete='SET NULL'), nullable=True)
    recipient_name = db.Column(db.String(120), nullable=False)
    recipient_phone = db.Column(db.String(30), nullable=False)
    reminder_type = db.Column(db.String(50), nullable=True)  # 'vaccination', 'iron_tablets', 'medication', 'general'
    template_type = db.Column(db.String(50), nullable=True)  # Backward compatible alias
    template_key = db.Column(db.String(50), nullable=True)
    language = db.Column(db.String(10), default='en')        # 'en', 'te', 'hi'
    message_body = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), default='PENDING')     # 'NOT_REQUIRED', 'PENDING', 'GENERATED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED'
    provider = db.Column(db.String(30), default='mock')      # 'mock', 'twilio'
    provider_message_id = db.Column(db.String(100), nullable=True)
    attempt_count = db.Column(db.Integer, default=1)
    simulated_flag = db.Column(db.Boolean, default=True)
    failure_reason = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sent_at = db.Column(db.DateTime, nullable=True)
    delivered_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    member = db.relationship('HouseholdMember', backref=db.backref('sms_messages', lazy=True))
    followup = db.relationship('FollowUp', backref=db.backref('sms_messages', lazy=True))

    def to_dict(self, mask_phone=True):
        phone = self.recipient_phone
        displayed_phone = mask_phone_number(phone) if mask_phone else phone
        rtype = self.reminder_type or self.template_type or 'general'
        
        # Normalize status to standard uppercase representation while retaining backwards compat
        raw_status = (self.status or 'PENDING').strip()
        if raw_status.lower() == 'simulated':
            std_status = 'SENT'
        else:
            std_status = raw_status.upper()

        provider_name = self.provider or ('mock' if self.simulated_flag else 'twilio')

        return {
            'id': self.id,
            'household_id': self.household_id,
            'member_id': self.member_id,
            'followup_id': self.followup_id,
            'recipient_name': self.recipient_name,
            'recipient_phone': displayed_phone,
            'raw_phone': phone if not mask_phone else None,
            'reminder_type': rtype,
            'template_type': rtype,
            'template_key': self.template_key or rtype,
            'language': self.language or 'en',
            'message_body': self.message_body,
            'status': std_status,
            'provider': provider_name,
            'provider_message_id': self.provider_message_id,
            'attempt_count': self.attempt_count or 1,
            'simulated_flag': self.simulated_flag if self.simulated_flag is not None else (provider_name == 'mock'),
            'failure_reason': self.failure_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# Canonical alias
SMSLog = SMSMessage

def ensure_sms_schema(db_engine):
    """
    Idempotent schema check to ensure newly added columns exist in existing SQLite databases.
    """
    try:
        with db_engine.connect() as conn:
            result = conn.execute(db.text("PRAGMA table_info(sms_messages)"))
            existing_cols = {row[1] for row in result.fetchall()}
            
            columns_to_add = [
                ("reminder_type", "VARCHAR(50)"),
                ("template_key", "VARCHAR(50)"),
                ("provider", "VARCHAR(30) DEFAULT 'mock'"),
                ("provider_message_id", "VARCHAR(100)"),
                ("attempt_count", "INTEGER DEFAULT 1"),
                ("delivered_at", "DATETIME"),
                ("updated_at", "DATETIME")
            ]
            
            for col_name, col_type in columns_to_add:
                if col_name not in existing_cols:
                    conn.execute(db.text(f"ALTER TABLE sms_messages ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
    except Exception as e:
        # If table doesn't exist yet or other DB, SQLAlchemy create_all handles it
        pass
