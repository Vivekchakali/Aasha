from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseSMSProvider(ABC):
    """
    Abstract interface for SMS providers (Mock, Twilio, etc.).
    All providers must return a consistent dictionary structure:
    {
        'success': bool,
        'provider': str,            # 'mock' or 'twilio'
        'provider_message_id': str, # Provider message SID / ID
        'status': str,              # 'PENDING', 'SENT', 'DELIVERED', 'FAILED'
        'error': Optional[str],
        'is_simulated': bool
    }
    """

    @abstractmethod
    def send_sms(self, to_phone: str, message_body: str, callback_url: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Sends an SMS message to a normalized phone number."""
        pass

    @abstractmethod
    def get_message_status(self, provider_message_id: str) -> Dict[str, Any]:
        """Retrieves the latest delivery status of a previously dispatched message."""
        pass
