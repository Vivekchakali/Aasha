from datetime import datetime
from database import db

class Household(db.Model):
    __tablename__ = 'households'

    id = db.Column(db.Integer, primary_key=True)
    household_id = db.Column(db.String(50), unique=True, nullable=False)
    village_area = db.Column(db.String(120), nullable=False)
    head_of_family = db.Column(db.String(120), nullable=True)
    total_members = db.Column(db.Integer, default=1)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    members = db.relationship('HouseholdMember', backref='household', cascade='all, delete-orphan', lazy=True)

    def to_dict(self, include_members=True):
        member_list = [m.to_dict() for m in self.members] if self.members else []
        return {
            "id": self.id,
            "household_id": self.household_id,
            "village_area": self.village_area,
            "head_of_family": self.head_of_family,
            "total_members": len(member_list) if member_list else self.total_members,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "members": member_list if include_members else []
        }
