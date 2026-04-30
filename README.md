# Smart Call Center

Plataforma de analitica multiagente para operaciones de call center.

El proyecto expone una API en FastAPI, ejecuta agentes analiticos sobre datos operativos y de calidad, y consolida los resultados con un agente supervisor basado en OpenAI para generar un informe ejecutivo.

## Tecnologias

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- Starlette

### Datos y acceso a base

- Pandas
- NumPy
- SQLAlchemy
- psycopg2-binary
- Python Dotenv

### Machine Learning

- scikit-learn
- SciPy
- Joblib

### IA generativa

- OpenAI Python SDK
- Modelo usado por el supervisor: `gpt-4.1-mini`

### Frontend

- HTML
- CSS
- JavaScript vanilla
- `StaticFiles` de FastAPI para servir el dashboard en `/dashboard`

## Arquitectura

El backend incluye varios agentes especializados:

- `resumen-llamadas`
- `tiempos-skill`
- `asesores`
- `calidad`
- `eficiencia`
- `anomalias`

Sobre esos resultados corre un `agente_supervisor`, que consolida los hallazgos y redacta un informe ejecutivo.

## Estructura principal

```text
backend/
  main.py
  database.py
  openai_client.py
  routers/
    agentes.py
  services/
    agentes_service.py
    supervisor_service.py

frontend/
  index.html
  styles.css
  app.js
```

## Variables de entorno

El proyecto espera un archivo `backend/.env` con al menos:

```env
DATABASE_URL=postgresql://usuario:password@host:puerto/base
OPENAI_API_KEY=tu_api_key
```

## Como ejecutar

Desde la carpeta `backend`:

```bash
venv\Scripts\activate
uvicorn main:app --reload
```

## Rutas principales

- API base: `http://127.0.0.1:8000/`
- Documentacion Swagger: `http://127.0.0.1:8000/docs`
- Dashboard: `http://127.0.0.1:8000/dashboard/`

## Objetivo funcional

El tablero permite:

- ejecutar los agentes uno por uno
- seguir el progreso de la corrida
- visualizar KPIs, alertas y tablas por agente
- ver el informe final del supervisor en una vista ejecutiva
