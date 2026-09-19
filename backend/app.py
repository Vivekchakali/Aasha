import os
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text
from config import Config
from database import db

# Import models to ensure registration with SQLAlchemy
import models

# Import blueprints
from routes import (
    auth_bp,
    dashboard_bp,
    household_bp,
    encounter_bp,
    output_bp,
    followup_bp,
    analytics_bp,
    sync_bp,
    demo_bp,
    admin_bp,
    retrieval_bp
)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend local development
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize Database
    db.init_app(app)
    with app.app_context():
        from database_integrity import ensure_schema_integrity
        ensure_schema_integrity(db.engine)

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(household_bp)
    app.register_blueprint(encounter_bp)
    app.register_blueprint(output_bp)
    app.register_blueprint(followup_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(sync_bp)
    app.register_blueprint(demo_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(retrieval_bp)

    @app.teardown_request
    def handle_session_teardown(exception=None):
        """Cleanly rollback uncommitted database sessions on request exceptions."""
        if exception is not None:
            try:
                db.session.rollback()
            except Exception:
                pass

    @app.route('/api/health', methods=['GET'])
    def health_check():
        db_status = "healthy"
        try:
            # Perform a lightweight, non-modifying query to verify database connectivity
            db.session.execute(text("SELECT 1"))
        except Exception:
            db_status = "unhealthy"

        is_healthy = (db_status == "healthy")
        status_code = 200 if is_healthy else 503

        return jsonify({
            "status": "healthy" if is_healthy else "unhealthy",
            "database": db_status,
            "service": "ASHA OneCapture",
            "tagline": "One Household Visit. One Complete Capture. Multiple Structured Records."
        }), status_code

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        try:
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

    # Auto-seed database if empty on startup
    with app.app_context():
        db.create_all()
        from models.user import User
        if not User.query.filter_by(username="asha").first():
            from seed import seed_demo_database
            seed_demo_database()

    return app

# Expose WSGI application callable for production servers (e.g., Gunicorn `app:app`)
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"==================================================")
    print(f"  ASHA OneCapture Backend Server running on port {port}")
    print(f"  http://127.0.0.1:{port}/api/health")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=port, debug=False)
