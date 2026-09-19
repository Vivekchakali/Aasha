import json
from datetime import datetime
from database import db
from models.audit_log import AuditLog

def log_audit_event(action, user=None, username=None, role=None, record_id=None, details=None, user_id=None):
    """
    Records an operational or administrative action in the persistent audit log.
    """
    try:
        u_name = username
        u_role = role
        u_id = user_id
        if user:
            u_id = getattr(user, 'id', None) or u_id
            u_name = u_name or getattr(user, 'username', None)
            u_role = u_role or getattr(user, 'role', None)


        details_str = details
        if isinstance(details, (dict, list)):
            details_str = json.dumps(details)

        log_entry = AuditLog(
            user_id=u_id,
            username=u_name or 'system',
            role=u_role or 'system',
            action=action,
            record_id=str(record_id) if record_id is not None else None,
            details=details_str,
            created_at=datetime.utcnow()
        )
        db.session.add(log_entry)
        db.session.commit()
        return log_entry
    except Exception as e:
        print(f"[WARN] Failed to write audit log: {e}")
        try:
            db.session.rollback()
        except Exception:
            pass
        return None
