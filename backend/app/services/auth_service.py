from app import db, bcrypt
from app.models import User
from app.exceptions import NotFoundError, UnauthorizedError, BadRequestError, ConflictError
from datetime import timedelta
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity


def create_user_service(**kwargs):
    
    required_fields = ['email', 'password']
    missing_fields = [field for field in required_fields if kwargs.get(field) in [None, ""]]
    
    if missing_fields:
        raise BadRequestError(f"Missing required fields: {', '.join(missing_fields)}")
    
    email = kwargs.get('email')
    password = kwargs.get('password')
    
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        raise ConflictError("This email is already in use, please try a different one.")
    
    password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    new_user = User(email=email, password=password_hash)
    
    db.session.add(new_user)
    db.session.commit()
    
    return new_user.serialize()


def login_user_service(email, password):
    
    if not email or not password:
        raise BadRequestError("Email and password are required.")
    
    user = User.query.filter_by(email=email).first()
    if not user:
        raise NotFoundError(f"No user found with email {email}")

    password_from_db = user.password
    true_o_false = bcrypt.check_password_hash(password_from_db, password)
        
    if true_o_false:
        expires = timedelta(days=1)

        user_id = user.id
        access_token = create_access_token(identity=str(user_id), expires_delta=expires)
        
        return access_token
    else:
        raise ConflictError("Incorrect username and/or password.")
    
def edit_user_service(user_id, **kwargs):
    
    user = User.query.filter_by(id=user_id).first()
    if not user:
        raise NotFoundError("User not found.")
    
    editable_fields = ['password']
    for key, value in kwargs.items():
        if key == 'password':
            password_hash = bcrypt.generate_password_hash(value).decode('utf-8')
            setattr(user, key, password_hash)
        elif key in editable_fields and value:
            setattr(user, key, value)
        else:
            raise BadRequestError(f"You cannot edit the field {key}")
        
    db.session.commit()
    
    return user.serialize()