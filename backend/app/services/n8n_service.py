import requests
from flask import current_app
from app.exceptions import BadRequestError

DEFAULT_CATEGORIES = [
    "Alimentación", "Transporte", "Ocio", "Ingresos", "Salud",
    "Ropa", "Hogar", "Suscripciones", "Restaurante", "Viajes",
    "Transferencia", "Otros"
]

# Mensajes que ve el usuario. Están acá, como constantes, porque el blueprint los
# devuelve tal cual (`jsonify({'error': str(e)})`): cualquier detalle interno que se
# cuele acá llega al cliente. Principio IV de la constitución y FR-012 de
# specs/008-fix-transaction-intent.
MSG_NOT_A_TRANSACTION = (
    "Eso no parece un gasto ni un ingreso. Probá algo como: «gasté 850 en el super»."
)
MSG_MISSING_AMOUNT = (
    "No pude identificar el importe. Probá incluirlo, por ejemplo: «gasté 850 en el super»."
)
MSG_UNINTERPRETABLE = (
    "No pudimos interpretar tu transacción. Probá reescribirla, "
    "por ejemplo: «gasté 850 en el super»."
)
MSG_SERVICE_UNAVAILABLE = (
    "No pudimos procesar tu transacción en este momento. Intentá de nuevo en un momento."
)

# El servicio de interpretación devuelve un código de un conjunto cerrado. El código
# NUNCA se concatena en la respuesta: se usa para ELEGIR uno de nuestros mensajes.
REJECTION_MESSAGES = {
    "not_a_transaction": MSG_NOT_A_TRANSACTION,
    "missing_amount": MSG_MISSING_AMOUNT,
}

_REQUIRED_FIELDS = {"description", "amount", "category", "is_income"}


def _parse_strict_bool(value):
    """Interpreta un booleano del servicio de IA de forma estricta.

    Acepta únicamente `True`/`False` reales, o exactamente las cadenas "true"/"false"
    (sin distinguir mayúsculas, tras `strip()`).

    CRÍTICO: no usar `bool()` para esto. En Python `bool("false") is True`, así que si
    el servicio devuelve la cadena "false" para `is_transaction`, `bool()` daría `True`
    y se registraría exactamente la entrada que hay que rechazar. El mismo descuido que
    hoy invertiría un signo en `is_income` acá anula el arreglo entero.

    Args:
        value: El valor crudo recibido del servicio de interpretación.

    Returns:
        True o False si el valor es interpretable; None si no lo es (número, cadena
        distinta, ausente...). Un None obliga a fallar cerrado.
    """
    if value is True or value is False:
        return value
    if isinstance(value, str):
        normalizado = value.strip().lower()
        if normalizado == "true":
            return True
        if normalizado == "false":
            return False
    return None


def _log_rejection(reason: str, raw_input: str) -> None:
    """Registra un rechazo del lado del servidor.

    FR-018: los rechazos tienen que quedar registrados con el motivo para poder medir
    falsos rechazos (SC-002) y detectar intentos de manipulación. Va al log y no a una
    tabla: los logs alcanzan para las dos cosas y no tocan el esquema.

    El texto del usuario se recorta: es dato suyo, no hace falta guardarlo entero.
    """
    current_app.logger.warning(
        "Transacción rechazada [%s] para la entrada: %r",
        reason,
        (raw_input or "")[:120],
    )


def _reject(reason: str, raw_input: str, message: str) -> None:
    """Loguea el rechazo y lo lanza como error de usuario. Nunca retorna."""
    _log_rejection(reason, raw_input)
    raise BadRequestError(message)


