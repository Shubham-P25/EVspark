import json
import numpy as np
import pandas as pd
import lightgbm as lgb
from config import MODELS, CHARGER_TYPES
from features import time_features, state_features, to_model_frame


class WaitPredictor:
    def __init__(self):
        self.meta = json.load(open(MODELS / "metadata.json"))
        self.b = {k: lgb.Booster(model_file=str(MODELS / f"lgbm_resid_{k}.txt")) for k in ("p50", "p80", "p90")}
        self.clf = lgb.Booster(model_file=str(MODELS / "lgbm_long_wait_clf.txt"))

    def predict(self, r: dict) -> dict:
        c, free = int(r["n_chargers"]), int(r["chargers_free"])
        if free > 0:   # deterministic gate: a charger is free -> no waiting time
            return dict(status="available", wait_min=0, wait_p80_min=0, wait_p90_min=0,
                        long_wait_prob=0.0, long_wait_alert=False, message="Charger available now")
        rem = list(r.get("charger_remaining_min") or [])
        if not rem:
            raise ValueError("charger_remaining_min is required when all chargers are busy")
        if len(rem) > c:
            raise ValueError("charger_remaining_min has more entries than n_chargers")
        svc = r.get("recent_avg_session_min") or self.meta["svc_prior"][r["charger_type"]]
        ts = pd.Timestamp(r["timestamp"])
        if ts.tzinfo is not None:
            ts = ts.tz_convert("Asia/Kolkata").tz_localize(None)
        sf = state_features(rem, int(r.get("queue_len", 0)), float(svc), int(r.get("arrivals_last_30", 0)),
                            int(r.get("arrivals_last_60", 0)), float(r.get("minutes_station_full", 0.0)), c)
        stf = dict(station_type=r["station_type"], charger_type=r["charger_type"],
                   charger_kw=float(CHARGER_TYPES[r["charger_type"]]["kw"]), n_chargers=c)
        row = pd.concat([time_features([ts]), pd.DataFrame([sf]), pd.DataFrame([stf])], axis=1)
        X = to_model_frame(row)
        base = float(row["baseline"].iloc[0])
        p50 = max(0.0, base + float(self.b["p50"].predict(X)[0]))
        p80 = max(p50, base + float(self.b["p80"].predict(X)[0]))
        p90 = max(p80, base + float(self.b["p90"].predict(X)[0]))
        pl = float(self.clf.predict(X)[0])
        w50, w80 = max(1, int(round(p50))), max(1, int(round(p80)))
        return dict(status="busy", wait_min=w50, wait_p80_min=w80, wait_p90_min=max(1, int(round(p90))),
                    long_wait_prob=round(pl, 3), long_wait_alert=bool(pl >= self.meta["clf_threshold"]),
                    message=f"~{w50} min (up to {w80})")

