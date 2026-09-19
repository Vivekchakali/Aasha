from flask import Blueprint, request, jsonify
from models.user import User
from services.audit_service import log_audit_event
from auth_middleware import get_current_user_from_request

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = str(data.get('username', '')).strip()
    password = str(data.get('password', '')).strip()

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        log_audit_event("login_failed", username=username, details="Invalid credentials attempted")
        return jsonify({"error": "Invalid username or password. Please verify your credentials."}), 401

    log_audit_event("login", user=user, details="User successfully authenticated")

    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(),
        "token": f"token-{user.role}-{user.id}"
    }), 200

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    user = get_current_user_from_request()
    if not user:
        return jsonify({"error": "Session expired or unauthorized"}), 401
    return jsonify({"user": user.to_dict()}), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    user = get_current_user_from_request()
    if user:
        log_audit_event("logout", user=user, details="User signed out")
    return jsonify({"message": "Logged out successfully"}), 200
