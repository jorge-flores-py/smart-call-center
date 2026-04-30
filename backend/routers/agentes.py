from fastapi import APIRouter
from services.supervisor_service import agente_supervisor
from services.agentes_service import (
    agente_resumen_llamadas,
    agente_tiempos_skill,
    agente_asesores,
    agente_calidad,
    agente_eficiencia,
    agente_anomalias
)

router = APIRouter(
    prefix="/agentes",
    tags=["Agentes"]
)

@router.get("/supervisor")
def supervisor():
    return agente_supervisor()

@router.get("/resumen-llamadas")
def resumen_llamadas():
    return agente_resumen_llamadas()


@router.get("/tiempos-skill")
def tiempos_skill():
    return agente_tiempos_skill()


@router.get("/asesores")
def asesores():
    return agente_asesores()


@router.get("/calidad")
def calidad():
    return agente_calidad()


@router.get("/eficiencia")
def eficiencia():
    return agente_eficiencia()


@router.get("/anomalias")
def anomalias():
    return agente_anomalias()