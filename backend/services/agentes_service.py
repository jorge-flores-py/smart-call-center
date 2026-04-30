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