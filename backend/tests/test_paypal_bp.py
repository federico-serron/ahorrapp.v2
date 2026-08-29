"""Integration tests for backend/app/routes/paypal_bp.py.

Covers T005: create_order and capture_order must not leak str(exception)
details to the client on unexpected errors.

Note: these endpoints have no @jwt_required (tracked separately as T004,
out of scope here), so no auth_headers are needed to exercise them.
"""
import app.routes.paypal_bp as paypal_bp_module

SECRET_MSG = "secreto-interno-de-paypal-xyz"


class TestCreateOrderEndpoint:

    def test_create_order_unexpected_error_does_not_leak_details(self, client, monkeypatch):
        monkeypatch.setattr(paypal_bp_module, 'get_access_token', lambda: 'fake-token')

        def boom(amount, access_token):
            raise RuntimeError(SECRET_MSG)

        monkeypatch.setattr(paypal_bp_module, 'create_order_service', boom)

        resp = client.post('/paypal/create-order', json={'amount': '10.00'})

        assert resp.status_code == 500
        body = resp.get_json()
        assert 'error' in body
        assert SECRET_MSG not in body['error']
        assert SECRET_MSG not in resp.get_data(as_text=True)


class TestCaptureOrderEndpoint:

    def test_capture_order_unexpected_error_does_not_leak_details(self, client, monkeypatch):
        monkeypatch.setattr(paypal_bp_module, 'get_access_token', lambda: 'fake-token')

        def boom(order_id, access_token):
            raise RuntimeError(SECRET_MSG)

        monkeypatch.setattr(paypal_bp_module, 'capture_order_service', boom)

        resp = client.post('/paypal/capture-order', json={'order_id': 'ORDER123'})

        assert resp.status_code == 500
        body = resp.get_json()
        assert 'error' in body
        assert SECRET_MSG not in body['error']
        assert SECRET_MSG not in resp.get_data(as_text=True)
