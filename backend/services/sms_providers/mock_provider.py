import uuid
import time
from typing import Dict, Any, Optional
from .base_provider import BaseSMSProvider

class MockSMSProvider(BaseSMSProvider):
    provider_name = 'mock'

    def send_sms(self, to_phone: str, message_body: str, callback_url: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        unique_suffix = uuid.uuid4().hex[:16]
        provider_id = f'MOCK-SM{unique_suffix}'
        return {
            'success': True,
            'provider': 'mock',
            'provider_message_id': provider_id,
            'message_id': provider_id,
            'status': 'sent',
            'error': None,
            'is_simulated': True,
            'to': to_phone,
            'body': message_body,
            'dispatched_at': int(time.time()),
            'notice': 'MOCK SMS — NOT ACTUALLY SENT'
        }

    def get_message_status(self, provider_message_id: str) -> Dict[str, Any]:
        return {
            'status': 'DELIVERED',
            'provider': 'mock',
            'provider_message_id': provider_message_id,
            'error': None,
            'is_simulated': True
        }
