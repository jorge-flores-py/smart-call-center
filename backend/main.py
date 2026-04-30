from fastapi import FastAPI
from routers.agentes import router as agentes_router

app = FastAPI(
    title="Smart Call Center API",
    version="1.0.0"
)

app.include_router(agentes_router)


@app.get("/")
def home():
    return {
        "mensaje": "Smart Call Center API funcionando correctamente"
    }