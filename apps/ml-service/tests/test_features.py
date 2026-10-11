import sys
import os
import math

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from features import extract_features, extract_feature_matrix, FEATURE_NAMES

def test_feature_names_length():
    assert len(FEATURE_NAMES) == 10

def test_extract_features_normal():
    data = {
        "hour": 14,
        "day_of_week": 3,
        "total_chargers": 6,
        "busy_chargers": 4,
        "queue_length": 2,
        "avg_power_kw": 60.0,
        "historical_avg_duration": 35.0,
    }
    vec = extract_features(data)
    assert len(vec) == 10
    # hour
    assert vec[0] == 14.0
    # day_of_week
    assert vec[1] == 3.0
    # is_weekend
    assert vec[2] == 0.0
    # occupied_ratio
    assert round(vec[5], 2) == 0.67
    # queue_length
    assert vec[6] == 2.0
    # total_chargers
    assert vec[7] == 6.0

def test_extract_features_clamping_and_edge_cases():
    data = {
        "hour": 35,  # should clamp to 23
        "day_of_week": -2, # should clamp to 0
        "total_chargers": 0, # should clamp to min 1
        "busy_chargers": -5, # should clamp to min 0
        "queue_length": -3, # should clamp to min 0
        "avg_power_kw": 500.0, # should clamp to max 150
        "historical_avg_duration": 5.0, # should clamp to min 10
    }
    vec = extract_features(data)
    assert len(vec) == 10
    assert vec[0] == 23.0
    assert vec[1] == 0.0
    assert vec[5] == 0.0
    assert vec[6] == 0.0
    assert vec[7] == 1.0
    assert vec[8] == 150.0
    assert vec[9] == 10.0

def test_extract_feature_matrix():
    records = [
        {"hour": 8, "day_of_week": 1, "total_chargers": 4, "busy_chargers": 2},
        {"hour": 18, "day_of_week": 5, "total_chargers": 8, "busy_chargers": 8, "queue_length": 3},
    ]
    mat = extract_feature_matrix(records)
    assert mat.shape == (2, 10)
