from collections import defaultdict
from datetime import date, datetime, timezone, timedelta
from sqlalchemy import select
from app import db
from app.models import Transaction
from app.exceptions import BadRequestError


def get_analytics_service(user_id: int, start_date: date, end_date: date) -> dict:
    """Devuelve datos agregados para los gráficos de analíticas.

    Agrupa por día si el rango es <= 31 días, por mes si es mayor.
    Solo incluye transacciones del usuario autenticado.

    Args:
        user_id: ID del usuario autenticado.
        start_date: Fecha de inicio del rango (inclusive).
        end_date: Fecha de fin del rango (inclusive).

    Returns:
        dict con:
          - by_date: lista de { date, income, expenses } ordenada cronológicamente.
          - by_category: lista de { category, total, count } ordenada por total desc.
          - group_by: 'day' | 'month'
          - summary: { total_income, total_expenses, balance }
    """
    if start_date > end_date:
        raise BadRequestError('La fecha de inicio no puede ser posterior a la fecha de fin.')

    start_dt = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=timezone.utc)
    end_dt = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=timezone.utc)

    rows = db.session.execute(
        select(Transaction.date, Transaction.amount, Transaction.category)
        .where(Transaction.user_id == user_id)
        .where(Transaction.date >= start_dt)
        .where(Transaction.date <= end_dt)
        .order_by(Transaction.date)
    ).all()

    delta_days = (end_date - start_date).days
    group_by = 'day' if delta_days <= 31 else 'month'

    # Agregación por período
    period_data: dict[str, dict] = defaultdict(lambda: {'income': 0.0, 'expenses': 0.0})
    category_data: dict[str, dict] = defaultdict(lambda: {'total': 0.0, 'count': 0})
    total_income = 0.0
    total_expenses = 0.0

    for row in rows:
        key = row.date.strftime('%Y-%m-%d') if group_by == 'day' else row.date.strftime('%Y-%m')

        if row.amount >= 0:
            period_data[key]['income'] = round(period_data[key]['income'] + row.amount, 2)
            total_income = round(total_income + row.amount, 2)
        else:
            abs_amount = abs(row.amount)
            period_data[key]['expenses'] = round(period_data[key]['expenses'] + abs_amount, 2)
            total_expenses = round(total_expenses + abs_amount, 2)
            if row.category:
                category_data[row.category]['total'] = round(category_data[row.category]['total'] + abs_amount, 2)
                category_data[row.category]['count'] += 1

    by_date = [
        {'date': k, 'income': v['income'], 'expenses': v['expenses']}
        for k, v in sorted(period_data.items())
    ]

    by_category = sorted(
        [{'category': k, 'total': v['total'], 'count': v['count']} for k, v in category_data.items()],
        key=lambda x: x['total'],
        reverse=True,
    )

    return {
        'by_date': by_date,
        'by_category': by_category,
        'group_by': group_by,
        'summary': {
            'total_income': total_income,
            'total_expenses': total_expenses,
            'balance': round(total_income - total_expenses, 2),
        },
    }
