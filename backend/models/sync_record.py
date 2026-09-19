from datetime import datetime
from database import db

class SyncRecord(db.Model):
    __tablename__ = 'sync_records'

    id = db.Column(db.Integer, primary_key=True)
    encounter_id = db.Column(db.Integer, db.ForeignKey('encounters.id'), nullable=True)
    client_uuid = db.Column(db.String(120), nullable=False)
    synced_at = db.Column(db.DateTime, default=datetime.utcnow)
    sync_mode = db.Column(db.String(30), default='online')  # 'online', 'batch_offline'
    status = db.Column(db.String(30), default='synced')      # 'synced', 'conflict', 'failed'

    def to_dict(self):
        return {
            "id": self.id,
            "encounter_id": self.encounter_id,
            "client_uuid": self.client_uuid,
            "synced_at": self.synced_at.isoformat() if self.synced_at else None,
            "sync_mode": self.sync_mode,
            "status": self.status
        }
