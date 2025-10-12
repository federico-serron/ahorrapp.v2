from flask import Blueprint, request, jsonify
import requests
from app.services.paypal_service import get_access_token, create_order_service
from app.exceptions import NotFoundError, UnauthorizedError, ConflictError, BadRequestError


paypal_bp = Blueprint('paypal', __name__)


@paypal_bp.route('/create-order', methods=['POST'])
def create_order():
    
    try:
        data = request.get_json()
        amount = data.get('amount', "10.00")
        access_token = get_access_token()
    
        response = create_order_service(amount, access_token)
    
        return jsonify(response.json()), response.status_code
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500