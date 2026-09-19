from datetime import datetime
from database import db

class MappingLog(db.Model):
    __tablename__ = 'mapping_logs'

    id = db.Column(db.Integer, primary_key=True)
    encounter_id = db.Column(db.Integer, db.ForeignKey('encounters.id'), nullable=False)
    rule_name = db.Column(db.String(80), nullable=False)
    source_field = db.Column(db.String(80), nullable=False)
    target_programme = db.Column(db.String(80), nullable=False)
    target_field = db.Column(db.String(80), nullable=False)
    value_transformed = db.Column(db.Text, nullable=True)
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "encounter_id": self.encounter_id,
            "rule_name": self.rule_name,
            "source_field": self.source_field,
            "target_programme": self.target_programme,
            "target_field": self.target_field,
            "value_transformed": self.value_transformed,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None
        }
