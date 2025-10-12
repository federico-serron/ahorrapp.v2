import os
from dotenv import load_dotenv

from backend.app.services.paypal_service import PAYPAL_RETURN_URL

load_dotenv()

class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = 'uploads'
    ENV = os.getenv("FLASK_ENV", "development")
    
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_COOKIE_NAME = "access_token_cookie"
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_CSRF_PROTECT = False
    
    PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "client_id")
    PAYPAL_SECRET = os.getenv("PAYPAL_SECRET", "secret")
    PAYPAL_API_BASE = os.getenv("PAYPAL_API_BASE", "url_base")
    PAYPAL_RETURN_URL = os.getenv("PAYPAL_RETURN_URL", "url_return")
    PAYPAL_CANCEL_URL = os.getenv("PAYPAL_CANCEL_URL", "cancel_url")

class DevelopmentConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    DEBUG = True
    JWT_COOKIE_SECURE = False
    CORS_ORIGINS = ["http://localhost:5173"]

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "testing-secret"
    JWT_COOKIE_SECURE = False
    CORS_ORIGINS = ["http://localhost:5173"]

class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    DEBUG = False
    JWT_COOKIE_SECURE = True
    CORS_ORIGINS = [
        os.getenv("FRONTEND_URL", "https://tu-url.com")
    ]