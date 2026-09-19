from datetime import datetime
from database import db

class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    household_id = db.Column(db.String(50), nullable=True)
    followup_id = db.Column(db.Integer, db.ForeignKey('followups.id'), nullable=True)
    notification_type = db.Column(db.String(30), nullable=False)  # 'upcoming', 'due_today', 'overdue', 'completed'
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "household_id": self.household_id,
            "followup_id": self.followup_id,
            "notification_type": self.notification_type,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
