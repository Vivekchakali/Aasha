import os

try:
    from dotenv import load_dotenv
    # Load .env from backend directory or parent project root
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, 'instance')
os.makedirs(INSTANCE_DIR, exist_ok=True)

def _get_database_uri():
    raw_url = os.environ.get('DATABASE_URL')
    default_db = os.path.join(INSTANCE_DIR, 'asha_onecapture.db')
    if not raw_url:
        return f'sqlite:///{default_db}'
    if raw_url.startswith('sqlite:///'):
        path_part = raw_url[len('sqlite:///'):]
        if not os.path.isabs(path_part):
            return f'sqlite:///{os.path.join(INSTANCE_DIR, path_part)}'
    return raw_url

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'asha-onecapture-secret-key-kalachakra2026')
    SQLALCHEMY_DATABASE_URI = _get_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False

    # SMS Configuration
    SMS_PROVIDER = os.environ.get('SMS_PROVIDER', 'mock').lower()
    TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
    TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '')
    TWILIO_STATUS_CALLBACK_URL = os.environ.get('TWILIO_STATUS_CALLBACK_URL', '')
    SMS_COOLDOWN_HOURS = int(os.environ.get('SMS_COOLDOWN_HOURS', '24'))
    SMS_MAX_RETRIES = int(os.environ.get('SMS_MAX_RETRIES', '3'))
