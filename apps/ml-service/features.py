import math
from typing import Dict, Any, List
import numpy as np

FEATURE_NAMES = [
    "hour",
    "day_of_week",
    "is_weekend",
    "sin_hour",
    "cos_hour",
    "occupied_ratio",
    "queue_length",
    "total_chargers",
    "avg_power_kw",
    "historical_avg_duration",
]

def extract_features(data: Dict[str, Any]) -> List[float]:
    """
    Extracts a normalized 10-dimensional feature vector matching docs/ML_TRUTHFULNESS.md.
    """
    hour = int(data.get("hour", data.get("hour_of_day", 12)))
    hour = max(0, min(23, hour))

    day_of_week = int(data.get("day_of_week", 2))
    day_of_week = max(0, min(6, day_of_week))

    is_weekend = 1.0 if day_of_week in [5, 6] else 0.0

    # Cyclical hour encoding
    sin_hour = math.sin(2.0 * math.pi * hour / 24.0)
    cos_hour = math.cos(2.0 * math.pi * hour / 24.0)

    # Charger state
    total_chargers = max(1, int(data.get("total_chargers", data.get("chargers_total", 4))))
    busy_chargers = max(0, int(data.get("busy_chargers", data.get("chargers_busy", 0))))
    occupied_ratio = min(1.0, float(busy_chargers) / float(total_chargers))

    queue_length = max(0.0, float(data.get("queue_length", data.get("current_queue", 0))))

    avg_power_kw = float(data.get("avg_power_kw", data.get("power_kw", 50.0)))
    avg_power_kw = max(15.0, min(150.0, avg_power_kw))

    # Historical average duration from Indian profiles
    historical_avg_duration = float(data.get("historical_avg_duration", data.get("avg_duration", 35.0)))
    historical_avg_duration = max(10.0, min(90.0, historical_avg_duration))

    return [
        float(hour),
        float(day_of_week),
        is_weekend,
        sin_hour,
        cos_hour,
        occupied_ratio,
        queue_length,
        float(total_chargers),
        avg_power_kw,
        historical_avg_duration,
    ]

def extract_feature_matrix(records: List[Dict[str, Any]]) -> np.ndarray:
    """
    Extracts 2D numpy matrix of features for batch prediction or model training.
    """
    vectors = [extract_features(r) for r in records]
    return np.array(vectors, dtype=np.float32)
