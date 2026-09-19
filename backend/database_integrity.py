import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)

INDEXES_TO_ENSURE = [
    ("idx_members_household_id", "household_members", "household_id"),
    ("idx_members_phone", "household_members", "phone_number"),
    ("idx_encounters_household_id", "encounters", "household_id"),
    ("idx_encounters_user_id", "encounters", "user_id"),
    ("idx_programme_outputs_encounter_id", "programme_outputs", "encounter_id"),
    ("idx_followups_encounter_id", "followups", "encounter_id"),
    ("idx_followups_member_id", "followups", "member_id"),
    ("idx_followups_household_id", "followups", "household_id"),
    ("idx_followups_status", "followups", "status"),
    ("idx_sms_messages_member_id", "sms_messages", "member_id"),
    ("idx_sms_messages_followup_id", "sms_messages", "followup_id"),
    ("idx_sms_messages_phone", "sms_messages", "recipient_phone"),
    ("idx_sms_messages_status", "sms_messages", "status"),
    ("idx_audit_logs_action", "audit_logs", "action"),
    ("idx_audit_logs_user_id", "audit_logs", "user_id"),
    ("idx_notifications_user_id", "notifications", "user_id"),
    ("idx_notifications_followup_id", "notifications", "followup_id"),
    ("idx_mapping_logs_encounter_id", "mapping_logs", "encounter_id")
]

COLUMNS_TO_ENSURE = {
    "sms_messages": [
        ("reminder_type", "VARCHAR(50)"),
        ("template_key", "VARCHAR(50)"),
        ("provider", "VARCHAR(30) DEFAULT 'mock'"),
        ("provider_message_id", "VARCHAR(100)"),
        ("attempt_count", "INTEGER DEFAULT 1"),
        ("delivered_at", "DATETIME"),
        ("updated_at", "DATETIME")
    ],
    "household_members": [
        ("sms_opt_in", "BOOLEAN DEFAULT 1"),
        ("sms_enabled", "BOOLEAN DEFAULT 1"),
        ("iron_tablets_required", "BOOLEAN DEFAULT 0"),
        ("iron_tablets_collected", "BOOLEAN DEFAULT 0"),
        ("iron_tablets_date", "VARCHAR(20)")
    ]
}

def ensure_schema_integrity(db_engine):
    """
    Idempotent, non-destructive schema integrity enforcer:
    1. Validates SQLite foreign keys
    2. Adds missing columns safely using ALTER TABLE ... ADD COLUMN (never drops tables or data)
    3. Builds performance indexes on foreign keys and search filter columns
    """
    try:
        with db_engine.connect() as conn:
            # Check SQLite dialect
            is_sqlite = db_engine.dialect.name == 'sqlite'
            if is_sqlite:
                conn.execute(text("PRAGMA foreign_keys=ON;"))

            # 1. Non-destructive column verification
            for table_name, columns in COLUMNS_TO_ENSURE.items():
                if is_sqlite:
                    result = conn.execute(text(f"PRAGMA table_info({table_name})"))
                    existing_cols = {row[1] for row in result.fetchall()}
                    if existing_cols:  # Table exists
                        for col_name, col_def in columns:
                            if col_name not in existing_cols:
                                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_def}"))
                                conn.commit()
                                logger.info(f"Safely added column {col_name} to {table_name}")

            # 2. Non-destructive index creation
            if is_sqlite:
                for idx_name, table_name, col_name in INDEXES_TO_ENSURE:
                    # Check if table exists before creating index
                    tbl_check = conn.execute(text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")).fetchone()
                    if tbl_check:
                        conn.execute(text(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name}({col_name});"))
                conn.commit()

            # 3. Foreign key integrity check
            if is_sqlite:
                fk_violations = conn.execute(text("PRAGMA foreign_key_check")).fetchall()
                if fk_violations:
                    logger.warning(f"Foreign key violations detected: {fk_violations}")
                else:
                    logger.info("Database foreign key integrity check: 100% PASS (0 violations).")

    except Exception as e:
        logger.error(f"Schema integrity check encountered non-fatal error: {str(e)}")
