from flask import Blueprint, request, jsonify
from app.services.paypal_service import get_access_token, create_order_service
from app.exceptions import NotFoundError, UnauthorizedError, ConflictError, BadRequestError
from flask_jwt_extended import get_jwt_identity


paypal_bp = Blueprint('paypal', __name__)


@paypal_bp.route('/create-order', methods=['POST'])
def create_order():
    
    try:
        data = request.get_json()
        amount = data.get('amount', "10.00")
        access_token = get_access_token()
    
        response = create_order_service(amount, access_token)
    
        return jsonify(response.json()), response.status_code
    
    except BadRequestError as e:
        return jsonify({'error': str(e)}), 400

    except Exception as e:
        return {"error": str(e)}, 500
    
    
    
@paypal_bp.route('/capture-order', methods=['POST'])
def capture_order():
    try:
        #user_id = get_jwt_identity()
        data = request.get_json()
        order_id = data.get("order_id")
        access_token = get_access_token()
        
        response = capture_order_service(order_id, access_token)
        data = response.json()
        
        return jsonify(data), response.status_code
    
    except BadRequestError as e:
        return jsonify({'error': str(e)}), 400

    except NotFoundError as e:
        return jsonify({'error': str(e)}), 404

    except Exception as e:
        return {"error": str(e)}, 500