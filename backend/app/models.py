from app import db
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from typing import Optional


class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(60), nullable=False)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    last_login: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now(timezone.utc))
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    
    def serialize(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'last_login': self.last_login,
            'is_active': self.is_active,
        }
    