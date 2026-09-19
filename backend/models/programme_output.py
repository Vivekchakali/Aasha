import json
from datetime import datetime
from database import db

class ProgrammeOutput(db.Model):
    __tablename__ = 'programme_outputs'

    id = db.Column(db.Integer, primary_key=True)
    encounter_id = db.Column(db.Integer, db.ForeignKey('encounters.id'), nullable=False)
    programme_code = db.Column(db.String(50), nullable=False)  # MATERNAL_HEALTH, IMMUNISATION, HOUSEHOLD_REGISTER, FOLLOW_UP
    programme_name = db.Column(db.String(120), nullable=False)
    payload_json = db.Column(db.Text, nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def payload(self):
        try:
            return json.loads(self.payload_json) if self.payload_json else {}
        except Exception:
            return {}

    @payload.setter
    def payload(self, val):
        self.payload_json = json.dumps(val) if val else "{}"

    def to_dict(self):
        return {
            "id": self.id,
            "encounter_id": self.encounter_id,
            "programme_code": self.programme_code,
            "programme_name": self.programme_name,
            "payload": self.payload,
            "generated_at": self.generated_at.isoformat() if self.generated_at else None
        }
