from datetime import date, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.transaction_service import get_transactions_service, create_transaction_service
from app.services.analytics_service import get_analytics_service
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
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 5, type=int)

    try:
        transactions, pagination = get_transactions_service(user_id, page, per_page)
        return jsonify({
            'data': transactions,
            'pagination': pagination,
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
    user_id = int(get_jwt_identity())
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


@transaction_bp.route('/analytics', methods=['GET'])
@jwt_required(locations=["cookies", "headers"])
def get_analytics():
    """Devuelve datos agregados para los gráficos de analíticas.

    Query params:
        start_date (str): Fecha inicio en formato YYYY-MM-DD (por defecto: primer día del mes actual).
        end_date   (str): Fecha fin en formato YYYY-MM-DD (por defecto: hoy).

    Returns:
        200: { by_date, by_category, group_by, summary }
        400: { error }
    """
    user_id = int(get_jwt_identity())
    today = date.today()

    start_str = request.args.get('start_date', today.replace(day=1).isoformat())
    end_str = request.args.get('end_date', today.isoformat())

    try:
        start_date = date.fromisoformat(start_str)
        end_date = date.fromisoformat(end_str)
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido. Usa YYYY-MM-DD.'}), 400

    try:
        data = get_analytics_service(user_id, start_date, end_date)
        return jsonify(data), 200
    except BadRequestError as e:
        return jsonify({'error': str(e)}), 400
    except Exception:
        return jsonify({'error': 'Error interno del servidor.'}), 500
