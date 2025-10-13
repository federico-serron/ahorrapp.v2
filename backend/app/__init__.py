import os
from flask import Flask
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from dotenv import load_dotenv
from app.config import DevelopmentConfig, ProductionConfig, TestingConfig

# Instancias que se inicializan más adelante
db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()
migrate = Migrate()

def create_app():
    
    load_dotenv()
    """
    We define static_folder because Flask is going to serve the front end files(Only in PRODUCTION!) since we are running everything from a single Dockerfile in production
    """
    static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'front/build')
    app = Flask(__name__, static_folder=static_file_dir)

    # Configuración básica
    enviroment = os.getenv("FLASK_ENV", "development")
    if enviroment == "production":
        env_file = "env.prod"
        app.config.from_object(ProductionConfig)
    elif enviroment == "testing":
        app.config.from_object(TestingConfig)
    else:
        env_file = ".env.dev"
        app.config.from_object(DevelopmentConfig)
        

    # Extensiones
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db, compare_type=True)

    # Creacion carpeta de DB si no existe y si se usa SQLite
    db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance', 'mydatabase.db')
    if not os.path.exists(os.path.dirname(db_path)):
        os.makedirs(os.path.dirname(db_path))

    #app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
        
    # Registramos blueprints
    from app.routes.public_bp import public_bp
    from app.routes.user_bp import user_bp
    from app.routes.paypal_bp import paypal_bp
    
    
    app.register_blueprint(public_bp, url_prefix='/public')
    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(paypal_bp, url_prefix='/paypal')

    return app
