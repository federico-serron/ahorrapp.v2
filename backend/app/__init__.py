import os
from flask import Flask
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from dotenv import load_dotenv
from app.config import DevelopmentConfig, ProductionConfig, TestingConfig

load_dotenv()
# Instancias que se inicializan más adelante
db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()
migrate = Migrate()

def create_app():
    
    """
    We define static_folder because Flask is going to serve the front end files(Only in PRODUCTION!) since we are running everything from a single Dockerfile in production
    """
    static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'front/build')
    app = Flask(__name__, static_folder=static_file_dir)

    # Configuración básica
    enviroment = os.getenv("FLASK_ENV", "production")
    if enviroment == "development":
        app.config.from_object(DevelopmentConfig)
    elif enviroment == "testing":
        app.config.from_object(TestingConfig)
    else:
        app.config.from_object(ProductionConfig)
        

    # Extensiones
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db, compare_type=True)

    # Solo crear la base de datos si es SQLite
    db_url = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if db_url.startswith('sqlite'):
        # Asegurarse que la carpeta de la base exista
        sqlite_path = db_url.replace('sqlite:///', '')
        sqlite_dir = os.path.dirname(sqlite_path)
        if sqlite_dir and not os.path.exists(sqlite_dir):
            os.makedirs(sqlite_dir)
        # Crear las tablas
        with app.app_context():
            db.create_all()

    # Registramos blueprints
    from app.routes.admin_bp import admin_bp
    from app.routes.public_bp import public_bp
    from app.routes.user_bp import user_bp
    
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(public_bp, url_prefix='/public')
    app.register_blueprint(user_bp, url_prefix='/user')

    return app
