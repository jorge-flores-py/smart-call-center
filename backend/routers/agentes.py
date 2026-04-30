from fastapi import APIRouter
from services.agentes_service import agente_resumen_llamadas

router = APIRouter(
    prefix="/agentes",
    tags=["Agentes"]
)


@router.get("/resumen-llamadas")
def resumen_llamadas():
    return agente_resumen_llamadas()