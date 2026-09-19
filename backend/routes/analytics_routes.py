from flask import Blueprint, jsonify
from services.analytics import get_macro_analytics

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api')

@analytics_bp.route('/analytics', methods=['GET'])
def get_analytics():
    stats = get_macro_analytics()
    return jsonify(stats), 200
