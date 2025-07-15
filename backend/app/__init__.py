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

    app = Flask(__name__, static_folder="front/build", static_url_path="/")

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

    # Creamos carpeta de base de datos si no existe
    db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance', 'mydatabase.db')
    print(f"Ruta de la base de datos: {db_path}")
    if not os.path.exists(os.path.dirname(db_path)):
        os.makedirs(os.path.dirname(db_path))

    # Registramos blueprints
    from app.routes.admin_bp import admin_bp
    from app.routes.public_bp import public_bp
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(public_bp, url_prefix='/public')

    return app
