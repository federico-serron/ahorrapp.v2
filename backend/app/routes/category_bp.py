from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.category_service import (
    get_categories_service,
    create_category_service,
    delete_category_service,
)
from app.exceptions import BadRequestError, NotFoundError, ConflictError

category_bp = Blueprint('category_bp', __name__)


@category_bp.route('/', methods=['GET'])
@jwt_required(locations=["cookies", "headers"])
def get_categories():
    """Devuelve todas las categorías del usuario autenticado.

    Returns:
        200: { data: [ { id, name, color } ] }
    """
    user_id = int(get_jwt_identity())
    try:
        categories = get_categories_service(user_id)
        return jsonify({'data': categories}), 200
    except Exception:
        return jsonify({'error': 'Error interno del servidor.'}), 500


@category_bp.route('/', methods=['POST'])
@jwt_required(locations=["cookies", "headers"])
def create_category():
    """Crea una nueva categoría para el usuario autenticado.

    Body JSON:
        name (str): Nombre de la categoría (máx. 30 caracteres).
        color (str): Color — emerald, teal, blue, violet, rose, orange, yellow, gray.

    Returns:
        201: { msg, data: { id, name, color } }
        400: { error }
        409: { error }
    """
    user_id = int(get_jwt_identity())
    body = request.get_json(silent=True)

    if not body or not body.get('name'):
        return jsonify({'error': 'El campo name es obligatorio.'}), 400

    try:
        category = create_category_service(
            user_id=user_id,
            name=body['name'],
            color=body.get('color', 'gray'),
        )
        return jsonify({'msg': 'Categoría creada.', 'data': category}), 201
    except ConflictError as e:
        return jsonify({'error': str(e)}), 409
    except BadRequestError as e:
        return jsonify({'error': str(e)}), 400
    except Exception:
        return jsonify({'error': 'Error interno del servidor.'}), 500


@category_bp.route('/<int:category_id>', methods=['DELETE'])
@jwt_required(locations=["cookies", "headers"])
def delete_category(category_id):
    """Elimina una categoría del usuario autenticado.

    Args:
        category_id (int): ID de la categoría a eliminar.

    Returns:
        200: { msg }
        404: { error }
    """
    user_id = int(get_jwt_identity())
    try:
        delete_category_service(user_id, category_id)
        return jsonify({'msg': 'Categoría eliminada.'}), 200
    except NotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception:
        return jsonify({'error': 'Error interno del servidor.'}), 500
