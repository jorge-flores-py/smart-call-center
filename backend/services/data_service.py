import pandas as pd
from database import engine


def obtener_df_agentes():
    """
    Obtiene la base principal para los agentes.

    Une:
    - gestion_llamadas
    - encuestas_calidad

    Y agrega columnas calculadas:
    - fecha
    - tiempo_total
    - flag_abandono
    - baja_satisfaccion
    """

    query = """
        SELECT
            gl.fecha_y_hora,
            DATE(gl.fecha_y_hora) AS fecha,

            gl.id_skill,
            gl.skill,
            gl.id_llamada,
            gl.id_asesor,
            gl.documento_asesor,
            gl.nombre_asesor,
            gl.loguin_asesor,
            gl.cargo,
            gl.id_motivo_llamada,
            gl.motivo_llamada,
            gl.identificacion_cliente,
            gl.nombre,
            gl.telefono_fijo,
            gl.celular,
            gl.municipio,
            gl.departamento,
            gl.estado,
            gl.tiempo_de_espera,
            gl.tiempo_conversacion,
            gl.tiempo_documentacion,

            ec.satisfaccion,
            ec.recomendacion,
            ec.claridad,
            ec.solucion

        FROM gestion_llamadas gl
        LEFT JOIN encuestas_calidad ec
            ON gl.id_llamada = ec.id_llamada
    """

    df = pd.read_sql(query, engine)

    df["tiempo_total"] = (
        df["tiempo_de_espera"].fillna(0)
        + df["tiempo_conversacion"].fillna(0)
        + df["tiempo_documentacion"].fillna(0)
    )

    df["flag_abandono"] = (
        df["estado"].fillna("").str.lower() == "abandonada"
    ).astype(int)

    df["baja_satisfaccion"] = (
        df["satisfaccion"].fillna(99) <= 2
    ).astype(int)

    return df


def obtener_total_llamadas():
    """
    Obtiene solo el total de llamadas.
    Sirve para KPIs rápidos sin traer toda la base.
    """

    query = """
        SELECT COUNT(*) AS total_llamadas
        FROM gestion_llamadas
    """

    df = pd.read_sql(query, engine)

    return int(df.iloc[0]["total_llamadas"])


def obtener_kpis_basicos():
    """
    Obtiene KPIs básicos directamente desde SQL.
    Es más rápido que traer toda la base para estos cálculos simples.
    """

    query = """
        SELECT
            COUNT(*) AS total_llamadas,
            COUNT(DISTINCT skill) AS total_skills,
            SUM(CASE WHEN LOWER(estado) = 'contestada' THEN 1 ELSE 0 END) AS total_contestadas,
            SUM(CASE WHEN LOWER(estado) = 'abandonada' THEN 1 ELSE 0 END) AS total_abandonadas
        FROM gestion_llamadas
    """

    df = pd.read_sql(query, engine)

    fila = df.iloc[0]

    return {
        "total_llamadas": int(fila["total_llamadas"]),
        "total_skills": int(fila["total_skills"]),
        "total_contestadas": int(fila["total_contestadas"]),
        "total_abandonadas": int(fila["total_abandonadas"]),
    }