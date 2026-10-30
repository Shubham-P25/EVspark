import json
import numpy as np
import pandas as pd
import lightgbm as lgb
import sklearn
from sklearn.metrics import precision_recall_curve
from config import *
from features import FEATURES, CATEGORY_LEVELS, to_model_frame

df = pd.read_parquet(PROC / "features.parquet")
tr, va = df[df.split == "train"], df[df.split == "val"]
Xtr, Xva = to_model_frame(tr), to_model_frame(va)
ytr, yva = tr["wait"] - tr["baseline"], va["wait"] - va["baseline"]

PARAMS = dict(n_estimators=6000, learning_rate=0.03, num_leaves=48, min_child_samples=40,
              subsample=0.8, subsample_freq=1, colsample_bytree=0.8, reg_alpha=0.1, reg_lambda=2.0,
              random_state=SEED, n_jobs=-1, verbose=-1)
cb = [lgb.early_stopping(200, verbose=False), lgb.log_evaluation(500)]

best_iter = {}
for name, alpha in {"p50": 0.5, "p80": 0.8, "p90": 0.9}.items():
    m = lgb.LGBMRegressor(objective="quantile", alpha=alpha, **PARAMS)
    m.fit(Xtr, ytr, eval_set=[(Xva, yva)], callbacks=cb)
    m.booster_.save_model(str(MODELS / f"lgbm_resid_{name}.txt"))
    best_iter[name] = int(m.best_iteration_ or PARAMS["n_estimators"])
    print(f"{name}: best_iteration={best_iter[name]}")

# ---- long-wait classifier (precision-first) ----
ctr, cva = (tr["wait"] > LONG_WAIT_MIN).astype(int), (va["wait"] > LONG_WAIT_MIN).astype(int)
clf = lgb.LGBMClassifier(objective="binary", **PARAMS)
clf.fit(Xtr, ctr, eval_set=[(Xva, cva)], eval_metric="binary_logloss", callbacks=cb)
clf.booster_.save_model(str(MODELS / "lgbm_long_wait_clf.txt"))
pv = clf.booster_.predict(Xva)
prec, rec, thr = precision_recall_curve(cva, pv)
ok = prec[:-1] >= GATE_PRECISION
if ok.any():
    thr_sel = float(thr[ok][np.argmax(rec[:-1][ok])])
    thr_note = f"precision>={GATE_PRECISION} reachable on validation"
else:
    f05 = (1.25 * prec[:-1] * rec[:-1]) / np.maximum(0.25 * prec[:-1] + rec[:-1], 1e-9)
    thr_sel = float(thr[np.argmax(f05)])
    thr_note = "WARNING: target precision NOT reachable on validation; used best F0.5 threshold"
print("classifier threshold:", round(thr_sel, 3), "|", thr_note)

st = pd.read_parquet(INTERIM / "stations.parquet")
meta = dict(
    features=FEATURES, category_levels={k: list(v) for k, v in CATEGORY_LEVELS.items()},
    params=PARAMS, best_iteration=best_iter, long_wait_min=LONG_WAIT_MIN,
    clf_threshold=thr_sel, clf_threshold_note=thr_note, est_noise_sigma=EST_NOISE_SIGMA,
    split=dict(train_end=TRAIN_END, val_end=VAL_END),
    rows={s: int((df.split == s).sum()) for s in ("train", "val", "test")},
    svc_prior={k: float(v) for k, v in st.groupby("charger_type")["mean_svc"].mean().items()},
    versions=dict(lightgbm=lgb.__version__, sklearn=sklearn.__version__, pandas=pd.__version__),
)
with open(MODELS / "metadata.json", "w") as f:
    json.dump(meta, f, indent=2)
print("saved models + metadata.json")

