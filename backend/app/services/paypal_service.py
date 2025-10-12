from flask import current_app
from app import db
from app.models import User
from app.exceptions import NotFoundError, UnauthorizedError, BadRequestError, ConflictError
from datetime import timedelta
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity


PAYPAL_CLIENT_ID = current_app.config['PAYPAL_CLIENT_ID']
PAYPAL_SECRET = current_app.config['PAYPAL_SECRET']
PAYPAL_API_BASE = current_app.config['PAYPAL_API_BASE']


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
            body={
                "intent": "CAPTURE",
                "purchase_units": [{"amount": {"value": f"{amount:.2f}", "currency_code": "USD"}}]
            }
        )