from fastapi import APIRouter
from services.agentes_service import (
    agente_resumen_llamadas,
    agente_tiempos_skill,
    agente_asesores
)

router = APIRouter(
    prefix="/agentes",
    tags=["Agentes"]
)


@router.get("/resumen-llamadas")
def resumen_llamadas():
    return agente_resumen_llamadas()


@router.get("/tiempos-skill")
def tiempos_skill():
    return agente_tiempos_skill()


@router.get("/asesores")
def asesores():
    return agente_asesores()