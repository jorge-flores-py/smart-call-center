from services.data_service import obtener_df_agentes


def agente_resumen_llamadas():
    """
    Agente que resume el comportamiento operativo general de las llamadas.

    Calcula:
    - total de llamadas
    - total de skills
    - llamadas contestadas
    - llamadas abandonadas
    - canal con más llamadas
    - canal con mayor tasa de abandono
    - detalle por skill
    """

    df = obtener_df_agentes()

    resumen_skill = (
        df.groupby("skill")
        .agg(
            llamadas=("skill", "count"),
            asesores=("id_asesor", "nunique"),
            contestadas=("estado", lambda x: (x.fillna("").str.lower() == "contestada").sum()),
            abandonadas=("estado", lambda x: (x.fillna("").str.lower() == "abandonada").sum()),
        )
        .reset_index()
    )

    resumen_skill["prom_llamadas_por_asesor"] = (
        resumen_skill["llamadas"] / resumen_skill["asesores"]
    ).round(2)

    resumen_skill["tasa_abandono"] = (
        resumen_skill["abandonadas"] / resumen_skill["llamadas"]
    ).round(4)

    canal_mas_llamadas = resumen_skill.sort_values(
        "llamadas",
        ascending=False
    ).iloc[0]

    canal_mas_abandono = resumen_skill.sort_values(
        "tasa_abandono",
        ascending=False
    ).iloc[0]

    return {
        "agente": "resumen_operativo_llamadas",
        "kpis": {
            "total_llamadas": int(len(df)),
            "total_skills": int(df["skill"].nunique()),
            "total_contestadas": int((df["estado"].fillna("").str.lower() == "contestada").sum()),
            "total_abandonadas": int((df["estado"].fillna("").str.lower() == "abandonada").sum()),
            "canal_con_mas_llamadas": {
                "skill": canal_mas_llamadas["skill"],
                "llamadas": int(canal_mas_llamadas["llamadas"]),
            },
            "canal_con_mas_abandono": {
                "skill": canal_mas_abandono["skill"],
                "tasa_abandono": float(canal_mas_abandono["tasa_abandono"]),
                "abandonadas": int(canal_mas_abandono["abandonadas"]),
            },
            "promedio_llamadas_por_skill": round(float(resumen_skill["llamadas"].mean()), 2),
        },
        "detalle_por_skill": resumen_skill.sort_values(
            "llamadas",
            ascending=False
        ).to_dict(orient="records"),
    }

