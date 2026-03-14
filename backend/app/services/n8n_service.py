import requests
from flask import current_app
from app.exceptions import BadRequestError

DEFAULT_CATEGORIES = [
    "Alimentación", "Transporte", "Ocio", "Ingresos", "Salud",
    "Ropa", "Hogar", "Suscripciones", "Restaurante", "Viajes",
    "Transferencia", "Otros"
]


def parse_transaction_via_n8n(raw_input: str, user_categories: list[str] | None = None) -> dict:
    """Envía el texto de la transacción al webhook de n8n y devuelve los datos estructurados.

    Incluye en el payload las categorías disponibles del usuario para que la IA
    elija la más apropiada entre ellas.

    Args:
        raw_input: Texto libre del usuario, ej: "Pagué 85€ en el super esta mañana".
        user_categories: Lista de nombres de categorías del usuario. Si está vacía
                         o es None, se usan las categorías por defecto.

    Returns:
        dict con: description (str), amount (float positivo), category (str), is_income (bool).

    Raises:
        BadRequestError: Si n8n no puede interpretar el texto o la respuesta es inválida.
        RuntimeError: Si el webhook no está configurado o no responde.
    """
    webhook_url = current_app.config.get("N8N_WEBHOOK_URL")
    if not webhook_url:
        raise RuntimeError("N8N_WEBHOOK_URL no está configurada en las variables de entorno.")

    available_categories = user_categories if user_categories else DEFAULT_CATEGORIES

    try:
        response = requests.post(
            webhook_url,
            json={
                "raw_input": raw_input,
                "categories": available_categories,
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

    except requests.Timeout:
        raise RuntimeError("Timeout al conectar con n8n. Inténtalo de nuevo.")
    except requests.HTTPError as e:
        raise RuntimeError(f"n8n respondió con error {e.response.status_code}.")
    except requests.RequestException as e:
        raise RuntimeError(f"No se pudo conectar con n8n: {str(e)}")

    # Validar que la respuesta tiene los campos esperados
    required_fields = {"description", "amount", "category", "is_income"}
    missing = required_fields - set(data.keys())
    if missing:
        raise BadRequestError(f"Respuesta de n8n incompleta. Faltan campos: {', '.join(missing)}")

    # Validar que la categoría devuelta está en la lista enviada (case-insensitive)
    returned_category = data.get("category", "")
    matched = next(
        (c for c in available_categories if c.lower() == returned_category.lower()),
        None
    )
    if not matched:
        current_app.logger.warning(
            f"n8n devolvió categoría no válida: '{returned_category}'. "
            f"Disponibles: {available_categories}. Usando la primera."
        )
    category = matched if matched else available_categories[0]

    return {
        "description": str(data["description"]).strip()[:50],
        "amount": abs(float(data["amount"])),
        "category": category,
        "is_income": bool(data["is_income"]),
    }
