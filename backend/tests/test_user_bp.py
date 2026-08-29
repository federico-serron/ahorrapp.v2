"""Integration tests for backend/app/routes/user_bp.py::edit_user (T001).

Regression coverage for the fix that casts `get_jwt_identity()` to `int`
before passing it to `edit_user_service`. Before the fix, `user_id` was a
`str` (JWT identities are always stored as strings) — harmless on SQLite's
weak typing but broken on PostgreSQL, where comparing an Integer column to a
string value fails.
"""
import app.routes.user_bp as user_bp_module


class TestEditUserEndpoint:

    def test_edit_user_returns_200_and_updates_password(self, client, auth_headers, sample_user, app):
        """Happy path: PUT /user/edit changes the password and returns the updated user."""
        resp = client.put('/user/edit', json={'password': 'newpassword456'}, headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body['msg'] == 'User edited successfully'
        assert body['user']['email'] == sample_user['email']

        # New password works for a fresh login; old one no longer does.
        login_new = client.post('/user/login', json={
            'email': sample_user['email'],
            'password': 'newpassword456',
        })
        assert login_new.status_code == 200

    def test_edit_user_passes_integer_user_id_to_service(self, client, auth_headers, monkeypatch):
        """The user_id passed to edit_user_service must be int, not the raw JWT string.

        Regression test for T001: `get_jwt_identity()` always returns a str; the route
        must cast it with `int(...)` before calling the service layer.
        """
        captured_types = []
        original_service = user_bp_module.edit_user_service

        def spy_edit_user_service(user_id, **kwargs):
            captured_types.append(type(user_id))
            return original_service(user_id, **kwargs)

        monkeypatch.setattr(user_bp_module, 'edit_user_service', spy_edit_user_service)

        resp = client.put('/user/edit', json={'password': 'anotherpassword789'}, headers=auth_headers)

        assert resp.status_code == 200
        assert captured_types == [int], (
            f"Expected edit_user_service to receive an int user_id, got {captured_types}"
        )

    def test_edit_user_returns_401_without_auth(self, client):
        """Unauthenticated request returns 401."""
        resp = client.put('/user/edit', json={'password': 'whatever123'})
        assert resp.status_code == 401

    def test_edit_user_returns_400_for_non_editable_field(self, client, auth_headers):
        """Attempting to edit a field other than 'password' returns 400."""
        resp = client.put('/user/edit', json={'email': 'new@example.com'}, headers=auth_headers)
        assert resp.status_code == 400
        assert 'error' in resp.get_json()
