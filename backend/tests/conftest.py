import os

# CRÍTICO: create_app() elige la Config según FLASK_ENV y Flask-SQLAlchemy crea el
# engine dentro de db.init_app(app). Para cuando la fixture recibe la app, el engine
# ya está atado a esa base: sobrescribir SQLALCHEMY_DATABASE_URI después NO tiene
# efecto. Como la fixture `db` termina con drop_all(), apuntar sin querer a la base
# de desarrollo hacía que cada corrida de pytest la vaciara (pasó de verdad: las
# tablas user/transaction/category desaparecieron de Postgres y hubo que
# reconstruirlas con `flask db stamp base && flask db upgrade`).
#
# Por eso el entorno se fija ANTES de importar/crear la app. load_dotenv() no pisa
# variables ya presentes en os.environ, así que esto le gana al FLASK_ENV del .env
# y create_app() carga TestingConfig -> sqlite:///:memory:.
os.environ['FLASK_ENV'] = 'testing'

import pytest
from app import create_app, db as _db
from app.models import User, Category, Transaction
from flask_bcrypt import Bcrypt


@pytest.fixture(scope='session')
def app():
    """Crea la aplicación Flask con configuración de testing (SQLite en memoria)."""
    app = create_app()

    # Red de seguridad: si por lo que sea la app quedó apuntando a una base que no
    # es SQLite en memoria, abortamos antes de que create_all()/drop_all() toquen
    # datos reales.
    uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    assert uri == 'sqlite:///:memory:', (
        f"Los tests deben correr contra SQLite en memoria, no contra {uri!r}. "
        "La fixture `db` hace drop_all() al terminar y borraría esa base."
    )

    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'testing-secret'
    app.config['JWT_COOKIE_SECURE'] = False
    app.config['JWT_TOKEN_LOCATION'] = ['cookies', 'headers']
    app.config['N8N_WEBHOOK_URL'] = 'http://mock-n8n/webhook'
    return app


@pytest.fixture(scope='session')
def db(app):
    """Crea todas las tablas una vez por sesión de tests."""
    with app.app_context():
        _db.create_all()
        yield _db
        _db.drop_all()


@pytest.fixture(autouse=True)
def clean_db(db):
    """Limpia todas las tablas antes de cada test para garantizar aislamiento."""
    yield
    db.session.rollback()
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()


@pytest.fixture
def client(app):
    """Cliente HTTP de Flask para tests de endpoints."""
    return app.test_client()


@pytest.fixture
def app_ctx(app):
    """Contexto de aplicación para tests que acceden directamente a servicios."""
    with app.app_context():
        yield


@pytest.fixture
def sample_user(db, app):
    """Crea un usuario de prueba en la base de datos."""
    with app.app_context():
        bcrypt = Bcrypt(app)
        user = User(
            name='Test User',
            email='test@example.com',
            password=bcrypt.generate_password_hash('password123').decode('utf-8'),
        )
        db.session.add(user)
        db.session.commit()
        # Refrescar para asegurar que el id está disponible fuera del contexto
        db.session.refresh(user)
        return {'id': user.id, 'email': user.email, 'name': user.name}


@pytest.fixture
def auth_headers(client, app, sample_user):
    """Realiza login y devuelve headers con cookie JWT lista para usar."""
    with app.app_context():
        resp = client.post('/user/login', json={
            'email': sample_user['email'],
            'password': 'password123',
        })
        assert resp.status_code == 200, f"Login failed: {resp.get_json()}"
        # Extraer cookie del header Set-Cookie
        cookies = resp.headers.getlist('Set-Cookie')
        cookie_header = '; '.join(
            c.split(';')[0] for c in cookies if 'access_token_cookie' in c
        )
        return {'Cookie': cookie_header}
