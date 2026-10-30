import json
import numpy as np
import pandas as pd
from config import *

rows = []
for site in ACN_SITES:
    with open(RAW / f"{site}.json") as f:
        for s in json.load(f):
            rows.append({"session_id": s.get("sessionID"), "site": site,
                         "conn": s.get("connectionTime"), "disc": s.get("disconnectTime"),
                         "done": s.get("doneChargingTime"), "kwh": s.get("kWhDelivered")})
df = pd.DataFrame(rows)
for c in ("conn", "disc", "done"):
    df[c] = pd.to_datetime(df[c], utc=True, errors="coerce", format="mixed")
df = df.dropna(subset=["conn", "disc", "kwh"])
df["done"] = df["done"].fillna(df["disc"])
df["done"] = df[["done", "disc"]].min(axis=1)          # a public-charger driver leaves when charging is done
df["svc_min"] = (df["done"] - df["conn"]).dt.total_seconds() / 60.0
df = df[df["svc_min"].between(5, 900) & (df["kwh"] > 0.5)].copy()

loc = df["conn"].dt.tz_convert("America/Los_Angeles")
df["date"] = loc.dt.normalize().dt.tz_localize(None)
df["tod_min"] = loc.dt.hour * 60 + loc.dt.minute + loc.dt.second / 60.0
df["is_weekend"] = loc.dt.dayofweek >= 5
df["q_energy"] = df["kwh"].rank(pct=True)                # energy quantile, used later as a copula
df = df.reset_index(drop=True)
df.to_parquet(INTERIM / "acn_clean.parquet")
print("sessions:", len(df), "| days:", df["date"].nunique(),
      "| weekend share:", round(df["is_weekend"].mean(), 3))