def agente_tiempos_skill():
    """
    Agente que analiza tiempos operativos por skill.

    Calcula:
    - promedio de espera
    - p95 de espera
    - promedio de conversación
    - p95 de conversación
    - promedio de documentación
    - p95 de documentación
    - alertas por tiempos superiores al promedio global
    """

    df = obtener_df_agentes()

    resumen = (
        df.groupby("skill")
        .agg(
            llamadas=("skill", "count"),
            tiempo_espera_promedio=("tiempo_de_espera", "mean"),
            tiempo_espera_p95=("tiempo_de_espera", lambda x: x.quantile(0.95)),
            tiempo_conversacion_promedio=("tiempo_conversacion", "mean"),
            tiempo_conversacion_p95=("tiempo_conversacion", lambda x: x.quantile(0.95)),
            tiempo_documentacion_promedio=("tiempo_documentacion", "mean"),
            tiempo_documentacion_p95=("tiempo_documentacion", lambda x: x.quantile(0.95)),
            tiempo_total_promedio=("tiempo_total", "mean"),
        )
        .reset_index()
        .round(2)
    )

    espera_global = df["tiempo_de_espera"].mean()
    conversacion_global = df["tiempo_conversacion"].mean()
    documentacion_global = df["tiempo_documentacion"].mean()

    alertas = []

    for _, row in resumen.iterrows():

        if row["tiempo_espera_promedio"] > espera_global * 1.3:
            alertas.append({
                "tipo": "espera_alta",
                "skill": row["skill"],
                "valor": float(row["tiempo_espera_promedio"]),
                "comentario": (
                    f"{row['skill']} presenta un tiempo de espera promedio alto "
                    f"({row['tiempo_espera_promedio']} seg), superior al promedio global "
                    f"({round(espera_global, 2)} seg)."
                )
            })

        if row["tiempo_conversacion_promedio"] > conversacion_global * 1.3:
            alertas.append({
                "tipo": "conversacion_extensa",
                "skill": row["skill"],
                "valor": float(row["tiempo_conversacion_promedio"]),
                "comentario": (
                    f"{row['skill']} tiene conversaciones más largas que el promedio "
                    f"({row['tiempo_conversacion_promedio']} seg)."
                )
            })

        if row["tiempo_documentacion_promedio"] > documentacion_global * 1.3:
            alertas.append({
                "tipo": "documentacion_alta",
                "skill": row["skill"],
                "valor": float(row["tiempo_documentacion_promedio"]),
                "comentario": (
                    f"{row['skill']} registra mayor tiempo de documentación "
                    f"({row['tiempo_documentacion_promedio']} seg)."
                )
            })

    return {
        "agente": "analisis_tiempos_skill",
        "kpis": {
            "total_llamadas": int(len(df)),
            "tiempo_espera_promedio_global": round(float(espera_global), 2),
            "tiempo_espera_p95_global": round(float(df["tiempo_de_espera"].quantile(0.95)), 2),
            "tiempo_conversacion_promedio_global": round(float(conversacion_global), 2),
            "tiempo_documentacion_promedio_global": round(float(documentacion_global), 2),
            "skill_mayor_espera": resumen.sort_values("tiempo_espera_promedio", ascending=False).iloc[0]["skill"],
            "skill_mayor_conversacion": resumen.sort_values("tiempo_conversacion_promedio", ascending=False).iloc[0]["skill"],
            "skill_mayor_documentacion": resumen.sort_values("tiempo_documentacion_promedio", ascending=False).iloc[0]["skill"],
        },
        "alertas": alertas,
        "detalle_por_skill": resumen.sort_values(
            "tiempo_espera_promedio",
            ascending=False
        ).to_dict(orient="records"),
    }

def agente_asesores():
    """
    Agente que analiza desempeño por asesor usando solo llamadas contestadas.

    Calcula:
    - total de asesores
    - total de llamadas atendidas
    - asesor con más llamadas
    - asesor con mayor tiempo promedio
    - promedio de llamadas por asesor
    - tiempo total promedio global
    """

    df = obtener_df_agentes()

    df_atendidas = df[
        df["estado"].fillna("").str.lower() == "contestada"
    ].copy()

    resumen = (
        df_atendidas.groupby(["id_asesor", "nombre_asesor"])
        .agg(
            llamadas=("id_llamada", "count"),
            tiempo_espera_promedio=("tiempo_de_espera", "mean"),
            tiempo_conversacion_promedio=("tiempo_conversacion", "mean"),
            tiempo_documentacion_promedio=("tiempo_documentacion", "mean"),
            tiempo_total_promedio=("tiempo_total", "mean"),
        )
        .reset_index()
        .round(2)
    )

    asesor_mas_llamadas = resumen.sort_values(
        "llamadas",
        ascending=False
    ).iloc[0]

    asesor_mas_tiempo = resumen.sort_values(
        "tiempo_total_promedio",
        ascending=False
    ).iloc[0]

    return {
        "agente": "desempeno_asesores",
        "kpis": {
            "total_asesores": int(resumen["id_asesor"].nunique()),
            "total_llamadas_atendidas": int(len(df_atendidas)),
            "asesor_con_mas_llamadas": {
                "id_asesor": asesor_mas_llamadas["id_asesor"],
                "nombre_asesor": asesor_mas_llamadas["nombre_asesor"],
                "llamadas": int(asesor_mas_llamadas["llamadas"]),
            },
            "asesor_con_mayor_tiempo_promedio": {
                "id_asesor": asesor_mas_tiempo["id_asesor"],
                "nombre_asesor": asesor_mas_tiempo["nombre_asesor"],
                "tiempo_total_promedio": float(asesor_mas_tiempo["tiempo_total_promedio"]),
            },
            "promedio_llamadas_por_asesor": round(
                float(resumen["llamadas"].mean()),
                2
            ),
            "tiempo_total_promedio_global": round(
                float(resumen["tiempo_total_promedio"].mean()),
                2
            ),
        },
        "top_asesores_por_llamadas": resumen.sort_values(
            "llamadas",
            ascending=False
        ).head(10).to_dict(orient="records"),
        "top_asesores_por_tiempo": resumen.sort_values(
            "tiempo_total_promedio",
            ascending=False
        ).head(10).to_dict(orient="records"),
    }
