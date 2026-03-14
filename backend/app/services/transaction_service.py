from app import db
from app.models import Transaction, Category
from app.exceptions import BadRequestError
from app.services.n8n_service import parse_transaction_via_n8n
from datetime import datetime, timezone
from sqlalchemy import select

PER_PAGE_MAX = 50


def get_transactions_service(user_id: int, page: int = 1, per_page: int = 5):
    """Devuelve una página de transacciones del usuario usando Flask-SQLAlchemy paginate().

    Args:
        user_id: ID del usuario autenticado.
        page: Número de página (base 1).
        per_page: Registros por página (máx. PER_PAGE_MAX).

    Returns:
        Tupla (lista de transacciones serializadas, dict de metadatos de paginación).
    """
    per_page = min(max(per_page, 1), PER_PAGE_MAX)
    page = max(page, 1)

    pagination = (
        db.session.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.date.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    meta = {
        'page': pagination.page,
        'per_page': pagination.per_page,
        'total': pagination.total,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }

    return [t.serialize() for t in pagination.items], meta


def create_transaction_service(user_id: int, raw_input: str):
    """Crea una transacción a partir de texto en lenguaje natural.

    Delega el procesamiento del lenguaje natural a n8n vía webhook.
    n8n extrae: descripción, importe, categoría y si es ingreso o gasto.
    El importe se almacena negativo para gastos y positivo para ingresos.

    Args:
        user_id: ID del usuario autenticado (obtenido del JWT, nunca del cliente).
        raw_input: Texto libre del usuario, ej: "Pagué 85€ en el super esta mañana".
    """
    if not raw_input or not raw_input.strip():
        raise BadRequestError("El texto de la transacción es obligatorio.")

    # Obtener categorías personalizadas del usuario para pasarlas a n8n
    user_category_names = (
        db.session.execute(
            select(Category.name)
            .where(Category.user_id == user_id)
            .order_by(Category.name)
        )
        .scalars()
        .all()
    )

    parsed = parse_transaction_via_n8n(raw_input.strip(), user_category_names or None)

    # El signo del importe depende de si es ingreso o gasto
    amount = parsed["amount"]
    if not parsed["is_income"]:
        amount = -amount

    transaction = Transaction(
        user_id=user_id,
        description=parsed["description"],
        amount=round(amount, 2),
        category=parsed["category"],
        raw_input=raw_input.strip(),
        date=datetime.now(timezone.utc),
    )
    db.session.add(transaction)
    db.session.commit()
    return transaction.serialize()
