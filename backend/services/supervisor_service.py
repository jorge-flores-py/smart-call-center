import json
from openai_client import client

from services.agentes_service import (
    agente_resumen_llamadas,
    agente_tiempos_skill,
    agente_asesores,
    agente_calidad,
    agente_eficiencia,
    agente_anomalias,
)


def agente_supervisor():
    """
    Agente supervisor.

    Ejecuta los agentes disponibles, consolida sus resultados
    y usa OpenAI para generar un diagnóstico ejecutivo.
    """

    resultado_resumen = agente_resumen_llamadas()
    resultado_tiempos = agente_tiempos_skill()
    resultado_asesores = agente_asesores()
    resultado_calidad = agente_calidad()
    resultado_eficiencia = agente_eficiencia()
    resultado_anomalias = agente_anomalias()

    datos_supervisor = {
        "resumen_operativo": {
            "kpis": resultado_resumen.get("kpis", {}),
            "detalle_por_skill": resultado_resumen.get("detalle_por_skill", [])[:10],
        },
        "tiempos_skill": {
            "kpis": resultado_tiempos.get("kpis", {}),
            "alertas": resultado_tiempos.get("alertas", [])[:10],
            "detalle_por_skill": resultado_tiempos.get("detalle_por_skill", [])[:10],
        },
        "asesores": {
            "kpis": resultado_asesores.get("kpis", {}),
            "top_asesores_por_llamadas": resultado_asesores.get("top_asesores_por_llamadas", [])[:10],
            "top_asesores_por_tiempo": resultado_asesores.get("top_asesores_por_tiempo", [])[:10],
        },
        "calidad": {
            "kpis": resultado_calidad.get("kpis", {}),
            "calidad_por_skill": resultado_calidad.get("calidad_por_skill", [])[:10],
        },
        "eficiencia": {
            "kpis": resultado_eficiencia.get("kpis", {}),
            "alertas": resultado_eficiencia.get("alertas", [])[:10],
            "top_skills_por_espera": resultado_eficiencia.get("top_skills_por_espera", [])[:10],
            "top_skills_por_abandono": resultado_eficiencia.get("top_skills_por_abandono", [])[:10],
            "top_departamentos_por_abandono": resultado_eficiencia.get("top_departamentos_por_abandono", [])[:10],
        },
        "anomalias": {
            "kpis": resultado_anomalias.get("kpis", {}),
            "anomalias_por_skill": resultado_anomalias.get("anomalias_por_skill", [])[:10],
            "top_casos_criticos": resultado_anomalias.get("top_casos_criticos", [])[:10],
        },
    }

    prompt = f"""
Actuá como agente supervisor de una plataforma multiagente para monitoreo de atención al cliente.

Tu tarea es interpretar los resultados consolidados de distintos agentes analíticos.

Datos disponibles:
{json.dumps(datos_supervisor, ensure_ascii=False, indent=2)}

Generá un informe ejecutivo en español con esta estructura:

1. Diagnóstico general
2. Principales hallazgos operativos
3. Problemas de eficiencia detectados
4. Problemas de calidad detectados
5. Anomalías o casos críticos relevantes
6. Desempeño de asesores
7. Skills o áreas prioritarias
8. Recomendaciones accionables
9. Prioridad de intervención
10. Conclusión final

Reglas:
- No inventes datos.
- Usá solo la información recibida.
- No menciones que faltan datos si están disponibles en el JSON.
- Si algún bloque viene vacío, indicalo de forma breve.
- Redactá con tono profesional, claro y ejecutivo.
"""

    respuesta = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    uso_tokens = getattr(respuesta, "usage", None)

    return {
        "agente": "supervisor_llm",
        "modelo": "gpt-4.1-mini",
        "agentes_analizados": list(datos_supervisor.keys()),
        "datos_analizados": datos_supervisor,
        "informe": respuesta.output_text,
        "uso_tokens": {
            "input_tokens": getattr(uso_tokens, "input_tokens", None) if uso_tokens else None,
            "output_tokens": getattr(uso_tokens, "output_tokens", None) if uso_tokens else None,
            "total_tokens": getattr(uso_tokens, "total_tokens", None) if uso_tokens else None,
        }
    }