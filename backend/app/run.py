from app import create_app, db
from flask import send_from_directory
import os

app = create_app()
static_folder = app.static_folder

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
