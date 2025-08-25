from typing import Dict, List
from pyspark.sql import SparkSession  # type: ignore
from pyspark.sql.functions import col, when, count, trim, upper, approx_count_distinct  # type: ignore


def analyze_csv_local(local_csv_path: str) -> Dict:
    """
    Analyse un CSV (≤ ~20k lignes) avec Spark en local[*].
    Renvoie: schéma, nulls, mal-typés, cardinalités, colonnes constantes, suggestions de prétraitements.
    """
    spark = (
        SparkSession.builder
        .appName("IAInterpretCSVAnalysis")
        .master("local[*]")     # simple et suffisant en dev
        .getOrCreate()
    )
    try:
        df = (
            spark.read
            .option("header", True)
            .option("inferSchema", True)
            .csv(local_csv_path)
        )

        row_count = df.count()
        column_names: List[str] = df.columns

        # Schéma (nom + type)
        schema = [{"name": f.name, "type": f.dataType.simpleString()}
                  for f in df.schema.fields]

        # Null / vide / "NaN"
        null_counts_row = df.select(
            *[
                count(
                    when(
                        col(c).isNull()
                        | (trim(col(c)) == "")
                        | (upper(trim(col(c))) == "NAN"),
                        c,
                    )
                ).alias(c)
                for c in column_names
            ]
        ).collect()[0]
        null_counts = {c: int(null_counts_row[c]) for c in column_names}

        # Mal-typés : non vides dont le cast vers le type inféré échoue
        bad_type_counts: Dict[str, int] = {}
        for f in df.schema.fields:
            c = f.name
            target = f.dataType
            if f.dataType.simpleString() == "string":
                bad_type_counts[c] = 0
                continue
            bad = (
                df.filter(~(col(c).isNull() | (trim(col(c)) == "")
                          | (upper(trim(col(c))) == "NAN")))
                .filter(col(c).cast(target).isNull())
                .count()
            )
            bad_type_counts[c] = int(bad)

        # Cardinalité approx + colonnes constantes
        approx_distinct = df.agg(
            *[approx_count_distinct(col(c)).alias(c) for c in column_names]
        ).collect()[0]
        distinct_counts = {c: int(approx_distinct[c]) for c in column_names}
        constant_columns = [c for c, d in distinct_counts.items() if d <= 1]

        # Suggestions simples de prétraitements
        suggestions = {}
        for f in df.schema.fields:
            c = f.name
            dtype = f.dataType.simpleString()
            miss_ratio = (null_counts[c] / row_count) if row_count > 0 else 0.0
            sugg: List[str] = []

            if c in constant_columns:
                sugg.append("drop:colonne_constante")

            if miss_ratio > 0:
                if dtype in ("double", "float", "int", "bigint", "long"):
                    sugg.append("impute:numeric_mean")
                else:
                    sugg.append("impute:categorical_mode")

            if dtype == "string":
                if distinct_counts[c] <= 30:
                    sugg.append("encode:one_hot")
                elif distinct_counts[c] <= 2000:
                    sugg.append("encode:target_or_ordinal")
                else:
                    sugg.append("encode:hashing_trick")
            else:
                sugg.append("scale:standard_or_minmax")

            if miss_ratio >= 0.7:
                sugg.append("consider_drop:missing_too_high")

            if bad_type_counts.get(c, 0) > 0 and dtype != "string":
                sugg.append("coerce_type:clean_and_cast")

            suggestions[c] = sugg

        return {
            "row_count": int(row_count),
            "column_count": len(column_names),
            "schema": schema,
            "null_counts": null_counts,
            "bad_type_counts": bad_type_counts,
            "distinct_counts": distinct_counts,
            "constant_columns": constant_columns,
            "suggestions": suggestions,
        }
    finally:
        spark.stop()
