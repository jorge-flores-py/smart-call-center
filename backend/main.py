from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from routers.agentes import router as agentes_router


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"


app = FastAPI(
    title="Smart Call Center API",
    version="1.0.0"
)

app.include_router(agentes_router)

if FRONTEND_DIR.exists():
    app.mount(
        "/dashboard",
        StaticFiles(directory=FRONTEND_DIR, html=True),
        name="dashboard",
    )


@app.get("/")
def home():
    return {
        "mensaje": "Smart Call Center API funcionando correctamente"
    }
