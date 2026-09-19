from datetime import datetime
from database import db

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    username = db.Column(db.String(80), nullable=True)
    role = db.Column(db.String(20), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    record_id = db.Column(db.String(100), nullable=True)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.username,
            "role": self.role,
            "action": self.action,
            "record_id": self.record_id,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
