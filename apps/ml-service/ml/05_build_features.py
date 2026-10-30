import pandas as pd
from config import *
from features import build_features

ev = pd.read_parquet(INTERIM / "blocked_events.parquet")
st = pd.read_parquet(INTERIM / "stations.parquet")
df = build_features(ev, st, sigma=EST_NOISE_SIGMA, seed=SEED)
df.to_parquet(PROC / "features.parquet")
print(df["split"].value_counts())
print("baseline MAE (all):", round((df["wait"] - df["baseline"]).abs().mean(), 2), "min")

