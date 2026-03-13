"""Integration tests for backend/app/routes/category_bp.py.

Covers all three endpoints:
  GET  /category/        — get_categories
  POST /category/        — create_category
  DELETE /category/<id>  — delete_category

Each test asserts both the HTTP status code and the JSON response body.
Authentication is handled via the `auth_headers` fixture (cookie JWT).
"""
import pytest
from app import db
from app.models import Category


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed_category(app, user_id: int, name: str = 'Food', color: str = 'blue') -> int:
    """Insert a category row directly and return its id."""
    with app.app_context():
        cat = Category(user_id=user_id, name=name, color=color)
        db.session.add(cat)
        db.session.commit()
        db.session.refresh(cat)
        return cat.id


# ---------------------------------------------------------------------------
# GET /category/
# ---------------------------------------------------------------------------

class TestGetCategoriesEndpoint:

    def test_returns_200_with_empty_list(self, client, auth_headers):
        """Authenticated user with no categories receives 200 and an empty list."""
        resp = client.get('/category/', headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert 'data' in body
        assert body['data'] == []

    def test_returns_200_with_existing_categories(self, client, auth_headers, sample_user, app):
        """Authenticated user sees their own categories in the response."""
        _seed_category(app, sample_user['id'], 'Groceries', 'emerald')
        _seed_category(app, sample_user['id'], 'Travel', 'teal')
        resp = client.get('/category/', headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert len(body['data']) == 2

    def test_category_items_have_correct_shape(self, client, auth_headers, sample_user, app):
        """Each item in data has id, name and color keys."""
        _seed_category(app, sample_user['id'], 'Health', 'rose')
        resp = client.get('/category/', headers=auth_headers)
        item = resp.get_json()['data'][0]
        assert set(item.keys()) == {'id', 'name', 'color'}

    def test_returns_401_without_auth(self, client):
        """Unauthenticated request returns 401."""
        resp = client.get('/category/')
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /category/
# ---------------------------------------------------------------------------

class TestCreateCategoryEndpoint:

    def test_creates_category_returns_201(self, client, auth_headers):
        """Valid payload creates a category and returns 201 with msg and data."""
        resp = client.post('/category/', json={'name': 'Hobbies', 'color': 'violet'},
                           headers=auth_headers)
        assert resp.status_code == 201
        body = resp.get_json()
        assert 'msg' in body
        assert body['data']['name'] == 'Hobbies'
        assert body['data']['color'] == 'violet'

    def test_creates_category_with_default_color(self, client, auth_headers):
        """Omitting color still creates the category (defaults to gray)."""
        resp = client.post('/category/', json={'name': 'Misc'}, headers=auth_headers)
        assert resp.status_code == 201
        assert resp.get_json()['data']['color'] == 'gray'

    def test_returns_400_when_name_missing(self, client, auth_headers):
        """Missing name field returns 400 with an error message."""
        resp = client.post('/category/', json={'color': 'blue'}, headers=auth_headers)
        assert resp.status_code == 400
        assert 'error' in resp.get_json()

    def test_returns_400_when_body_is_empty(self, client, auth_headers):
        """Empty JSON body returns 400."""
        resp = client.post('/category/', json={}, headers=auth_headers)
        assert resp.status_code == 400
        assert 'error' in resp.get_json()

    def test_returns_400_when_no_json(self, client, auth_headers):
        """Request with no JSON body at all returns 400."""
        resp = client.post('/category/', headers=auth_headers)
        assert resp.status_code == 400

    def test_returns_409_for_duplicate_name(self, client, auth_headers, sample_user, app):
        """Creating a category with a duplicate name returns 409."""
        _seed_category(app, sample_user['id'], 'Duplicate', 'blue')
        resp = client.post('/category/', json={'name': 'Duplicate', 'color': 'rose'},
                           headers=auth_headers)
        assert resp.status_code == 409
        assert 'error' in resp.get_json()

    def test_returns_409_for_duplicate_name_case_insensitive(self, client, auth_headers,
                                                              sample_user, app):
        """Duplicate check is case-insensitive: 'food' vs 'FOOD' returns 409."""
        _seed_category(app, sample_user['id'], 'Food', 'blue')
        resp = client.post('/category/', json={'name': 'FOOD', 'color': 'teal'},
                           headers=auth_headers)
        assert resp.status_code == 409

    def test_invalid_color_accepted_as_gray(self, client, auth_headers):
        """An unrecognised color is silently normalised to 'gray'."""
        resp = client.post('/category/', json={'name': 'Weird', 'color': 'neon-pink'},
                           headers=auth_headers)
        assert resp.status_code == 201
        assert resp.get_json()['data']['color'] == 'gray'

    def test_returns_401_without_auth(self, client):
        """Unauthenticated request returns 401."""
        resp = client.post('/category/', json={'name': 'NoAuth', 'color': 'blue'})
        assert resp.status_code == 401

    def test_response_contains_id(self, client, auth_headers):
        """Created category in the response includes an id field."""
        resp = client.post('/category/', json={'name': 'NewCat', 'color': 'orange'},
                           headers=auth_headers)
        assert resp.status_code == 201
        assert 'id' in resp.get_json()['data']


# ---------------------------------------------------------------------------
# DELETE /category/<id>
# ---------------------------------------------------------------------------

class TestDeleteCategoryEndpoint:

    def test_deletes_category_returns_200(self, client, auth_headers, sample_user, app):
        """Deleting an owned category returns 200 with a msg."""
        cat_id = _seed_category(app, sample_user['id'], 'ToRemove', 'gray')
        resp = client.delete(f'/category/{cat_id}', headers=auth_headers)
        assert resp.status_code == 200
        assert 'msg' in resp.get_json()

    def test_category_is_actually_removed_from_db(self, client, auth_headers, sample_user, app):
        """After DELETE the category no longer exists in the database."""
        cat_id = _seed_category(app, sample_user['id'], 'Gone', 'blue')
        client.delete(f'/category/{cat_id}', headers=auth_headers)
        with app.app_context():
            assert db.session.query(Category).filter_by(id=cat_id).first() is None

    def test_returns_404_for_nonexistent_id(self, client, auth_headers):
        """Deleting a category that does not exist returns 404."""
        resp = client.delete('/category/99999', headers=auth_headers)
        assert resp.status_code == 404
        assert 'error' in resp.get_json()

    def test_returns_404_for_other_users_category(self, client, auth_headers, app):
        """User cannot delete a category that belongs to someone else."""
        from app.models import User
        with app.app_context():
            other = User(name='Other', email='other@test.com', password='hash')
            db.session.add(other)
            db.session.commit()
            db.session.refresh(other)
            other_id = other.id
        cat_id = _seed_category(app, other_id, 'OtherCat', 'rose')
        resp = client.delete(f'/category/{cat_id}', headers=auth_headers)
        assert resp.status_code == 404

    def test_returns_401_without_auth(self, client, sample_user, app):
        """Unauthenticated request returns 401."""
        cat_id = _seed_category(app, sample_user['id'], 'Protected', 'teal')
        resp = client.delete(f'/category/{cat_id}')
        assert resp.status_code == 401
