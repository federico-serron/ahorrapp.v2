"""Unit tests for backend/app/services/transaction_service.py.

Tests cover:
  - get_transactions_service
  - create_transaction_service

parse_transaction_via_n8n is always mocked — no real HTTP calls are made.
"""
import pytest
from unittest.mock import patch, MagicMock
from app import db
from app.models import Transaction, User
from app.services.transaction_service import (
    get_transactions_service,
    create_transaction_service,
    LIMIT_MAX,
)
from app.exceptions import BadRequestError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

N8N_PATCH = 'app.services.transaction_service.parse_transaction_via_n8n'


def _make_user(app, suffix='a') -> int:
    """Insert a minimal User row and return its id."""
    with app.app_context():
        user = User(
            name=f'User {suffix}',
            email=f'txuser{suffix}@test.com',
            password='hashed',
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user.id


def _make_transaction(app, user_id: int, description: str = 'Coffee',
                      amount: float = -2.50, category: str = 'Food') -> int:
    """Insert a Transaction row directly and return its id."""
    from datetime import datetime, timezone
    with app.app_context():
        tx = Transaction(
            user_id=user_id,
            description=description,
            amount=amount,
            category=category,
            raw_input=description,
            date=datetime.now(timezone.utc),
        )
        db.session.add(tx)
        db.session.commit()
        db.session.refresh(tx)
        return tx.id


def _mock_n8n(description='Test', amount=10.0, category='Otros', is_income=False) -> dict:
    """Return a valid n8n parsed response dict."""
    return {
        'description': description,
        'amount': amount,
        'category': category,
        'is_income': is_income,
    }


# ---------------------------------------------------------------------------
# get_transactions_service
# ---------------------------------------------------------------------------

class TestGetTransactionsService:

    def test_returns_empty_list_when_no_transactions(self, app):
        """User with no transactions gets an empty list and total=0."""
        uid = _make_user(app, 'gt1')
        with app.app_context():
            txs, total = get_transactions_service(uid)
        assert txs == []
        assert total == 0

    def test_returns_transactions_for_user(self, app):
        """All transactions belonging to the user are returned."""
        uid = _make_user(app, 'gt2')
        _make_transaction(app, uid, 'Bus', -1.5)
        _make_transaction(app, uid, 'Salary', 2000.0)
        with app.app_context():
            txs, total = get_transactions_service(uid)
        assert len(txs) == 2
        assert total == 2

    def test_does_not_return_other_users_transactions(self, app):
        """Transactions from another user are not included."""
        uid1 = _make_user(app, 'gt3a')
        uid2 = _make_user(app, 'gt3b')
        _make_transaction(app, uid1, 'Mine', -5.0)
        _make_transaction(app, uid2, 'Theirs', -3.0)
        with app.app_context():
            txs, total = get_transactions_service(uid1)
        assert total == 1
        assert txs[0]['description'] == 'Mine'

    def test_transactions_are_ordered_by_date_descending(self, app):
        """Most recent transaction appears first."""
        from datetime import datetime, timezone, timedelta
        uid = _make_user(app, 'gt4')
        with app.app_context():
            older = Transaction(
                user_id=uid, description='Older', amount=-1.0, category='Otros',
                raw_input='', date=datetime(2024, 1, 1, tzinfo=timezone.utc)
            )
            newer = Transaction(
                user_id=uid, description='Newer', amount=-2.0, category='Otros',
                raw_input='', date=datetime(2024, 6, 1, tzinfo=timezone.utc)
            )
            db.session.add_all([older, newer])
            db.session.commit()
        with app.app_context():
            txs, _ = get_transactions_service(uid)
        assert txs[0]['description'] == 'Newer'
        assert txs[1]['description'] == 'Older'

    def test_limit_restricts_number_of_results(self, app):
        """Limit parameter caps the returned page size."""
        uid = _make_user(app, 'gt5')
        for i in range(5):
            _make_transaction(app, uid, f'Tx{i}', -i)
        with app.app_context():
            txs, total = get_transactions_service(uid, limit=3)
        assert len(txs) == 3
        assert total == 5  # total counts all rows

    def test_offset_paginates_results(self, app):
        """Offset skips the specified number of rows."""
        from datetime import datetime, timezone, timedelta
        uid = _make_user(app, 'gt6')
        base = datetime(2024, 1, 1, tzinfo=timezone.utc)
        with app.app_context():
            for i in range(4):
                db.session.add(Transaction(
                    user_id=uid, description=f'Tx{i}', amount=-float(i),
                    category='Otros', raw_input='',
                    date=base + timedelta(days=i)
                ))
            db.session.commit()
        with app.app_context():
            txs_page1, _ = get_transactions_service(uid, limit=2, offset=0)
            txs_page2, _ = get_transactions_service(uid, limit=2, offset=2)
        # pages must not overlap
        ids_p1 = {t['id'] for t in txs_page1}
        ids_p2 = {t['id'] for t in txs_page2}
        assert ids_p1.isdisjoint(ids_p2)
        assert len(txs_page2) == 2

    def test_limit_clamped_to_limit_max(self, app):
        """Requesting more than LIMIT_MAX rows is silently capped."""
        uid = _make_user(app, 'gt7')
        for i in range(5):
            _make_transaction(app, uid, f'Tx{i}', -1.0)
        with app.app_context():
            txs, _ = get_transactions_service(uid, limit=LIMIT_MAX + 999)
        # We only have 5 rows — the important thing is no error is raised
        assert len(txs) == 5

    def test_limit_minimum_is_one(self, app):
        """Passing limit=0 or negative is clamped to 1."""
        uid = _make_user(app, 'gt8')
        _make_transaction(app, uid, 'Tx', -1.0)
        with app.app_context():
            txs, _ = get_transactions_service(uid, limit=0)
        assert len(txs) == 1

    def test_serialized_shape_contains_expected_keys(self, app):
        """Each returned transaction dict has the expected keys."""
        uid = _make_user(app, 'gt9')
        _make_transaction(app, uid, 'Market', -20.0)
        with app.app_context():
            txs, _ = get_transactions_service(uid)
        keys = set(txs[0].keys())
        assert {'id', 'description', 'amount', 'category', 'raw_input', 'date'}.issubset(keys)

    def test_total_reflects_full_dataset_regardless_of_limit(self, app):
        """total always reflects the total row count, not just the current page."""
        uid = _make_user(app, 'gt10')
        for i in range(10):
            _make_transaction(app, uid, f'Tx{i}', -1.0)
        with app.app_context():
            txs, total = get_transactions_service(uid, limit=3, offset=0)
        assert total == 10
        assert len(txs) == 3


# ---------------------------------------------------------------------------
# create_transaction_service
# ---------------------------------------------------------------------------

class TestCreateTransactionService:

    def test_creates_expense_transaction(self, app):
        """Expense (is_income=False) is stored with a negative amount."""
        uid = _make_user(app, 'ct1')
        parsed = _mock_n8n(description='Supermarket', amount=85.30,
                           category='Alimentación', is_income=False)
        with patch(N8N_PATCH, return_value=parsed):
            with app.app_context():
                result = create_transaction_service(uid, 'Pagué 85€ en el super')
        assert result['amount'] == -85.30
        assert result['description'] == 'Supermarket'

    def test_creates_income_transaction(self, app):
        """Income (is_income=True) is stored with a positive amount."""
        uid = _make_user(app, 'ct2')
        parsed = _mock_n8n(description='Salary', amount=2400.0,
                           category='Ingresos', is_income=True)
        with patch(N8N_PATCH, return_value=parsed):
            with app.app_context():
                result = create_transaction_service(uid, 'Cobré nómina 2400€')
        assert result['amount'] == 2400.0

    def test_amount_is_rounded_to_two_decimals(self, app):
        """Amount is rounded to 2 decimal places before storage."""
        uid = _make_user(app, 'ct3')
        parsed = _mock_n8n(amount=10.123456, is_income=False)
        with patch(N8N_PATCH, return_value=parsed):
            with app.app_context():
                result = create_transaction_service(uid, 'test')
        assert result['amount'] == round(-10.123456, 2)

    def test_raw_input_is_stored_on_transaction(self, app):
        """The original raw_input text is persisted on the transaction."""
        uid = _make_user(app, 'ct4')
        raw = 'Bought coffee for 3€'
        parsed = _mock_n8n(description='Coffee', amount=3.0)
        with patch(N8N_PATCH, return_value=parsed):
            with app.app_context():
                result = create_transaction_service(uid, raw)
        assert result['raw_input'] == raw

    def test_raises_bad_request_for_empty_input(self, app):
        """An empty string raises BadRequestError without calling n8n."""
        uid = _make_user(app, 'ct5')
        with patch(N8N_PATCH) as mock_n8n:
            with app.app_context():
                with pytest.raises(BadRequestError):
                    create_transaction_service(uid, '')
            mock_n8n.assert_not_called()

    def test_raises_bad_request_for_whitespace_only_input(self, app):
        """A whitespace-only string raises BadRequestError without calling n8n."""
        uid = _make_user(app, 'ct6')
        with patch(N8N_PATCH) as mock_n8n:
            with app.app_context():
                with pytest.raises(BadRequestError):
                    create_transaction_service(uid, '   ')
            mock_n8n.assert_not_called()

    def test_propagates_bad_request_from_n8n(self, app):
        """If n8n returns a BadRequestError it propagates to the caller."""
        uid = _make_user(app, 'ct7')
        with patch(N8N_PATCH, side_effect=BadRequestError('n8n could not parse')):
            with app.app_context():
                with pytest.raises(BadRequestError):
                    create_transaction_service(uid, 'some text')

    def test_propagates_runtime_error_from_n8n(self, app):
        """If n8n raises a RuntimeError (timeout/network) it propagates."""
        uid = _make_user(app, 'ct8')
        with patch(N8N_PATCH, side_effect=RuntimeError('Timeout')):
            with app.app_context():
                with pytest.raises(RuntimeError):
                    create_transaction_service(uid, 'some text')

    def test_n8n_is_called_with_stripped_input(self, app):
        """Leading/trailing whitespace is stripped from raw_input before passing to n8n."""
        uid = _make_user(app, 'ct9')
        parsed = _mock_n8n()
        with patch(N8N_PATCH, return_value=parsed) as mock_n8n:
            with app.app_context():
                create_transaction_service(uid, '  hello world  ')
        mock_n8n.assert_called_once_with('hello world')

    def test_transaction_is_persisted_in_db(self, app):
        """After creation the transaction exists in the database."""
        uid = _make_user(app, 'ct10')
        parsed = _mock_n8n(description='Gym', amount=30.0, category='Salud',
                           is_income=False)
        with patch(N8N_PATCH, return_value=parsed):
            with app.app_context():
                result = create_transaction_service(uid, 'Paid gym')
        with app.app_context():
            tx = db.session.query(Transaction).filter_by(id=result['id']).first()
        assert tx is not None
        assert tx.description == 'Gym'

    def test_serialized_result_has_expected_keys(self, app):
        """Return value contains id, description, amount, category, raw_input, date."""
        uid = _make_user(app, 'ct11')
        parsed = _mock_n8n()
        with patch(N8N_PATCH, return_value=parsed):
            with app.app_context():
                result = create_transaction_service(uid, 'test')
        assert {'id', 'description', 'amount', 'category', 'raw_input', 'date'}.issubset(
            result.keys()
        )

    def test_category_from_n8n_is_stored(self, app):
        """The category returned by n8n is stored on the transaction."""
        uid = _make_user(app, 'ct12')
        parsed = _mock_n8n(category='Transporte', is_income=False, amount=2.0)
        with patch(N8N_PATCH, return_value=parsed):
            with app.app_context():
                result = create_transaction_service(uid, 'Bus ticket')
        assert result['category'] == 'Transporte'
