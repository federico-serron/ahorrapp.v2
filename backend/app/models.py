from app import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(255))
    
    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email
        }