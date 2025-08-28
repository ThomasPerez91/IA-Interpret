# backend/app/services/spark_analyze.py
from __future__ import annotations
from typing import Any, Dict, List
from pyspark.sql import SparkSession  # type: ignore
from pyspark.sql import functions as F  # type: ignore
from pyspark.sql.types import StringType, StructField  # type: ignore


def _spark() -> SparkSession:
    # Spark local pour l’analyse initiale
    return (
        SparkSession.builder
        .appName("initial_analyze")
        .master("local[*]")
        .getOrCreate()
    )


def analyze_csv_local(local_path: str) -> Dict[str, Any]:
    """
    Retourne un dict JSON-serializable:
      - row_count, column_count
      - schema: [{name, dtype}]
      - null_counts: {col -> int}
      - bad_type_counts: {col -> int} (lignes non vides qui ne se castent pas)
      - distinct_counts: {col -> int}
      - constant_columns: [col]
      - suggestions: [str]
    """
    spark = _spark()
    try:
        # 1) Lecture typée (inferschema) pour connaître les types cibles
        df = (
            spark.read
            .option("header", True)
            .option("inferSchema", True)
            .csv(local_path)
        )
        row_count = df.count()

        # Schema propre: [{name, dtype}]
        schema: List[Dict[str, str]] = [
            # ex: "string", "double", "integer"
            {"name": f.name, "dtype": f.dataType.simpleString()}
            for f in df.schema.fields  # type: ignore[assignment]
        ]
        column_count = len(schema)

        # 2) Valeurs manquantes
        # - pour les colonnes string: null OR "" OR "nan" (insensible à la casse)
        # - pour les autres: null
        null_counts: Dict[str, int] = {}
        for f in df.schema.fields:  # type: ignore[assignment]
            col = F.col(f.name)
            if isinstance(f, StructField) and isinstance(f.dataType, StringType):
                expr = F.when(
                    col.isNull() | (F.length(F.trim(col)) == 0) | (F.lower(col) == "nan"),
                    1
                ).otherwise(0)
            else:
                expr = F.when(col.isNull(), 1).otherwise(0)
            null_counts[f.name] = int(
                df.select(F.sum(expr).alias("n")).collect()[0]["n"] or 0)

        # 3) Distinct + colonnes constantes
        distinct_counts: Dict[str, int] = {}
        constant_columns: List[str] = []
        for f in df.schema.fields:  # type: ignore[assignment]
            n = df.select(f.name).distinct().count()
            distinct_counts[f.name] = int(n)
            if n <= 1:
                constant_columns.append(f.name)

        # 4) Valeurs mal typées
        # Relecture brute en "string" + tentative de cast vers le type inféré.
        raw = (
            spark.read
            .option("header", True)
            .option("inferSchema", False)  # => tout en string
            .csv(local_path)
        )
        bad_type_counts: Dict[str, int] = {}
        for f in df.schema.fields:  # type: ignore[assignment]
            wanted = f.dataType
            s = raw.select(F.col(f.name).alias("raw"))
            casted = s.select(
                F.when(
                    F.col("raw").isNull() | (
                        F.length(F.trim(F.col("raw"))) == 0),
                    None,
                ).otherwise(F.col("raw")).cast(wanted).alias("casted")
            )
            # "mal typée" = non vide côté brut, mais cast => null
            bad = casted.filter(
                F.col("casted").isNull()
                & F.col("raw").isNotNull()
                & (F.length(F.trim(F.col("raw"))) > 0)
            ).count()
            if bad > 0:
                bad_type_counts[f.name] = int(bad)

        # 5) Suggestions simples
        suggestions: List[str] = []
        if constant_columns:
            suggestions.append(
                f"Supprimer {len(constant_columns)} colonne(s) constante(s): "
                + ", ".join(constant_columns[:5])
                + ("…" if len(constant_columns) > 5 else "")
            )
        heavy_missing = [
            c for c, n in null_counts.items() if row_count and (n / row_count) > 0.2
        ]
        if heavy_missing:
            suggestions.append(
                "Traiter les valeurs manquantes (>20%) pour: "
                + ", ".join(heavy_missing[:5])
                + ("…" if len(heavy_missing) > 5 else "")
            )

        return {
            "row_count": int(row_count),
            "column_count": int(column_count),
            "schema": schema,  # ✅ [{name, dtype}]
            "null_counts": {k: int(v) for k, v in null_counts.items()},
            "bad_type_counts": bad_type_counts,
            "distinct_counts": {k: int(v) for k, v in distinct_counts.items()},
            "constant_columns": constant_columns,
            "suggestions": suggestions,
        }
    finally:
        spark.stop()
