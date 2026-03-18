import re
from app import db, bcrypt
from app.models import User
from app.exceptions import NotFoundError, UnauthorizedError, BadRequestError, ConflictError
from datetime import timedelta
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

_NAME_RE  = re.compile(r'^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$')
_PHONE_RE = re.compile(r'^\+?\d+$')


def create_user_service(**kwargs):
    """
    Creates a new user in the database.

    Receives:
        **kwargs: Dictionary with required user fields ('email', 'password').

    Returns:
        dict -> The serialized newly created user.

    Raises:
        BadRequestError: If required fields are missing.
        ConflictError: If the email already exists in the database.
    """
    
    required_fields = ['name', 'email', 'password']
    missing_fields = [field for field in required_fields if kwargs.get(field) in [None, ""]]
    
    if missing_fields:
        raise BadRequestError(f"Missing required fields: {', '.join(missing_fields)}")
    
    name = kwargs.get('name')
    email = kwargs.get('email')
    password = kwargs.get('password')
    
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        raise ConflictError("This email is already in use, please try a different one.")
    
    password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    new_user = User(name=name, email=email, password=password_hash)
    
    db.session.add(new_user)
    db.session.commit()
    
    return new_user.serialize()


def login_user_service(email, password):
    """
    Authenticates a user and generates a JWT access token if the credentials are correct.

    Receives:
        email (str): The user's email.
        password (str): The user's password.

    Returns:
        str -> A JWT access token valid for 1 day.

    Raises:
        BadRequestError: If email or password are missing.
        NotFoundError: If no user exists with the provided email.
        ConflictError: If the password is incorrect.
    """
    
    if not email or not password:
        raise BadRequestError("Email and password are required.")
    
    user = User.query.filter_by(email=email).first()
    if not user:
        raise NotFoundError(f"Incorrect username and/or password.")

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
    """
    Edits the data of an existing user.

    Receives:
        user_id (int): ID of the user to edit.
        **kwargs: Fields to update (currently only 'password' is editable).

    Returns:
        dict -> The serialized user after editing.

    Raises:
        NotFoundError: If the user does not exist.
        BadRequestError: If trying to edit a non-editable field.
    """
    
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


def update_profile_service(user_id, name=None, phone=None):
    """
    Updates name and/or phone for the authenticated user.

    Receives:
        user_id (int): ID of the user to update.
        name (str | None): New name. If provided must be non-empty and contain only letters.
        phone (str | None): New phone. If provided must contain only digits and optional leading +.
                            Empty string clears the field.

    Returns:
        dict -> The serialized user after editing.

    Raises:
        NotFoundError: If the user does not exist.
        BadRequestError: If name or phone fail validation.
    """
    user = db.session.get(User, int(user_id))
    if not user:
        raise NotFoundError("User not found.")

    if name is not None:
        name = name.strip()
        if not name:
            raise BadRequestError("El nombre no puede estar vacío.")
        if not _NAME_RE.match(name):
            raise BadRequestError("El nombre solo puede contener letras.")
        user.name = name

    if phone is not None:
        phone = phone.strip()
        if phone == '':
            user.phone = None
        elif not _PHONE_RE.match(phone):
            raise BadRequestError("El teléfono solo puede contener números y el símbolo +.")
        else:
            user.phone = phone

    db.session.commit()
    return user.serialize()


def is_user_admin(user_id):
    user = User.query.filter_by(id=user_id).first()
    
    if not user or user is None:
        raise NotFoundError("No existe el usuario con este email")
    
    if user.role != 'admin':
        raise UnauthorizedError("Usuario no tiene permisos para acceder")
    
    return True
