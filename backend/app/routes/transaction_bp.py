from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.transaction_service import get_transactions_service, create_transaction_service
from app.exceptions import BadRequestError

transaction_bp = Blueprint('transaction_bp', __name__)


@transaction_bp.route('/', methods=['GET'])
@jwt_required(locations=["cookies", "headers"])
def get_transactions():
    """Devuelve las transacciones paginadas del usuario autenticado.

    Autenticación: cookie JWT (web) o header Authorization: Bearer <token> (n8n/bots).

    Query params:
        limit (int): máximo de resultados (1-100, por defecto 50)
        offset (int): posición de inicio para paginación (por defecto 0)
    """
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    try:
        transactions, total = get_transactions_service(user_id, limit, offset)
        return jsonify({
            'data': transactions,
            'total': total,
            'limit': limit,
            'offset': offset,
        }), 200
    except BadRequestError as e:
        return jsonify({'error': str(e)}), 400
    except Exception:
        return jsonify({'error': 'Error interno del servidor.'}), 500


@transaction_bp.route('/', methods=['POST'])
@jwt_required(locations=["cookies", "headers"])
def create_transaction():
    """Crea una transacción a partir de texto en lenguaje natural.

    La IA (Claude Haiku) extrae automáticamente: descripción, importe, categoría
    y si es ingreso o gasto.

    Autenticación: cookie JWT (web) o header Authorization: Bearer <token> (n8n/bots).

    Body JSON:
        raw_input (str): descripción en lenguaje natural.
            Ej: "Pagué 85€ en el super esta mañana"
            Ej: "Cobré la nómina de marzo, 2400€"

    Returns:
        201: { msg, data: { id, description, amount, category, raw_input, date } }
        400: { error }
        500: { error }
    """
    user_id = get_jwt_identity()
    body = request.get_json(silent=True)

    if not body or not body.get('raw_input'):
        return jsonify({'error': 'El campo raw_input es obligatorio.'}), 400

    try:
        transaction = create_transaction_service(user_id, body['raw_input'])
        return jsonify({'msg': 'Transacción registrada.', 'data': transaction}), 201
    except BadRequestError as e:
        return jsonify({'error': str(e)}), 400
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 503
    except Exception:
        return jsonify({'error': 'Error interno del servidor.'}), 500
