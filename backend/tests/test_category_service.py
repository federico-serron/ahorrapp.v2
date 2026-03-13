"""Unit tests for backend/app/services/category_service.py.

Tests cover:
  - get_categories_service
  - create_category_service
  - delete_category_service
"""
import pytest
from app import db
from app.models import Category, User
from app.services.category_service import (
    get_categories_service,
    create_category_service,
    delete_category_service,
    MAX_CATEGORIES_PER_USER,
    VALID_COLORS,
)
from app.exceptions import BadRequestError, NotFoundError, ConflictError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(app, suffix='a') -> int:
    """Insert a minimal User row and return its id."""
    with app.app_context():
        user = User(
            name=f'User {suffix}',
            email=f'user{suffix}@test.com',
            password='hashed',
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user.id


def _make_category(app, user_id: int, name: str = 'Food', color: str = 'blue') -> int:
    """Insert a Category row directly and return its id."""
    with app.app_context():
        cat = Category(user_id=user_id, name=name, color=color)
        db.session.add(cat)
        db.session.commit()
        db.session.refresh(cat)
        return cat.id


# ---------------------------------------------------------------------------
# get_categories_service
# ---------------------------------------------------------------------------

class TestGetCategoriesService:

    def test_returns_empty_list_when_no_categories(self, app):
        """User with no categories gets an empty list."""
        uid = _make_user(app, 'gc1')
        with app.app_context():
            result = get_categories_service(uid)
        assert result == []

    def test_returns_all_categories_for_user(self, app):
        """Returns every category that belongs to the given user."""
        uid = _make_user(app, 'gc2')
        _make_category(app, uid, 'Food', 'blue')
        _make_category(app, uid, 'Transport', 'emerald')
        with app.app_context():
            result = get_categories_service(uid)
        assert len(result) == 2

    def test_returns_categories_sorted_by_name(self, app):
        """Categories are returned in ascending alphabetical order."""
        uid = _make_user(app, 'gc3')
        _make_category(app, uid, 'Zebra', 'rose')
        _make_category(app, uid, 'Apple', 'teal')
        _make_category(app, uid, 'Mango', 'violet')
        with app.app_context():
            result = get_categories_service(uid)
        names = [c['name'] for c in result]
        assert names == ['Apple', 'Mango', 'Zebra']

    def test_does_not_return_other_users_categories(self, app):
        """Categories belonging to a different user are not returned."""
        uid1 = _make_user(app, 'gc4a')
        uid2 = _make_user(app, 'gc4b')
        _make_category(app, uid1, 'Mine', 'blue')
        _make_category(app, uid2, 'Theirs', 'rose')
        with app.app_context():
            result = get_categories_service(uid1)
        assert len(result) == 1
        assert result[0]['name'] == 'Mine'

    def test_serialized_shape_contains_expected_keys(self, app):
        """Each returned item has id, name and color keys."""
        uid = _make_user(app, 'gc5')
        _make_category(app, uid, 'Health', 'orange')
        with app.app_context():
            result = get_categories_service(uid)
        assert set(result[0].keys()) == {'id', 'name', 'color'}


# ---------------------------------------------------------------------------
# create_category_service
# ---------------------------------------------------------------------------

class TestCreateCategoryService:

    def test_creates_category_with_valid_data(self, app):
        """Happy path: valid name and color produce a persisted category."""
        uid = _make_user(app, 'cc1')
        with app.app_context():
            result = create_category_service(uid, 'Groceries', 'emerald')
        assert result['name'] == 'Groceries'
        assert result['color'] == 'emerald'
        assert 'id' in result

    def test_raises_bad_request_for_empty_name(self, app):
        """An empty-string name raises BadRequestError."""
        uid = _make_user(app, 'cc2')
        with app.app_context():
            with pytest.raises(BadRequestError):
                create_category_service(uid, '', 'blue')

    def test_raises_bad_request_for_whitespace_only_name(self, app):
        """A whitespace-only name is treated as empty and raises BadRequestError."""
        uid = _make_user(app, 'cc3')
        with app.app_context():
            with pytest.raises(BadRequestError):
                create_category_service(uid, '   ', 'blue')

    def test_raises_conflict_for_duplicate_name(self, app):
        """Creating a category with an already-used name raises ConflictError."""
        uid = _make_user(app, 'cc4')
        _make_category(app, uid, 'Rent', 'gray')
        with app.app_context():
            with pytest.raises(ConflictError):
                create_category_service(uid, 'Rent', 'rose')

    def test_duplicate_check_is_case_insensitive(self, app):
        """Duplicate detection ignores letter case."""
        uid = _make_user(app, 'cc5')
        _make_category(app, uid, 'Rent', 'gray')
        with app.app_context():
            with pytest.raises(ConflictError):
                create_category_service(uid, 'RENT', 'blue')

    def test_invalid_color_falls_back_to_gray(self, app):
        """An unrecognised color string is silently replaced with 'gray'."""
        uid = _make_user(app, 'cc6')
        with app.app_context():
            result = create_category_service(uid, 'Misc', 'neon-pink')
        assert result['color'] == 'gray'

    def test_valid_color_is_preserved(self, app):
        """Each valid color value is stored as-is."""
        uid = _make_user(app, 'cc7')
        for i, color in enumerate(sorted(VALID_COLORS)):
            with app.app_context():
                result = create_category_service(uid, f'Cat{i}', color)
            assert result['color'] == color

    def test_name_is_stripped_and_truncated_to_30_chars(self, app):
        """Names longer than 30 characters are stored truncated to 30."""
        uid = _make_user(app, 'cc8')
        long_name = 'A' * 40
        with app.app_context():
            result = create_category_service(uid, long_name, 'blue')
        assert result['name'] == 'A' * 30

    def test_name_leading_trailing_whitespace_is_stripped(self, app):
        """Leading and trailing spaces in the name are removed."""
        uid = _make_user(app, 'cc9')
        with app.app_context():
            result = create_category_service(uid, '  Health  ', 'teal')
        assert result['name'] == 'Health'

    def test_raises_bad_request_when_limit_reached(self, app):
        """Reaching MAX_CATEGORIES_PER_USER raises BadRequestError."""
        uid = _make_user(app, 'cc10')
        # Insert MAX_CATEGORIES_PER_USER categories directly to avoid round-trips
        with app.app_context():
            for i in range(MAX_CATEGORIES_PER_USER):
                db.session.add(Category(user_id=uid, name=f'Cat{i}', color='gray'))
            db.session.commit()
        with app.app_context():
            with pytest.raises(BadRequestError):
                create_category_service(uid, 'OneMore', 'blue')

    def test_different_users_can_have_same_category_name(self, app):
        """Two distinct users may each own a category with the same name."""
        uid1 = _make_user(app, 'cc11a')
        uid2 = _make_user(app, 'cc11b')
        _make_category(app, uid1, 'Shared', 'blue')
        with app.app_context():
            # Should NOT raise ConflictError for uid2
            result = create_category_service(uid2, 'Shared', 'rose')
        assert result['name'] == 'Shared'


# ---------------------------------------------------------------------------
# delete_category_service
# ---------------------------------------------------------------------------

class TestDeleteCategoryService:

    def test_deletes_existing_category(self, app):
        """Deleting an existing category removes it from the database."""
        uid = _make_user(app, 'dc1')
        cat_id = _make_category(app, uid, 'ToDelete', 'blue')
        with app.app_context():
            delete_category_service(uid, cat_id)
            remaining = db.session.query(Category).filter_by(id=cat_id).first()
        assert remaining is None

    def test_raises_not_found_for_nonexistent_id(self, app):
        """Deleting a category ID that does not exist raises NotFoundError."""
        uid = _make_user(app, 'dc2')
        with app.app_context():
            with pytest.raises(NotFoundError):
                delete_category_service(uid, 99999)

    def test_raises_not_found_when_category_belongs_to_other_user(self, app):
        """A user cannot delete another user's category."""
        uid1 = _make_user(app, 'dc3a')
        uid2 = _make_user(app, 'dc3b')
        cat_id = _make_category(app, uid1, 'Private', 'rose')
        with app.app_context():
            with pytest.raises(NotFoundError):
                delete_category_service(uid2, cat_id)

    def test_delete_does_not_affect_other_categories(self, app):
        """Deleting one category leaves other categories of the same user intact."""
        uid = _make_user(app, 'dc4')
        keep_id = _make_category(app, uid, 'Keep', 'blue')
        del_id = _make_category(app, uid, 'Remove', 'rose')
        with app.app_context():
            delete_category_service(uid, del_id)
            kept = db.session.query(Category).filter_by(id=keep_id).first()
        assert kept is not None
