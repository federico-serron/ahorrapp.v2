from app import db, bcrypt
from app.models import User
from app.exceptions import NotFoundError, UnauthorizedError, BadRequestError, ConflictError
from datetime import timedelta
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity


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