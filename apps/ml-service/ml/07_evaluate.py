import json, sys
import numpy as np
import pandas as pd
import lightgbm as lgb
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import r2_score, precision_score, recall_score, f1_score, average_precision_score, roc_auc_score
from config import *
from features import FEATURES, to_model_frame, build_features

meta = json.load(open(MODELS / "metadata.json"))
B = {k: lgb.Booster(model_file=str(MODELS / f"lgbm_resid_{k}.txt")) for k in ("p50", "p80", "p90")}
CLF = lgb.Booster(model_file=str(MODELS / "lgbm_long_wait_clf.txt"))


def predict_all(df):
    X = to_model_frame(df)
    base = df["baseline"].values
    p50 = np.maximum(0, base + B["p50"].predict(X))
    p80 = np.maximum(p50, base + B["p80"].predict(X))
    p90 = np.maximum(p80, base + B["p90"].predict(X))
    return p50, p80, p90, CLF.predict(X)


def reg_metrics(y, p):
    e = p - y
    ae = np.abs(e)
    tol = np.maximum(TOL_ABS_MIN, TOL_REL * y)
    return dict(n=len(y), MAE=ae.mean(), MedAE=np.median(ae), RMSE=float(np.sqrt((e ** 2).mean())),
                bias=e.mean(), R2=r2_score(y, p),
                sMAPE=float(np.mean(2 * ae / (np.abs(y) + np.abs(p) + 1e-9))),
                within_tol=float((ae <= tol).mean()),
                within_5min=float((ae <= 5).mean()), within_10min=float((ae <= 10).mean()))


te = pd.read_parquet(PROC / "features.parquet")
te = te[te.split == "test"].reset_index(drop=True)
y = te["wait"].values
p50, p80, p90, pclf = predict_all(te)

m_ml = reg_metrics(y, p50)
m_base = reg_metrics(y, te["baseline"].values)
cov80, cov90 = float((y <= p80).mean()), float((y <= p90).mean())

yl = (y > LONG_WAIT_MIN).astype(int)
pl = (pclf >= meta["clf_threshold"]).astype(int)
clf_m = dict(threshold=meta["clf_threshold"], positive_rate=float(yl.mean()),
             precision=float(precision_score(yl, pl, zero_division=0)),
             recall=float(recall_score(yl, pl, zero_division=0)),
             f1=float(f1_score(yl, pl, zero_division=0)),
             pr_auc=float(average_precision_score(yl, pclf)),
             roc_auc=float(roc_auc_score(yl, pclf)))

# ---- segments ----
def seg(col):
    rows = []
    for k, g in te.groupby(col, observed=True):
        if len(g) >= 100:
            rows.append({col: k, **reg_metrics(g["wait"].values, p50[g.index.values])})
    return pd.DataFrame(rows)

te["queue_bucket"] = pd.cut(te["queue_len"], [-1, 0, 1, 2, 100], labels=["0", "1", "2", "3+"])
segs = {c: seg(c) for c in ("rush_phase", "is_weekend", "is_holiday", "station_type", "charger_type", "n_chargers", "queue_bucket")}

# ---- robustness to the noise of the live remaining-time estimate (model trained at EST_NOISE_SIGMA) ----
ev = pd.read_parquet(INTERIM / "blocked_events.parquet")
st = pd.read_parquet(INTERIM / "stations.parquet")
rob = []
for s in (0.10, 0.15, 0.25, 0.40):
    f = build_features(ev, st, sigma=s, seed=SEED + 1)
    f = f[f.split == "test"].reset_index(drop=True)
    q50, *_ = predict_all(f)
    rob.append(dict(sigma=s, ML_within_tol=reg_metrics(f["wait"].values, q50)["within_tol"],
                    ML_MAE=reg_metrics(f["wait"].values, q50)["MAE"],
                    baseline_within_tol=reg_metrics(f["wait"].values, f["baseline"].values)["within_tol"],
                    baseline_MAE=reg_metrics(f["wait"].values, f["baseline"].values)["MAE"]))
rob = pd.DataFrame(rob)

