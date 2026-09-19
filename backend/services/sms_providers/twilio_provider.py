import os
import logging
from typing import Dict, Any, Optional
from .base_provider import BaseSMSProvider

logger = logging.getLogger(__name__)

try:
    from twilio.rest import Client as TwilioClient
except ImportError:
    TwilioClient = None

class TwilioSMSProvider(BaseSMSProvider):
    provider_name = 'twilio'

    def __init__(
        self, 
        account_sid: Optional[str] = None, 
        auth_token: Optional[str] = None, 
        from_number: Optional[str] = None,
        from_phone: Optional[str] = None,
        status_callback_url: Optional[str] = None
    ):
        self.account_sid = account_sid if account_sid is not None else os.environ.get('TWILIO_ACCOUNT_SID')
        self.auth_token = auth_token if auth_token is not None else os.environ.get('TWILIO_AUTH_TOKEN')
        self.from_number = from_number or from_phone or os.environ.get('TWILIO_PHONE_NUMBER')
        self.status_callback_url = status_callback_url or os.environ.get('TWILIO_STATUS_CALLBACK_URL')
        self.client = None
        self._init_error = None

        if not self.account_sid or not self.auth_token or not self.from_number:
            self._init_error = 'TWILIO CONFIGURATION INCOMPLETE: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER missing.'
        else:
            try:
                if TwilioClient:
                    self.client = TwilioClient(self.account_sid, self.auth_token)
                else:
                    self._init_error = 'Twilio Python package is not available.'
            except Exception as e:
                self._init_error = f'Failed to initialize Twilio client: {str(e)}'
                logger.error('Twilio initialization failed.')

    def is_configured(self) -> bool:
        return self.client is not None and bool(self.from_number)

    def send_sms(self, to_phone: str, message_body: str, callback_url: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                'success': False,
                'provider': 'twilio',
                'provider_message_id': None,
                'message_id': None,
                'status': 'FAILED',
                'error': self._init_error or 'Twilio credentials not configured on backend server.',
                'is_simulated': False
            }

        try:
            from twilio.base.exceptions import TwilioRestException
        except ImportError:
            TwilioRestException = Exception

        status_callback = callback_url or self.status_callback_url or os.environ.get('TWILIO_STATUS_CALLBACK_URL')
        create_kwargs = {
            'body': message_body,
            'from_': self.from_number,
            'to': to_phone
        }
        if status_callback:
            create_kwargs['status_callback'] = status_callback

        try:
            message = self.client.messages.create(**create_kwargs)
            
            status_map = {
                'queued': 'sent',
                'sending': 'sent',
                'sent': 'sent',
                'delivered': 'delivered',
                'failed': 'failed',
                'undelivered': 'failed'
            }
            mapped_status = status_map.get(str(message.status).lower(), 'sent')

            return {
                'success': mapped_status != 'failed',
                'provider': 'twilio',
                'provider_message_id': message.sid,
                'message_id': message.sid,
                'status': mapped_status,
                'error': getattr(message, 'error_message', None),
                'is_simulated': False,
                'to': to_phone,
                'body': message_body
            }
        except TwilioRestException as e:
            msg = getattr(e, 'msg', str(e))
            code = getattr(e, 'code', None)
            logger.error(f'Twilio REST Exception: {msg} (Code: {code})')
            
            error_hint = f'Twilio dispatch failed: {msg}'
            if code == 21608 or 'verified recipient' in msg.lower() or 'unverified' in msg.lower():
                error_hint = f'Twilio Trial Restriction: Recipient {to_phone} is not verified. On Twilio free trial accounts, add {to_phone} under "Verified Caller IDs" in Twilio Console (https://console.twilio.com/us1/develop/phone-numbers/manage/verified), or switch SMS_PROVIDER=mock for demo simulation.'
            elif code == 21408 or 'permission' in msg.lower() or 'region' in msg.lower():
                error_hint = 'Twilio Geo-Permission Restriction: International SMS to India (+91) is disabled in Twilio Console (Messaging > Settings > Geo-permissions).'
            elif code == 21211:
                error_hint = f'Invalid phone number format: {to_phone}. Please check the recipient number.'

            return {
                'success': False,
                'provider': 'twilio',
                'provider_message_id': None,
                'status': 'FAILED',
                'error': error_hint,
                'is_simulated': False
            }
        except Exception as e:
            logger.error(f'Twilio dispatch unexpected failure: {str(e)}')
            return {
                'success': False,
                'provider': 'twilio',
                'provider_message_id': None,
                'status': 'FAILED',
                'error': 'SMS could not be sent. Please check the phone number or try again.',
                'is_simulated': False
            }

    def get_message_status(self, provider_message_id: str) -> Dict[str, Any]:
        if not self.is_configured() or not provider_message_id:
            return {
                'status': 'FAILED',
                'provider': 'twilio',
                'provider_message_id': provider_message_id,
                'error': self._init_error or 'Twilio client not initialized or missing message ID.'
            }
        try:
            msg = self.client.messages(provider_message_id).fetch()
            status_map = {
                'queued': 'PENDING',
                'sending': 'PENDING',
                'sent': 'SENT',
                'delivered': 'DELIVERED',
                'failed': 'FAILED',
                'undelivered': 'FAILED'
            }
            mapped = status_map.get(str(msg.status).lower(), str(msg.status).upper())
            return {
                'status': mapped,
                'provider': 'twilio',
                'provider_message_id': msg.sid,
                'error': msg.error_message if getattr(msg, 'error_code', None) else None
            }
        except Exception as e:
            return {
                'status': 'FAILED',
                'provider': 'twilio',
                'provider_message_id': provider_message_id,
                'error': str(e)
            }
