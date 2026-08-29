from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt, set_access_cookies, unset_jwt_cookies
from app.models import User
from app import bcrypt, db
from app.services.auth_service import create_user_service, login_user_service, edit_user_service, update_profile_service, is_user_admin
from app.exceptions import NotFoundError, UnauthorizedError, ConflictError, BadRequestError
from app.blacklist import BLACKLIST

user_bp = Blueprint('user', __name__)


@user_bp.route('/me', methods=['GET'])
@jwt_required(locations=["cookies"])
def me():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "authenticated": True,
        "role": user.role,
        **user.serialize(),
    }), 200


@user_bp.route('/me', methods=['PUT'])
@jwt_required(locations=["cookies"])
def update_me():
    user_id = int(get_jwt_identity())

    try:
        data = request.get_json(silent=True) or {}
        name  = data.get('name',  None)
        phone = data.get('phone', None)

        if name is None and phone is None:
            raise BadRequestError("Se debe enviar al menos un campo para actualizar.")

        updated_user = update_profile_service(user_id, name=name, phone=phone)
        return jsonify({"msg": "Perfil actualizado correctamente.", "user": updated_user}), 200

    except BadRequestError as e:
        return jsonify({"error": str(e)}), 400

    except NotFoundError as e:
        return jsonify({"error": str(e)}), 404

    except Exception:
        current_app.logger.exception("Error inesperado actualizando el perfil.")
        return jsonify({"error": "Error interno del servidor."}), 500
    

@user_bp.route('/signup', methods=['POST'])
def create_user():
    try:
    
        data = request.get_json()
        new_user = create_user_service(**data)
        return jsonify({'msg': 'User created successfully!','user':new_user}), 201
    
    except ConflictError as e:
        return jsonify({'error': str(e)}), 400
    
    except BadRequestError as e:
        return jsonify({'error': str(e)}), 400
    
    except Exception:
        current_app.logger.exception("Error inesperado creando el usuario.")
        return jsonify({'error': 'Error interno del servidor.'}), 500


@user_bp.route('/login', methods=['POST'])
def login():
    try:
        email = request.json.get('email')
        password = request.json.get('password')
        
        login_successfull_token = login_user_service(email, password)
        resp = jsonify({"msg": "You have successfully logged in!", "access_token": login_successfull_token, "user": email })
        
        set_access_cookies(resp, login_successfull_token)
        return resp, 200

    except BadRequestError as e:
        return jsonify({'error': str(e)}), 400

    except ConflictError as e:
        return jsonify({'error': str(e)}), 400

    except NotFoundError as e:
        return jsonify({'error': str(e)}), 404

    except Exception:
        current_app.logger.exception("Error inesperado en el login.")
        return jsonify({"error": "Error interno del servidor."}), 500
    
    
@user_bp.route('/edit', methods=['PUT'])
@jwt_required(locations=["cookies"])
def edit_user():

    user_id = int(get_jwt_identity())
    
    try:
        data = request.get_json()
        
        edited_user = edit_user_service(user_id, **data)
        return jsonify({"msg": "User edited successfully", "user": edited_user}), 200

    except BadRequestError as e:
        return jsonify({'error': str(e)}), 400

    except NotFoundError as e:
        return jsonify({'error': str(e)}), 404

    except Exception:
        current_app.logger.exception("Error inesperado editando el usuario.")
        return jsonify({"error": "Error interno del servidor."}), 500
    
    
@user_bp.route('/users')
@jwt_required(locations=["cookies"])
def show_users():
    user_id = int(get_jwt_identity())

    try:
        is_user_admin(user_id)
    except (UnauthorizedError, NotFoundError):
        return jsonify({"error": "Usuario no tiene permisos para acceder"}), 403

    users = User.query.all()
    user_list = [user.serialize() for user in users]
    return jsonify(user_list), 200
    
    
@user_bp.route("/logout", methods=["POST"])
@jwt_required(locations=["cookies"])
def logout():
    
    try:
        #jti = get_jwt()["jti"]
        #BLACKLIST.add(jti)
        
        resp = jsonify({"msg": "Session ended"})
        unset_jwt_cookies(resp)
        return resp, 200
        
    except Exception as e:
        return jsonify({"error": "For some reason we could not end your session!"}), 500