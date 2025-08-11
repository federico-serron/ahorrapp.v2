from app import create_app, db
from flask import send_from_directory
import os

app = create_app()
static_folder = app.static_folder

# Creating sqlite DB if it doesn't exists yet
if app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite'):
    sqlite_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
    sqlite_dir = os.path.dirname(sqlite_path)
    if sqlite_dir and not os.path.exists(sqlite_dir):
        os.makedirs(sqlite_dir, exist_ok=True)
    if not os.path.exists(sqlite_path):
        with app.app_context():
            db.create_all()
        print(f"[INFO] Base de datos creada en: {sqlite_path}")

@app.route('/')
def serve_root():
    return send_from_directory(static_folder, 'index.html')

@app.route('/<path:path>')
def serve_react_app(path):
    full_path = os.path.join(static_folder, path)
    if os.path.exists(full_path):
        return send_from_directory(static_folder, path)
    else:
        return send_from_directory(static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5100)
