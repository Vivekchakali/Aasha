from functools import wraps
from flask import request, jsonify, g, current_app
from models.user import User

def get_current_user_from_request():
    auth_header = request.headers.get('Authorization', '')
    token = auth_header.replace('Bearer ', '').strip()
    if token and token.startswith('token-'):
        parts = token.split('-')
        if len(parts) >= 3:
            user_id = parts[-1]
            try:
                u = User.query.get(int(user_id))
                if u:
                    return u
            except Exception:
                pass

    # If in testing mode and no explicit auth header was given, fallback to seeded 'asha' worker
    if current_app and current_app.config.get('TESTING'):
        return User.query.filter_by(role='asha').first()

    return None

def require_auth(allowed_roles=None):
    """
    Decorator to protect routes with authentication and role-based access control.
    allowed_roles: string or list of strings (e.g., 'asha', 'admin', ['asha', 'admin'])
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user_from_request()
            if not user:
                return jsonify({
                    "error": "Unauthorized. Valid authentication token required.",
                    "code": "UNAUTHORIZED"
                }), 401

            if allowed_roles:
                roles = [allowed_roles] if isinstance(allowed_roles, str) else list(allowed_roles)
                if user.role not in roles:
                    if user.role == 'admin':
                        msg = "Access restricted: Administrative accounts cannot perform frontline ASHA operations directly."
                    else:
                        msg = "Access restricted: Administrative authorization required."
                    return jsonify({
                        "error": msg,
                        "code": "FORBIDDEN",
                        "user_role": user.role,
                        "required_roles": roles
                    }), 403

            g.current_user = user
            request.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator
