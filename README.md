# 🚀 Fullstack Flask + React (Vite) — Guía de Inicio Rápido

![Flask](https://img.shields.io/badge/Flask-000?logo=flask&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=FFD62E)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
[![Build & Push Docker Image](https://github.com/federico-serron/ahorrapp.v2/actions/workflows/docker-latest.yml/badge.svg)](https://github.com/federico-serron/ahorrapp.v2/actions/workflows/docker-latest.yml)

---

Este proyecto es una aplicación fullstack que utiliza Flask para el backend y React (con Vite) para el frontend. Puedes iniciar ambos proyectos por separado en modo desarrollo o usar Docker Compose para levantar todo el stack.

## 🛠️ Requisitos previos

- 🐍 Python 3.11+
- 🟦 Node.js 18+ y npm
- 🐳 (Opcional) Docker y Docker Compose

---

## 📦 1. Clonar el repositorio

```bash
git clone https://github.com/federico-serron/fserron-fullstack-starter.git
cd fserron-fullstack-starter
```

---

## 🐍 2. Inicializar el Backend (Flask)

### 1. Configurar variables de entorno (¡haz esto primero!)

Asegúrate de tener los archivos `.env` necesarios en cada carpeta (`backend` y `frontend`). Puedes usar los archivos `.env.example` como guía para crear tu propio `.env`, o simplemente renombrarlos a `.env` en cada carpeta.

📋 **Ejemplo para backend/.env:**

- Para usar SQLite (fácil, recomendado para pruebas):
  ```
  FLASK_APP=app/run.py
  FLASK_ENV=development
  SECRET_KEY=your-secret-key-here
  JWT_SECRET_KEY=secret_key
  DATABASE_URL=sqlite:///app.db
  ```
- Para usar PostgreSQL (recomendado para producción):
  ```
  FLASK_APP=app/run.py
  FLASK_ENV=production
  SECRET_KEY=your-secret-key-here
  JWT_SECRET_KEY=secret_key
  DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/mydatabase
  ```
  Cambia `usuario`, `contraseña` y `mydatabase` por los datos de tu base de datos.

> **Importante:** Para producción, pon `FLASK_ENV=production` para mayor seguridad y rendimiento.

📋 **Ejemplo para frontend/.env:**
```
VITE_BACKEND_URL=http://localhost:5100
VITE_BASENAME=/
```

---

2. Entra a la carpeta backend:
   ```bash
   cd backend
   ```

   Luego crea y activa un entorno virtual (recomendado):

   **Windows:**
   ```bash
   python -m venv venv
   source venv\Scripts\activate
   ```
   **Linux/Mac:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Instalar las dependencias:

   ```bash
   pip install -r requirements.txt
   ```

4. Configurar la base de datos:

   - Si quieres usar **SQLite** (por defecto), no necesitas instalar nada extra.
   - Si quieres usar **PostgreSQL**, primero debes instalar PostgreSQL en tu computadora y crear una base de datos vacía (por ejemplo, llamada `mydatabase`).

5. Crear las tablas de la base de datos (importante si usas PostgreSQL!):

   - Entra a la carpeta backend (si aun no estas alli):
     ```bash
     cd backend
     ```
   - Ejecuta:
     ```bash
     flask db init   # solo la primera vez
     flask db migrate
     flask db upgrade
     ```
   Esto creará todas las tablas necesarias en tu base de datos.

6. Iniciar el backend:

   ```bash
   python -m app.run
   ```

   El backend estará disponible en: [http://localhost:5100](http://localhost:5100)

---

## ⚛️ 3. Inicializar el Frontend (React + Vite)

**En una nueva terminal** 🎛️ (deja la terminal del backend abierta y abre una nueva para estos pasos)

1. Entrar a la carpeta del frontend:

   ```bash
   cd frontend
   ```

2. Instalar dependencias:

   ```bash
   npm install
   ```

3. Iniciar el frontend:

   ```bash
   npm run dev
   ```

   El frontend estará disponible en: [http://localhost:5173](http://localhost:5173)

---


## 🐳 5. (Opcional) Usar Docker Compose para producción

Si prefieres levantar todo con Docker Compose:

```bash
docker-compose up --build
```

- Esto levantará el la app en **localhost:5100**.
- Docker usará el archivo `frontend/.env.prod` para generar los archivos estáticos de React automáticamente.

---

## 🗂️ 6. Estructura del proyecto

```
backend/
  app/
    app.py
    ...
  requirements.txt
frontend/
  src/
    ...
  package.json
  ...
docker-compose.yml
README.md
```

---

## 💡 7. Notas y pasos finales

- Si usas PostgreSQL, asegúrate de tenerlo instalado y corriendo antes de hacer las migraciones.
- Si cambias las variables de entorno, reinicia el servidor correspondiente.
- Para producción, pon `FLASK_ENV=production` y usa una base de datos real como PostgreSQL.
- Docker hace todo más fácil, pero igual podes correr todo a mano si queres!
- Si tenes problemas de CORS, asegúrate de que el backend tenga habilitado CORS.
- Si ves algún error, revisa bien los pasos y que todas las variables de entorno estén bien escritas.

---

## 🏁 Resumen rápido para levantar todo

1. **Descarga el proyecto y entra a la carpeta**
2. **Copia y edita los archivos `.env` en `backend/` y `frontend/` según lo que quieras usar (SQLite o PostgreSQL)**
3. **Si usas Docker:**
   - Asegurate de tener los archivos .env correspondientes.
   - Solo corre:
     ```bash
     docker-compose up --build
     ```
   - ¡Listo! Todo funciona solo.
4. **Si NO usas Docker:**
   - Sigue los pasos de backend y frontend arriba, y no te olvides de las migraciones si usas PostgreSQL.
5. **Para producción:**
   - Pon `FLASK_ENV=production` en el backend.
   - Usa PostgreSQL y configura bien tus contraseñas.

🎉 ¡Listo! Ahora puedes desarrollar y probar tu aplicación fullstack Flask + React.

---

## 🐳 CI/CD

Cada push a la rama `master` dispara el workflow de GitHub Actions (`.github/workflows/docker-latest.yml`) que construye la imagen Docker y la publica automáticamente en Docker Hub como `fedesu/ahorrapp:latest`.

Watchtower (corriendo en el servidor de producción) detecta la nueva imagen y recrea el contenedor automáticamente.

---


  <b>✨ Hecho con ❤️ por Fede</b> <br/>
  <sub>Con una mención especial a <b>[David Cunha](https://www.youtube.com/telodigoencodigo)</b> 🙌</sub>
</p>