def parse_transaction_via_n8n(raw_input: str, user_categories: list[str] | None = None) -> dict:
    """Envía el texto de la transacción al servicio de IA y devuelve los datos estructurados.

    Incluye en el payload las categorías disponibles del usuario para que la IA
    elija la más apropiada entre ellas.

    El servicio puede responder de dos formas (ver
    specs/008-fix-transaction-intent/contracts/ai-interpretation.md):

      - Aceptación: {is_transaction: true, description, amount, category, is_income}
      - Rechazo:    {is_transaction: false, rejection_reason}

    Esta función **falla cerrado**: ante una respuesta dudosa, incompleta o no
    interpretable, rechaza. Y no se apoya solo en lo que el servicio afirma de sí
    mismo: verifica de forma independiente que la transacción propuesta esté completa
    y sea coherente (FR-005). Esa verificación es la que vale aunque el texto del
    usuario haya manipulado al servicio, porque acá no se interpreta lenguaje natural.

    Args:
        raw_input: Texto libre del usuario, ej: "Pagué 85€ en el super esta mañana".
        user_categories: Lista de nombres de categorías del usuario. Si está vacía
                         o es None, se usan las categorías por defecto.

    Returns:
        dict con: description (str), amount (float positivo), category (str), is_income (bool).

    Raises:
        BadRequestError: Si el texto no describe una transacción, si falta el importe,
                         o si la respuesta del servicio no es utilizable. El mensaje es
                         apto para mostrar al usuario.
        RuntimeError: Si el servicio no está configurado o no responde.
    """
    webhook_url = current_app.config.get("N8N_WEBHOOK_URL")
    if not webhook_url:
        # No se nombra la variable de entorno: es detalle de despliegue.
        current_app.logger.error(
            "El webhook del servicio de interpretación no está configurado."
        )
        raise RuntimeError(MSG_SERVICE_UNAVAILABLE)

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

    except requests.Timeout:
        current_app.logger.warning("Timeout al conectar con el servicio de interpretación.")
        raise RuntimeError(MSG_SERVICE_UNAVAILABLE)
    except requests.HTTPError as e:
        status = getattr(getattr(e, "response", None), "status_code", "desconocido")
        current_app.logger.warning(
            "El servicio de interpretación respondió con error %s.", status
        )
        raise RuntimeError(MSG_SERVICE_UNAVAILABLE)
    except requests.RequestException:
        # Nunca interpolar str(e) en el mensaje: arrastra la URL del webhook y el
        # detalle de la excepción de red (Principio IV). El detalle va al log.
        current_app.logger.exception("Fallo de red al conectar con el servicio de interpretación.")
        raise RuntimeError(MSG_SERVICE_UNAVAILABLE)

    # Un cuerpo que no es un objeto JSON es un fallo DEL SERVICIO, nunca culpa del
    # texto del usuario, así que se trata como "no disponible" (503) y no como
    # "reescribí tu transacción" (400).
    #
    # El caso no es hipotético: cuando el modelo agota su cuota, el webhook responde
    # 200 con el cuerpo VACÍO. `raise_for_status()` no lo detecta (es un 200). Si eso
    # se tradujera a un error de usuario, a alguien que escribió un gasto perfecto se
    # le pediría reescribirlo, y seguiría fallando por una razón que no está a su
    # alcance.
    try:
        data = response.json()
    except ValueError:
        cuerpo = (response.text or "").strip()
        if not cuerpo:
            current_app.logger.warning(
                "El servicio de interpretación devolvió 200 con el cuerpo vacío "
                "(típico de cuota agotada del modelo)."
            )
        else:
            current_app.logger.exception(
                "El servicio de interpretación devolvió un cuerpo que no es JSON: %r",
                cuerpo[:200],
            )
        raise RuntimeError(MSG_SERVICE_UNAVAILABLE)

    if not isinstance(data, dict):
        current_app.logger.warning(
            "El servicio de interpretación devolvió un tipo inesperado: %s", type(data).__name__
        )
        raise RuntimeError(MSG_SERVICE_UNAVAILABLE)

    # --- 1. ¿Es una transacción? -------------------------------------------------
    # Ausente => rechazo. No se asume `true`: es lo que obliga a publicar el workflow
    # antes de desplegar este backend (Decisión 6 de research.md).
    is_transaction = _parse_strict_bool(data.get("is_transaction"))

    if is_transaction is None:
        _reject("classification_unparseable", raw_input, MSG_NOT_A_TRANSACTION)

    if is_transaction is False:
        reason = data.get("rejection_reason")
        reason_key = reason if isinstance(reason, str) else ""
        _reject(
            reason_key or "not_a_transaction",
            raw_input,
            REJECTION_MESSAGES.get(reason_key, MSG_NOT_A_TRANSACTION),
        )

    # --- 2. Verificación independiente de la propuesta (FR-005) ------------------
    missing = _REQUIRED_FIELDS - set(data.keys())
    if missing:
        current_app.logger.warning(
            "Respuesta de aceptación incompleta, faltan: %s", ", ".join(sorted(missing))
        )
        _reject("incomplete_response", raw_input, MSG_UNINTERPRETABLE)

    # amount: presente, numérico y estrictamente mayor a cero.
    # Sin este chequeo un `amount: 0` queda guardado como un gasto de -0.0, que es
    # justamente lo que pasa hoy con una entrada como "hola". Atrapa el caso aunque
    # la clasificación afirme que sí es una transacción.
    amount_raw = data["amount"]
    if isinstance(amount_raw, bool):
        _reject("amount_not_numeric", raw_input, MSG_MISSING_AMOUNT)
    try:
        amount = abs(float(amount_raw))
    except (TypeError, ValueError):
        _reject("amount_not_numeric", raw_input, MSG_MISSING_AMOUNT)
    if amount <= 0:
        _reject("amount_not_positive", raw_input, MSG_MISSING_AMOUNT)

    description_raw = data["description"]
    description = "" if description_raw is None else str(description_raw).strip()
    if not description:
        _reject("blank_description", raw_input, MSG_UNINTERPRETABLE)

    # --- 3. Categoría: se mantiene el fallback existente -------------------------
    # Para una transacción que ya pasó todas las verificaciones, caer a la primera
    # categoría es razonable y no se cambia en este arreglo.
    returned_category = data.get("category", "")
    matched = next(
        (c for c in available_categories if c.lower() == str(returned_category).lower()),
        None
    )
    if not matched:
        current_app.logger.warning(
            f"El servicio devolvió una categoría no válida: '{returned_category}'. "
            f"Disponibles: {available_categories}. Usando la primera."
        )
    category = matched if matched else available_categories[0]

    return {
        "description": description[:50],
        "amount": amount,
        "category": category,
        # Deuda conocida: `is_income` comparte la trampa de bool("false") is True.
        # Endurecerlo es otro alcance (ver contracts/ai-interpretation.md).
        "is_income": bool(data["is_income"]),
    }
