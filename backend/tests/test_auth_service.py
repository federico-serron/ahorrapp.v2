"""Unit tests for backend/app/services/auth_service.py.

Tests cover:
  - create_user_service
  - login_user_service
  - edit_user_service
  - update_profile_service
  - is_user_admin
"""
import pytest
from app import db, bcrypt
from app.models import User
from app.services.auth_service import (
    create_user_service,
    login_user_service,
    edit_user_service,
    update_profile_service,
    is_user_admin,
)
from app.exceptions import BadRequestError, NotFoundError, ConflictError, UnauthorizedError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(app, suffix='a', role='user', password='password123') -> int:
    """Insert a User row directly (bypassing the service) and return its id."""
    with app.app_context():
        user = User(
            name=f'User {suffix}',
            email=f'auth{suffix}@test.com',
            password=bcrypt.generate_password_hash(password).decode('utf-8'),
            role=role,
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user.id


# ---------------------------------------------------------------------------
# create_user_service
# ---------------------------------------------------------------------------

class TestCreateUserService:

    def test_creates_user_with_hashed_password(self, app):
        """Happy path: user is created and the password is hashed, not stored in plain text."""
        with app.app_context():
            result = create_user_service(name='New User', email='new@test.com', password='plainpass')
            user = db.session.query(User).filter_by(email='new@test.com').first()
        assert result['email'] == 'new@test.com'
        assert user.password != 'plainpass'
        assert bcrypt.check_password_hash(user.password, 'plainpass')

    def test_raises_bad_request_for_missing_fields(self, app):
        """Missing name/email/password raises BadRequestError."""
        with app.app_context():
            with pytest.raises(BadRequestError):
                create_user_service(name='', email='x@test.com', password='pass')

    def test_raises_conflict_for_duplicate_email(self, app):
        """Creating a user with an already-used email raises ConflictError."""
        _make_user(app, 'dup')
        with app.app_context():
            with pytest.raises(ConflictError):
                create_user_service(name='Another', email='authdup@test.com', password='pass1234')


# ---------------------------------------------------------------------------
# login_user_service
# ---------------------------------------------------------------------------

class TestLoginUserService:

    def test_returns_jwt_on_correct_credentials(self, app):
        """Happy path: correct credentials return a non-empty JWT string."""
        uid = _make_user(app, 'login1', password='correctpass')
        with app.app_context():
            token = login_user_service('authlogin1@test.com', 'correctpass')
        assert isinstance(token, str)
        assert len(token) > 0

    def test_raises_bad_request_for_missing_credentials(self, app):
        """Missing email or password raises BadRequestError."""
        with app.app_context():
            with pytest.raises(BadRequestError):
                login_user_service('', '')

    def test_raises_not_found_for_nonexistent_email(self, app):
        """A non-existent email raises NotFoundError."""
        with app.app_context():
            with pytest.raises(NotFoundError):
                login_user_service('doesnotexist@test.com', 'whatever')

    def test_raises_conflict_for_wrong_password(self, app):
        """An existing email with the wrong password raises ConflictError."""
        _make_user(app, 'login2', password='rightpass')
        with app.app_context():
            with pytest.raises(ConflictError):
                login_user_service('authlogin2@test.com', 'wrongpass')


# ---------------------------------------------------------------------------
# edit_user_service
# ---------------------------------------------------------------------------

class TestEditUserService:

    def test_updates_password_hash(self, app):
        """Happy path: editing the password changes the stored hash."""
        uid = _make_user(app, 'edit1', password='oldpass')
        with app.app_context():
            old_hash = db.session.get(User, uid).password
            edit_user_service(uid, password='newpass')
            new_hash = db.session.get(User, uid).password
        assert new_hash != old_hash
        assert bcrypt.check_password_hash(new_hash, 'newpass')

    def test_raises_not_found_for_nonexistent_user(self, app):
        """A non-existent user_id raises NotFoundError."""
        with app.app_context():
            with pytest.raises(NotFoundError):
                edit_user_service(999999, password='whatever')

    def test_raises_bad_request_for_non_editable_field(self, app):
        """Attempting to edit a field other than 'password' raises BadRequestError."""
        uid = _make_user(app, 'edit2')
        with app.app_context():
            with pytest.raises(BadRequestError):
                edit_user_service(uid, email='new@test.com')


# ---------------------------------------------------------------------------
# update_profile_service
# ---------------------------------------------------------------------------

class TestUpdateProfileService:

    def test_updates_valid_name(self, app):
        """Happy path: a valid name is stripped and stored."""
        uid = _make_user(app, 'prof1')
        with app.app_context():
            result = update_profile_service(uid, name='Maria Perez')
        assert result['name'] == 'Maria Perez'

    def test_empty_phone_clears_field(self, app):
        """Passing phone='' clears the phone field to None."""
        uid = _make_user(app, 'prof2')
        with app.app_context():
            update_profile_service(uid, phone='+5491122334455')
            result = update_profile_service(uid, phone='')
        assert result['phone'] is None

    def test_raises_not_found_for_nonexistent_user(self, app):
        """A non-existent user_id raises NotFoundError."""
        with app.app_context():
            with pytest.raises(NotFoundError):
                update_profile_service(999999, name='Whoever')

    def test_raises_bad_request_for_invalid_name(self, app):
        """A name with digits/symbols raises BadRequestError."""
        uid = _make_user(app, 'prof3')
        with app.app_context():
            with pytest.raises(BadRequestError):
                update_profile_service(uid, name='Invalid123')

    def test_raises_bad_request_for_invalid_phone(self, app):
        """A phone with letters raises BadRequestError."""
        uid = _make_user(app, 'prof4')
        with app.app_context():
            with pytest.raises(BadRequestError):
                update_profile_service(uid, phone='not-a-phone')


# ---------------------------------------------------------------------------
# is_user_admin
# ---------------------------------------------------------------------------

class TestIsUserAdmin:

    def test_returns_true_for_admin(self, app):
        """Happy path: a user with role='admin' returns True."""
        uid = _make_user(app, 'admin1', role='admin')
        with app.app_context():
            assert is_user_admin(uid) is True

    def test_raises_not_found_for_nonexistent_user(self, app):
        """A non-existent user_id raises NotFoundError."""
        with app.app_context():
            with pytest.raises(NotFoundError):
                is_user_admin(999999)

    def test_raises_unauthorized_for_non_admin(self, app):
        """A user with role != 'admin' raises UnauthorizedError."""
        uid = _make_user(app, 'nonadmin1', role='user')
        with app.app_context():
            with pytest.raises(UnauthorizedError):
                is_user_admin(uid)
