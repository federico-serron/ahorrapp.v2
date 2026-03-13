from app import db
from app.models import Category
from app.exceptions import BadRequestError, NotFoundError, ConflictError

VALID_COLORS = {
    'emerald', 'teal', 'blue', 'violet', 'rose', 'orange', 'yellow', 'gray'
}

MAX_CATEGORIES_PER_USER = 50


def get_categories_service(user_id: int) -> list[dict]:
    """Devuelve todas las categorías del usuario ordenadas por nombre.

    Args:
        user_id: ID del usuario autenticado.

    Returns:
        Lista de categorías serializadas.
    """
    categories = (
        db.session.query(Category)
        .filter_by(user_id=user_id)
        .order_by(Category.name)
        .all()
    )
    return [c.serialize() for c in categories]


def create_category_service(user_id: int, name: str, color: str) -> dict:
    """Crea una nueva categoría para el usuario.

    Args:
        user_id: ID del usuario autenticado.
        name: Nombre de la categoría (máx. 30 caracteres).
        color: Color de la categoría (debe ser uno de VALID_COLORS).

    Returns:
        Categoría creada serializada.

    Raises:
        BadRequestError: Si el nombre está vacío o el color es inválido.
        ConflictError: Si ya existe una categoría con ese nombre para el usuario.
        BadRequestError: Si el usuario alcanzó el límite de categorías.
    """
    name = name.strip()[:30] if name else ''
    if not name:
        raise BadRequestError('El nombre de la categoría no puede estar vacío.')

    if color not in VALID_COLORS:
        color = 'gray'

    # Comprobar duplicado (case-insensitive) para este usuario
    existing = (
        db.session.query(Category)
        .filter_by(user_id=user_id)
        .filter(db.func.lower(Category.name) == name.lower())
        .first()
    )
    if existing:
        raise ConflictError(f'Ya tienes una categoría llamada "{name}".')

    # Límite de categorías por usuario
    count = db.session.query(Category).filter_by(user_id=user_id).count()
    if count >= MAX_CATEGORIES_PER_USER:
        raise BadRequestError(f'Límite de {MAX_CATEGORIES_PER_USER} categorías por usuario alcanzado.')

    category = Category(user_id=user_id, name=name, color=color)
    db.session.add(category)
    db.session.commit()
    return category.serialize()


def delete_category_service(user_id: int, category_id: int) -> None:
    """Elimina una categoría del usuario.

    Args:
        user_id: ID del usuario autenticado.
        category_id: ID de la categoría a eliminar.

    Raises:
        NotFoundError: Si la categoría no existe o no pertenece al usuario.
    """
    category = (
        db.session.query(Category)
        .filter_by(id=category_id, user_id=user_id)
        .first()
    )
    if not category:
        raise NotFoundError('Categoría no encontrada.')

    db.session.delete(category)
    db.session.commit()
