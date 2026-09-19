import json
import pytest
from app import create_app
from database import db
from seed import seed_demo_database

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        with app.app_context():
            seed_demo_database()
        yield client

def test_health_endpoint(client):
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] in ['ok', 'healthy']
    assert data['database'] == 'healthy'

def test_health_endpoint_db_failure(client, monkeypatch):
    from database import db
    def mock_execute(*args, **kwargs):
        raise Exception("Simulated DB connection error: database disk image is malformed")
    monkeypatch.setattr(db.session, "execute", mock_execute)

    res = client.get('/api/health')
    assert res.status_code == 503
    data = res.get_json()
    assert data['status'] == 'unhealthy'
    assert data['database'] == 'unhealthy'
    # Ensure no internal connection string or error message was exposed
    assert "database disk image is malformed" not in str(data)

def test_login_demo(client):
    # Valid ASHA
    res = client.post('/api/auth/login', json={"username": "asha", "password": "asha123"})
    assert res.status_code == 200
    assert res.get_json()['user']['role'] == 'asha'

    # Valid Admin
    res = client.post('/api/auth/login', json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    assert res.get_json()['user']['role'] == 'admin'

    # Invalid
    res = client.post('/api/auth/login', json={"username": "asha", "password": "wrongpassword"})
    assert res.status_code == 401

def test_dashboard_summary(client):
    res = client.get('/api/dashboard')
    assert res.status_code == 200
    data = res.get_json()
    assert 'summary' in data
    assert 'recent_encounters' in data

def test_encounter_lifecycle_h1024(client):
    payload = {
        "household_id": "H1024",
        "village_area": "Shanti Nagar, Ward 4",
        "visit_date": "2026-09-18",
        "household_members": 4,
        "pregnant": True,
        "maternal_age": 25,
        "gestational_age": 24,
        "expected_delivery_date": "2027-01-08",
        "maternal_observations": "Prenatal parameters normal",
        "children": [
            {
                "child_index": 1,
                "age": 2,
                "vaccination_status": "Complete",
                "observations": "Growth normal"
            }
        ],
        "symptoms": "Mild fatigue",
        "temperature": "98.4 F",
        "blood_pressure": "118/76 mmHg",
        "general_observations": "Sanitation satisfactory",
        "follow_up_required": True,
        "follow_up_days": 14,
        "duration_seconds": 45.2
    }

    # 1. Create Encounter
    res = client.post('/api/encounters', json=payload)
    assert res.status_code == 201
    enc_id = res.get_json()['encounter']['id']

    # 2. Process Encounter
    res_proc = client.post(f'/api/encounters/{enc_id}/process')
    assert res_proc.status_code == 200
    proc_data = res_proc.get_json()
    assert proc_data['impact']['reduction_percentage'] > 0
    assert proc_data['impact']['actions_avoided'] > 0


    # 3. Get Outputs
    res_out = client.get(f'/api/encounters/{enc_id}/outputs')
    assert res_out.status_code == 200
    assert len(res_out.get_json()['outputs']) == 4

    # 4. Get Mappings
    res_map = client.get(f'/api/encounters/{enc_id}/mappings')
    assert res_map.status_code == 200
    assert len(res_map.get_json()['flow_graph']['nodes']) > 0

def test_sync_offline_encounters(client):
    offline_payload = {
        "encounters": [
            {
                "client_uuid": "client-offline-uuid-001",
                "duration_seconds": 35.0,
                "data": {
                    "household_id": "H1099",
                    "village_area": "Off-grid Hamlet",
                    "visit_date": "2026-09-18",
                    "household_members": 3,
                    "pregnant": False,
                    "children": [{"child_index": 1, "age": 3, "vaccination_status": "Complete"}],
                    "follow_up_required": False
                }
            }
        ]
    }
    res = client.post('/api/sync', json=offline_payload)
    assert res.status_code == 200
    assert res.get_json()['synced_count'] == 1

def test_analytics_endpoint(client):
    res = client.get('/api/analytics')
    assert res.status_code == 200
    data = res.get_json()
    assert data['total_encounters'] > 0
    assert 'charts' in data

def test_demo_load_scenario_and_reset(client):
    res_sc = client.post('/api/demo/load-scenario', json={"scenario_id": "1"})
    assert res_sc.status_code == 200
    assert res_sc.get_json()['scenario']['household_id'] == 'H1024'

    res_reset = client.post('/api/demo/reset')
    assert res_reset.status_code == 200

def test_admin_and_notification_routes(client):
    # 1. Test notifications endpoint
    res_notif = client.get('/api/followups/notifications')
    assert res_notif.status_code == 200
    n_data = res_notif.get_json()
    assert 'categories' in n_data
    assert 'unread_count' in n_data
    assert 'notifications' in n_data

    # 2. Test Admin Login and Admin Endpoints
    res_login = client.post('/api/auth/login', json={"username": "admin", "password": "admin123"})
    assert res_login.status_code == 200
    admin_token = res_login.get_json()['token']
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin History
    res_hist = client.get('/api/admin/history', headers=admin_headers)
    assert res_hist.status_code == 200
    assert 'history' in res_hist.get_json()

    # Admin Operations
    res_ops = client.get('/api/admin/operations', headers=admin_headers)
    assert res_ops.status_code == 200
    ops_data = res_ops.get_json()
    assert 'stats' in ops_data
    assert 'system_health' in ops_data

    # Admin Safety & Governance
    res_gov = client.get('/api/admin/safety-governance', headers=admin_headers)
    assert res_gov.status_code == 200
    gov_data = res_gov.get_json()
    assert 'policies' in gov_data
    assert len(gov_data['policies']) >= 3

    # Admin Audit Logs
    res_audits = client.get('/api/admin/audit-logs', headers=admin_headers)
    assert res_audits.status_code == 200
    assert 'audit_logs' in res_audits.get_json()

    # Role enforcement: Admin CANNOT access ASHA operational create encounter endpoint
    res_forbidden = client.post('/api/encounters', json={"household_id": "H1024"}, headers=admin_headers)
    assert res_forbidden.status_code == 403
