from flask import current_app
from app import db
from app.models import User
from app.exceptions import NotFoundError, UnauthorizedError, BadRequestError, ConflictError
from datetime import timedelta
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity


PAYPAL_CLIENT_ID = current_app.config['PAYPAL_CLIENT_ID']
PAYPAL_SECRET = current_app.config['PAYPAL_SECRET']
PAYPAL_API_BASE = current_app.config['PAYPAL_API_BASE']
PAYPAL_RETURN_URL = current_app.config['PAYPAL_RETURN_URL']
PAYPAL_CANCEL_URL = current_app.config['PAYPAL_CANCEL_URL']

def get_access_token():
        
    response = requests.post(
        f"{PAYPAL_API_BASE}/v1/oauth2/token",
        headers={"Accept": "application/json"},
        data={"grant_type": "client_credentials"},
        auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET)
    )
    
    if response.json().get("error"):
        raise BadRequestError(response.json().get("error"))
    
    return response.json()["access_token"]
    

def create_order_service(amount, access_token):
    
    if int(amount) <= 0 or not access_token:
        raise BadRequestError("Invalid amount or access token")
    else:
        response = requests.post(
            f"{PAYPAL_API_BASE}/v2/checkout/orders",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            },
            json={
                "intent": "CAPTURE",
                "purchase_units": [{"amount": {"value": f"{amount:.2f}", "currency_code": "USD"}}],
                "application_context": {
                    "return_url": PAYPAL_RETURN_URL,
                    "cancel_url": PAYPAL_CANCEL_URL,
                },
            }
        )
        
        return response
        
        
def capture_order_service(order_id, access_token):
    if not order_id or not access_token:
        raise BadRequestError("Missing required information.")
    else:
        response = requests.post(
            f"{PAYPAL_API_BASE}/v2/checkout/orders/{order_id}/capture",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            }
        )
        
        data = response.json()
        
        """
        if data.get("status") == "COMPLETED" and user_id:
            user = User.query.filter_by(id=user_id).first()
            if not user:
                raise NotFoundError("User not found.")
            user.is_premium == True
            db.session.commit()
        """
            
        return response