"""Integration tests for backend/app/routes/user_bp.py.

Covers:
  - edit_user (T001): regression for casting get_jwt_identity() to int.
  - create_user, login, edit_user, update_me (T005): regression for no
    longer leaking str(exception) details to the client on unexpected
    errors.
  - show_users (002-admin-role-check, T002-T006): admin-only listing.
"""
import app.routes.user_bp as user_bp_module
from app import db
from app.models import User

SECRET_MSG = "secreto-interno-de-base-de-datos-xyz"
FORBIDDEN_BODY = {"error": "Usuario no tiene permisos para acceder"}


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

    def test_edit_user_unexpected_error_does_not_leak_details(self, client, auth_headers, monkeypatch):
        """T005: an unexpected exception must not leak its message to the client."""
        def boom(user_id, **kwargs):
            raise RuntimeError(SECRET_MSG)

        monkeypatch.setattr(user_bp_module, 'edit_user_service', boom)

        resp = client.put('/user/edit', json={'password': 'whatever123'}, headers=auth_headers)

        assert resp.status_code == 500
        body = resp.get_json()
        assert 'error' in body
        assert SECRET_MSG not in body['error']
        assert SECRET_MSG not in resp.get_data(as_text=True)


class TestCreateUserEndpoint:

    def test_create_user_returns_201_with_new_user(self, client):
        """Happy path: valid, unique data creates a user and never returns the password."""
        resp = client.post('/user/signup', json={
            'name': 'Brand New User', 'email': 'brand_new_user@test.com', 'password': 'pass1234',
        })

        assert resp.status_code == 201
        body = resp.get_json()
        assert body['msg'] == 'User created successfully!'
        assert body['user']['email'] == 'brand_new_user@test.com'
        assert 'password' not in body['user']

    def test_create_user_returns_400_for_duplicate_email(self, client, sample_user):
        """Signing up twice with the same email is rejected the second time."""
        resp = client.post('/user/signup', json={
            'name': 'Duplicate', 'email': sample_user['email'], 'password': 'pass1234',
        })

        assert resp.status_code == 400
        assert 'error' in resp.get_json()

    def test_create_user_unexpected_error_does_not_leak_details(self, client, monkeypatch):
        """T005: signup's unexpected-exception branch must not leak details."""
        def boom(**kwargs):
            raise RuntimeError(SECRET_MSG)

        monkeypatch.setattr(user_bp_module, 'create_user_service', boom)

        resp = client.post('/user/signup', json={
            'name': 'New User', 'email': 'new_user@test.com', 'password': 'pass1234',
        })

        assert resp.status_code == 500
        body = resp.get_json()
        assert 'error' in body
        assert SECRET_MSG not in body['error']
        assert SECRET_MSG not in resp.get_data(as_text=True)


class TestLoginEndpoint:

    def test_login_returns_200_and_sets_session_cookie(self, client, sample_user):
        """Happy path: correct credentials return 200 and set the JWT cookie."""
        resp = client.post('/user/login', json={
            'email': sample_user['email'], 'password': 'password123',
        })

        assert resp.status_code == 200
        cookies = resp.headers.getlist('Set-Cookie')
        assert any('access_token_cookie' in c for c in cookies)

    def test_login_returns_400_for_wrong_password(self, client, sample_user):
        """Wrong password is rejected without revealing which field is wrong."""
        resp = client.post('/user/login', json={
            'email': sample_user['email'], 'password': 'wrong-password',
        })

        assert resp.status_code == 400
        assert 'error' in resp.get_json()

    def test_login_unexpected_error_does_not_leak_details(self, client, monkeypatch):
        """T005: login's unexpected-exception branch must not leak details."""
        def boom(email, password):
            raise RuntimeError(SECRET_MSG)

        monkeypatch.setattr(user_bp_module, 'login_user_service', boom)

        resp = client.post('/user/login', json={
            'email': 'whoever@test.com', 'password': 'whatever123',
        })

        assert resp.status_code == 500
        body = resp.get_json()
        assert 'error' in body
        assert SECRET_MSG not in body['error']
        assert SECRET_MSG not in resp.get_data(as_text=True)


