# Etapa 1: Build frontend
FROM node:20-alpine as frontend-builder
WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Etapa 2: Backend + Gunicorn
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copiar todo el backend
COPY backend/ ./backend/

# Copiar el build del frontend al lugar donde Flask lo sirve
COPY --from=frontend-builder /app/dist ./backend/app/front/build

ENV FLASK_APP=app/run.py

EXPOSE 5100

#CMD ["gunicorn", "--chdir", "backend", "app.run:app", "--bind", "0.0.0.0:5100", "--workers", "4", "--worker-class", "gevent"]
CMD bash -c "cd backend && flask db upgrade && gunicorn app.run:app --bind 0.0.0.0:5100 --workers 2 --worker-class gevent"
