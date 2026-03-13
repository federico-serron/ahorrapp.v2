from app import db
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Integer, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from typing import Optional


class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    email: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(60), nullable=False)
    last_login: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now(timezone.utc))
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)

    transactions: Mapped[list['Transaction']] = relationship('Transaction', back_populates='user', lazy='dynamic')
    categories: Mapped[list['Category']] = relationship('Category', back_populates='user', lazy='dynamic')

    def serialize(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'last_login': self.last_login,
            'is_active': self.is_active,
        }


class Transaction(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id'), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)  # negativo = gasto, positivo = ingreso
    category: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    raw_input: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # texto original del usuario
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)

    user: Mapped['User'] = relationship('User', back_populates='transactions')

    def serialize(self):
        return {
            'id': self.id,
            'description': self.description,
            'amount': self.amount,
            'category': self.category,
            'raw_input': self.raw_input,
            'date': self.date.isoformat(),
        }
        # Nota: user_id no se expone — el frontend no lo necesita


class Category(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id'), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(30), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default='gray')

    user: Mapped['User'] = relationship('User', back_populates='categories')

    def serialize(self):
        return {
            'id': self.id,
            'name': self.name,
            'color': self.color,
        }
    