# ---- plots ----
fig, ax = plt.subplots(1, 3, figsize=(17, 4.5))
ax[0].hexbin(y, p50, gridsize=40, bins="log", mincnt=1)
lim = float(np.percentile(y, 99))
ax[0].plot([0, lim], [0, lim], "r--")
ax[0].set(xlim=(0, lim), ylim=(0, lim), xlabel="actual wait (min)", ylabel="predicted P50 (min)", title="Predicted vs actual (test)")
h = te.groupby("hour").apply(lambda g: np.abs(p50[g.index.values] - g["wait"].values).mean())
ax[1].bar(h.index, h.values)
ax[1].set(xlabel="hour of day", ylabel="MAE (min)", title="Error by hour")
imp = pd.Series(B["p50"].feature_importance("gain"), index=FEATURES).sort_values().tail(15)
ax[2].barh(imp.index, imp.values)
ax[2].set(title="Top features (P50 gain)")
plt.tight_layout()
plt.savefig(REPORTS / "evaluation.png", dpi=130)

# ---- acceptance gate ----
improvement = 1 - m_ml["MAE"] / m_base["MAE"]
gate = {
    f"accuracy (within max({TOL_ABS_MIN:.0f} min, {TOL_REL:.0%})) >= {GATE_ACCURACY}": m_ml["within_tol"] >= GATE_ACCURACY,
    f"long-wait precision >= {GATE_PRECISION}": clf_m["precision"] >= GATE_PRECISION,
    f"P80 coverage in {GATE_P80_COVERAGE}": GATE_P80_COVERAGE[0] <= cov80 <= GATE_P80_COVERAGE[1],
    "ML MAE <= baseline MAE": m_ml["MAE"] <= m_base["MAE"],
}
soft = {"ML MAE at least 10% better than baseline": improvement >= 0.10}

metrics = dict(ml=m_ml, baseline=m_base, p80_coverage=cov80, p90_coverage=cov90, long_wait=clf_m,
               mae_improvement_vs_baseline=improvement, gate={k: bool(v) for k, v in gate.items()},
               soft={k: bool(v) for k, v in soft.items()})
json.dump(metrics, open(REPORTS / "metrics.json", "w"), indent=2, default=float)

md = []
md.append("# EVspark wait-time model — evaluation report\n")
md.append("> **IMPORTANT LIMITATION.** All numbers below are measured on labels produced by a queue simulator driven by "
          "real ACN-Data arrival sequences re-timed with ASSUMED Indian demand profiles, vehicle mix and charger types. "
          "ACN-Data has no queue/waiting labels. These results show the pipeline and model learn queue and rush-hour "
          "behaviour; they are NOT evidence of real-world accuracy at Indian stations. Re-train on real operator "
          "logs when available.\n")
md.append(f"Test rows: {m_ml['n']:,} (all-chargers-busy arrivals from {TRAIN_END}+val split, test = after {VAL_END}). "
          f"Estimated-remaining-time noise sigma = {EST_NOISE_SIGMA}.\n")
md.append("## Acceptance gate\n")
for k, v in {**gate, **soft}.items():
    md.append(f"- {'PASS' if v else 'FAIL'} — {k}")
md.append("\n## Headline metrics (test)\n")
md.append(pd.DataFrame({"LightGBM P50": m_ml, "Baseline only": m_base}).T.to_markdown(floatfmt=".3f"))
md.append(f"\nMAE improvement vs baseline: **{improvement:.1%}** | P80 coverage: **{cov80:.3f}** | P90 coverage: **{cov90:.3f}**\n")
md.append("## Long-wait alert (wait > 15 min)\n")
md.append(pd.Series(clf_m).to_frame("value").to_markdown(floatfmt=".3f"))
md.append("\n## Robustness to live-estimate noise (model trained at the fixed sigma)\n")
md.append(rob.to_markdown(index=False, floatfmt=".3f"))
for c, d in segs.items():
    md.append(f"\n## By {c}\n")
    md.append(d.to_markdown(index=False, floatfmt=".3f"))
md.append("\n![evaluation](evaluation.png)\n")
(REPORTS / "report.md").write_text("\n".join(md))

print("\n=== ACCEPTANCE GATE ===")
for k, v in {**gate, **soft}.items():
    print(("PASS" if v else "FAIL"), "-", k)
print(f"accuracy(within tol)={m_ml['within_tol']:.3f} MAE={m_ml['MAE']:.2f} RMSE={m_ml['RMSE']:.2f} "
      f"precision(long)={clf_m['precision']:.3f} recall(long)={clf_m['recall']:.3f} "
      f"P80cov={cov80:.3f} improvement={improvement:.1%}")
sys.exit(0 if all(gate.values()) else 1)