def agente_calidad():
    """
    Agente que analiza la calidad de atención a partir de las encuestas.

    Calcula:
    - cantidad de encuestas válidas
    - promedios de satisfacción, recomendación, claridad y solución
    - indicador más bajo
    - indicador más alto
    - casos con baja satisfacción
    - calidad promedio por skill
    """

    df = obtener_df_agentes()

    df_encuestas = df.dropna(
        subset=["satisfaccion", "recomendacion", "claridad", "solucion"],
        how="all"
    ).copy()

    indicadores = ["satisfaccion", "recomendacion", "claridad", "solucion"]

    promedios = df_encuestas[indicadores].mean().round(2).to_dict()

    indicador_mas_bajo = min(promedios, key=promedios.get)
    indicador_mas_alto = max(promedios, key=promedios.get)

    total_encuestas = len(df_encuestas)

    total_baja_satisfaccion = int(
        (df_encuestas["satisfaccion"].fillna(99) <= 2).sum()
    )

    porcentaje_baja_satisfaccion = round(
        total_baja_satisfaccion / total_encuestas * 100,
        2
    ) if total_encuestas > 0 else 0

    calidad_por_skill = (
        df_encuestas.groupby("skill")
        .agg(
            encuestas=("id_llamada", "count"),
            satisfaccion_promedio=("satisfaccion", "mean"),
            recomendacion_promedio=("recomendacion", "mean"),
            claridad_promedio=("claridad", "mean"),
            solucion_promedio=("solucion", "mean"),
            baja_satisfaccion=("baja_satisfaccion", "sum"),
        )
        .reset_index()
        .round(2)
    )

    calidad_por_skill["porcentaje_baja_satisfaccion"] = (
        calidad_por_skill["baja_satisfaccion"]
        / calidad_por_skill["encuestas"]
        * 100
    ).round(2)

    skill_menor_satisfaccion = calidad_por_skill.sort_values(
        "satisfaccion_promedio",
        ascending=True
    ).iloc[0]

    return {
        "agente": "calidad_atencion",
        "kpis": {
            "total_encuestas": int(total_encuestas),
            "promedios": {
                "satisfaccion": float(promedios.get("satisfaccion", 0)),
                "recomendacion": float(promedios.get("recomendacion", 0)),
                "claridad": float(promedios.get("claridad", 0)),
                "solucion": float(promedios.get("solucion", 0)),
            },
            "indicador_mas_bajo": {
                "indicador": indicador_mas_bajo,
                "valor": float(promedios[indicador_mas_bajo]),
            },
            "indicador_mas_alto": {
                "indicador": indicador_mas_alto,
                "valor": float(promedios[indicador_mas_alto]),
            },
            "total_baja_satisfaccion": total_baja_satisfaccion,
            "porcentaje_baja_satisfaccion": porcentaje_baja_satisfaccion,
            "skill_menor_satisfaccion": {
                "skill": skill_menor_satisfaccion["skill"],
                "satisfaccion_promedio": float(skill_menor_satisfaccion["satisfaccion_promedio"]),
                "encuestas": int(skill_menor_satisfaccion["encuestas"]),
            },
        },
        "calidad_por_skill": calidad_por_skill.sort_values(
            "satisfaccion_promedio",
            ascending=True
        ).to_dict(orient="records"),
    }