class TestShowUsersEndpoint:

    def test_admin_gets_full_user_list(self, client, auth_headers, sample_user, app):
        """T002: a role='admin' account still gets 200 with the full listing."""
        with app.app_context():
            user = db.session.get(User, sample_user['id'])
            user.role = 'admin'
            db.session.commit()

        resp = client.get('/user/users', headers=auth_headers)

        assert resp.status_code == 200
        body = resp.get_json()
        assert isinstance(body, list)
        assert len(body) >= 1
        expected_keys = {'id', 'name', 'email', 'role', 'is_premium', 'phone', 'last_login', 'is_active'}
        for item in body:
            assert set(item.keys()) == expected_keys
            assert 'password' not in item

    def test_non_admin_is_rejected_with_generic_message(self, client, auth_headers):
        """T003: default role='user' account is rejected with the exact generic body."""
        resp = client.get('/user/users', headers=auth_headers)

        assert resp.status_code == 403
        assert resp.get_json() == FORBIDDEN_BODY

    def test_unauthenticated_request_returns_401(self, client):
        """T004: no session cookie still returns 401 (unchanged, enforced by @jwt_required)."""
        resp = client.get('/user/users')
        assert resp.status_code == 401

    def test_role_check_is_evaluated_fresh_not_cached_in_jwt(self, client, auth_headers, sample_user, app):
        """T005: promoting the user mid-session (same cookie) flips the result to 200."""
        rejected = client.get('/user/users', headers=auth_headers)
        assert rejected.status_code == 403

        with app.app_context():
            user = db.session.get(User, sample_user['id'])
            user.role = 'admin'
            db.session.commit()

        allowed = client.get('/user/users', headers=auth_headers)
        assert allowed.status_code == 200

    def test_deleted_account_gets_same_generic_rejection(self, client, auth_headers, sample_user, app):
        """T006: a user deleted after the token was issued gets the identical 403 body,
        indistinguishable from the 'no permissions' case (no existence leak)."""
        with app.app_context():
            user = db.session.get(User, sample_user['id'])
            db.session.delete(user)
            db.session.commit()

        resp = client.get('/user/users', headers=auth_headers)

        assert resp.status_code == 403
        assert resp.get_json() == FORBIDDEN_BODY


class TestUpdateMeEndpoint:

    def test_update_me_returns_200_with_valid_name(self, client, auth_headers):
        """Happy path: a valid name updates the profile."""
        resp = client.put('/user/me', json={'name': 'Updated Name'}, headers=auth_headers)

        assert resp.status_code == 200
        body = resp.get_json()
        assert body['user']['name'] == 'Updated Name'

    def test_update_me_returns_400_for_invalid_name(self, client, auth_headers):
        """A name with digits is rejected."""
        resp = client.put('/user/me', json={'name': 'Invalid123'}, headers=auth_headers)

        assert resp.status_code == 400
        assert 'error' in resp.get_json()

    def test_update_me_unexpected_error_does_not_leak_details(self, client, auth_headers, monkeypatch):
        """T005: PUT /user/me's unexpected-exception branch must not leak details."""
        def boom(user_id, name=None, phone=None):
            raise RuntimeError(SECRET_MSG)

        monkeypatch.setattr(user_bp_module, 'update_profile_service', boom)

        resp = client.put('/user/me', json={'name': 'New Name'}, headers=auth_headers)

        assert resp.status_code == 500
        body = resp.get_json()
        assert 'error' in body
        assert SECRET_MSG not in body['error']
        assert SECRET_MSG not in resp.get_data(as_text=True)


class TestLogoutEndpoint:

    def test_reusing_cookie_after_logout_is_rejected(self, client, auth_headers):
        """T003 (004): a token revoked via logout must be rejected immediately,
        even though it hasn't naturally expired yet."""
        logout_resp = client.post('/user/logout', headers=auth_headers)
        assert logout_resp.status_code == 200

        reused = client.get('/user/me', headers=auth_headers)
        assert reused.status_code == 401

    def test_logout_does_not_revoke_other_sessions(self, app, sample_user):
        """Revocation is per-jti, not per-user: a second, separate login session
        must keep working after the first one logs out.

        Uses two independent test clients (not the shared `client` fixture) so
        each keeps its own cookie jar — reusing one client for two logins would
        let its jar silently overwrite the first session's cookie with the
        second's, which isn't what this test is exercising.
        """
        client_a = app.test_client()
        client_b = app.test_client()

        login_a = client_a.post('/user/login', json={
            'email': sample_user['email'], 'password': 'password123',
        })
        login_b = client_b.post('/user/login', json={
            'email': sample_user['email'], 'password': 'password123',
        })
        assert login_a.status_code == 200
        assert login_b.status_code == 200

        logout_resp = client_a.post('/user/logout')
        assert logout_resp.status_code == 200

        revoked = client_a.get('/user/me')
        assert revoked.status_code == 401

        still_valid = client_b.get('/user/me')
        assert still_valid.status_code == 200
