"""Integration tests for backend/app/routes/paypal_bp.py.

Covers T005: create_order and capture_order must not leak str(exception)
details to the client on unexpected errors.

Note: these endpoints have no @jwt_required (tracked separately as T004,
out of scope here), so no auth_headers are needed to exercise them.
"""
from unittest.mock import MagicMock

import app.routes.paypal_bp as paypal_bp_module

SECRET_MSG = "secreto-interno-de-paypal-xyz"


class TestCreateOrderEndpoint:

    def test_create_order_returns_201_with_approval_link(self, client, monkeypatch):
        """Happy path: a successful PayPal order creation is forwarded as-is."""
        monkeypatch.setattr(paypal_bp_module, 'get_access_token', lambda: 'fake-token')

        fake_response = MagicMock()
        fake_response.status_code = 201
        fake_response.json.return_value = {
            "id": "ORDER123",
            "links": [{"rel": "approve", "href": "https://paypal.example/approve"}],
        }
        monkeypatch.setattr(paypal_bp_module, 'create_order_service', lambda amount, access_token: fake_response)

        resp = client.post('/paypal/create-order', json={'amount': '10.00'})

        assert resp.status_code == 201
        assert resp.get_json() == fake_response.json.return_value

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

    def test_capture_order_returns_200_with_completed_status(self, client, monkeypatch):
        """Happy path: a successful PayPal capture is forwarded as-is."""
        monkeypatch.setattr(paypal_bp_module, 'get_access_token', lambda: 'fake-token')

        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.json.return_value = {"status": "COMPLETED", "id": "ORDER123"}
        monkeypatch.setattr(paypal_bp_module, 'capture_order_service', lambda order_id, access_token: fake_response)

        resp = client.post('/paypal/capture-order', json={'order_id': 'ORDER123'})

        assert resp.status_code == 200
        assert resp.get_json() == fake_response.json.return_value

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
