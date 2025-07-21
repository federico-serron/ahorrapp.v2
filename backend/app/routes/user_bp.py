from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from app.models import User
from app import bcrypt
from app.services.auth_service import create_user_service, login_user_service, edit_user_service
from app.exceptions import NotFoundError, UnauthorizedError, ConflictError, BadRequestError
from app.blacklist import BLACKLIST

user_bp = Blueprint('user', __name__)

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
    
    except Exception as e:
        return jsonify({'error': 'Error creating user: ' + str(e)}), 500


@user_bp.route('/login', methods=['POST'])
def login():
    try:
        email = request.json.get('email')
        password = request.json.get('password')
        
        login_successfull_token = login_user_service(email, password)
        return jsonify({"msg": "You have successfully logged in!", "access_token": login_successfull_token}), 200

    except BadRequestError as e:
        return jsonify({'error': str(e)}), 400

    except ConflictError as e:
        return jsonify({'error': str(e)}), 400

    except NotFoundError as e:
        return jsonify({'error': str(e)}), 404

    except Exception as e:
        return {"error":"Error attempting to log in: " + str(e)}, 500
    
    
@user_bp.route('/edit', methods=['PUT'])
@jwt_required()
def edit_user():
    
    user_id = get_jwt_identity()
    
    try:
        data = request.get_json()
        
        edited_user = edit_user_service(user_id, **data)
        return jsonify({"msg": "User edited successfully", "user": edited_user}), 200

    except BadRequestError as e:
        return jsonify({'error': str(e)}), 400

    except NotFoundError as e:
        return jsonify({'error': str(e)}), 404

    except Exception as e:
        return {"error":"Error updating your data: " + str(e)}, 500
    
    
@user_bp.route('/users')
@jwt_required()  
def show_users():
    current_user_id = get_jwt_identity()
    if current_user_id:
        users = User.query.all()
        user_list = []
        for user in users:
            user_list.append(user.serialize())
        return jsonify(user_list), 200
    else:
        return {"error": "Invalid or missing token"}, 401
    
    
@user_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    
    try:
        jti = get_jwt()["jti"]
        BLACKLIST.add(jti)
        return jsonify({"msg": "Session ended"}), 200
        
    except Exception as e:
        return jsonify({"error": "For some reason we could not end your session!"}), 500