import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from predictor import WaitPredictor
from features import FEATURES

P = WaitPredictor()
BASE = dict(station_id="S01", station_type="mall", charger_type="AC_7.4", n_chargers=3, chargers_free=0,
            timestamp="2026-11-02T18:15:00+05:30", queue_len=1, charger_remaining_min=[20, 35, 50],
            arrivals_last_30=4, arrivals_last_60=7, recent_avg_session_min=60.0, minutes_station_full=25.0)

def test_gate_free_charger_gives_zero():
    r = P.predict({**BASE, "chargers_free": 1})
    assert r["wait_min"] == 0 and r["status"] == "available"

def test_quantiles_are_ordered():
    r = P.predict(BASE)
    assert r["wait_min"] <= r["wait_p80_min"] <= r["wait_p90_min"]

def test_longer_remaining_time_means_longer_wait():
    short = P.predict({**BASE, "charger_remaining_min": [5, 8, 10], "queue_len": 0})
    long_ = P.predict({**BASE, "charger_remaining_min": [60, 70, 80], "queue_len": 0})
    assert long_["wait_min"] > short["wait_min"]

def test_longer_queue_means_longer_wait():
    a = P.predict({**BASE, "queue_len": 0})
    b = P.predict({**BASE, "queue_len": 3})
    assert b["wait_min"] >= a["wait_min"]

def test_no_leakage_columns():
    assert not any(("true" in f) or f in ("wait", "split", "start") for f in FEATURES)

