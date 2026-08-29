import os
from dotenv import load_dotenv

load_dotenv()


def _as_bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}

class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = 'uploads'
    ENV = os.getenv("FLASK_ENV", "development")
    
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_COOKIE_NAME = "access_token_cookie"
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "Lax")
    JWT_COOKIE_DOMAIN = os.getenv("JWT_COOKIE_DOMAIN") or None
    JWT_COOKIE_CSRF_PROTECT = False  # sobreescrito a True en ProductionConfig
    
    N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")

class DevelopmentConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    DEBUG = True
    JWT_COOKIE_SECURE = _as_bool(os.getenv("JWT_COOKIE_SECURE"), False)
    CORS_ORIGINS = ["http://localhost:5173"]

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "testing-secret"
    JWT_COOKIE_SECURE = _as_bool(os.getenv("JWT_COOKIE_SECURE"), False)
    CORS_ORIGINS = ["http://localhost:5173"]

class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    DEBUG = False
    JWT_COOKIE_SECURE = _as_bool(os.getenv("JWT_COOKIE_SECURE"), True)
    JWT_COOKIE_CSRF_PROTECT = _as_bool(os.getenv("JWT_COOKIE_CSRF_PROTECT"), True)
    CORS_ORIGINS = [os.getenv("FRONTEND_URL", "https://tu-url.com")]