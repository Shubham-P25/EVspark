import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import model
from main import app

client = TestClient(app)

def test_predict_wait_time_non_negative():
    data = {
        "hour": 18,
        "day_of_week": 4,
        "total_chargers": 4,
        "busy_chargers": 4,
        "queue_length": 3,
        "avg_power_kw": 50.0,
        "historical_avg_duration": 30.0,
    }
    result = model.predict_wait_time(data)
    assert "predicted_wait_min" in result
    assert result["predicted_wait_min"] >= 0.0
    assert 0.0 <= result["confidence"] <= 1.0
    assert "model_version" in result

def test_heuristic_fallback_when_free():
    data = {
        "hour": 10,
        "day_of_week": 2,
        "total_chargers": 4,
        "busy_chargers": 1,
        "queue_length": 0,
    }
    h_wait = model.heuristic_wait_prediction(data)
    assert h_wait == 0.0

def test_predict_batch():
    stations = [
        {"station_id": "st-1", "hour": 9, "total_chargers": 4, "busy_chargers": 2, "queue_length": 0},
        {"station_id": "st-2", "hour": 18, "total_chargers": 4, "busy_chargers": 4, "queue_length": 5},
    ]
    batch_res = model.predict_batch(stations)
    assert len(batch_res) == 2
    assert batch_res[0]["station_id"] == "st-1"
    assert batch_res[1]["station_id"] == "st-2"
    assert batch_res[0]["predicted_wait_min"] >= 0.0
    assert batch_res[1]["predicted_wait_min"] >= batch_res[0]["predicted_wait_min"]

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["status"] == "ok"
    assert "version" in json_data

def test_metrics_endpoint():
    res = client.get("/metrics")
    assert res.status_code == 200
    json_data = res.json()
    assert "mae" in json_data
    assert "mape" in json_data
    assert "r2" in json_data
