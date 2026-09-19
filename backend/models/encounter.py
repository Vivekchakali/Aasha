import json
from datetime import datetime
from database import db

class Encounter(db.Model):
    __tablename__ = 'encounters'

    id = db.Column(db.Integer, primary_key=True)
    encounter_id = db.Column(db.String(64), unique=True, nullable=False)
    household_id = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    visit_date = db.Column(db.String(20), nullable=False)
    capture_mode = db.Column(db.String(20), default='manual')  # 'manual', 'voice', 'demo'
    status = db.Column(db.String(30), default='draft')  # 'draft', 'confirmed', 'processed'
    duration_seconds = db.Column(db.Float, default=0.0)
    sync_status = db.Column(db.String(30), default='synced')  # 'synced', 'offline_pending'
    
    raw_data_json = db.Column(db.Text, nullable=True)
    normalized_data_json = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    outputs = db.relationship('ProgrammeOutput', backref='encounter', cascade='all, delete-orphan', lazy=True)
    followups = db.relationship('FollowUp', backref='encounter', cascade='all, delete-orphan', lazy=True)
    mapping_logs = db.relationship('MappingLog', backref='encounter', cascade='all, delete-orphan', lazy=True)

    @property
    def raw_data(self):
        try:
            return json.loads(self.raw_data_json) if self.raw_data_json else {}
        except Exception:
            return {}

    @raw_data.setter
    def raw_data(self, val):
        self.raw_data_json = json.dumps(val) if val else "{}"

    @property
    def normalized_data(self):
        try:
            return json.loads(self.normalized_data_json) if self.normalized_data_json else {}
        except Exception:
            return {}

    @normalized_data.setter
    def normalized_data(self, val):
        self.normalized_data_json = json.dumps(val) if val else "{}"

    def to_dict(self):
        return {
            "id": self.id,
            "encounter_id": self.encounter_id,
            "household_id": self.household_id,
            "user_id": self.user_id,
            "visit_date": self.visit_date,
            "capture_mode": self.capture_mode,
            "status": self.status,
            "duration_seconds": round(self.duration_seconds, 1),
            "sync_status": self.sync_status,
            "raw_data": self.raw_data,
            "normalized_data": self.normalized_data,
            "output_count": len(self.outputs) if self.outputs else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
