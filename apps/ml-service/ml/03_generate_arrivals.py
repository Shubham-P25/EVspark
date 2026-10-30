import numpy as np
import pandas as pd
from datetime import timedelta
from scipy.stats import norm
from config import *
from features import _HOL

rng = np.random.default_rng(SEED)
acn = pd.read_parquet(INTERIM / "acn_clean.parquet")
GRID = np.arange(0, 1441)


def circ_smooth(h, k=61):
    h = np.asarray(h, float)
    p = k // 2
    return np.convolve(np.r_[h[-p:], h, h[:p]], np.ones(k) / k, mode="valid")


def to_cdf(per_min):
    w = np.asarray(per_min, float) + 1e-6
    c = np.concatenate([[0.0], np.cumsum(w)])
    return c / c[-1]


def acn_cdf(mask):
    h, _ = np.histogram(acn.loc[mask, "tod_min"].values, bins=1440, range=(0, 1440))
    return to_cdf(circ_smooth(h.astype(float)))


CDF_ACN = {"wd": acn_cdf(~acn["is_weekend"]), "we": acn_cdf(acn["is_weekend"])}
CDF_T = {(s, k): to_cdf(circ_smooth(np.repeat(HOURLY[s][k], 60)))
         for s in STATION_TYPES for k in ("wd", "we")}

tpl = {"wd": [], "we": []}
for d, g in acn.groupby("date"):
    if len(g) < 10:
        continue
    tpl["we" if bool(g["is_weekend"].iloc[0]) else "wd"].append((g["tod_min"].values, g["q_energy"].values))
if not tpl["we"]:
    print("WARN: no weekend templates, falling back to weekday templates")
    tpl["we"] = tpl["wd"]
print("template days:", {k: len(v) for k, v in tpl.items()})


def sample_service(ctype, q, rng):
    spec = CHARGER_TYPES[ctype]
    classes = list(spec["mix"])
    p = np.array(list(spec["mix"].values()), float)
    vc = rng.choice(classes, p=p / p.sum(), size=len(q))
    kwh = np.zeros(len(q))
    svc = np.zeros(len(q))
    for cl in classes:
        m = vc == cl
        if not m.any():
            continue
        key = cl if cl != "4W" else ("4W_DC" if spec["dc"] else "4W_AC")
        med, sig, lo, hi = ENERGY[key]
        e = np.clip(med * np.exp(sig * norm.ppf(q[m])), lo, hi)
        eff_kw = min(spec["kw"] * CHARGER_EFFICIENCY, VEH_MAX_KW[key])
        kwh[m] = e
        svc[m] = np.clip(e / eff_kw * 60.0 + PLUGIN_OVERHEAD_MIN, 5, 300)
    return vc, kwh, svc


dates = pd.date_range(ACN_START, ACN_END, freq="D")
ctypes = list(CHARGER_TYPES)
stations, parts = [], []
for i in range(N_STATIONS):
    sid = f"S{i + 1:02d}"
    stype = STATION_TYPES[i % 4]
    ctype = str(rng.choice(ctypes, p=CTYPE_PROB[stype]))
    c = int(rng.choice([2, 3, 4, 6, 8], p=[0.25, 0.25, 0.20, 0.20, 0.10]))
    util = float(rng.uniform(0.15, 0.45))      # mean utilisation target. Deliberately high: we need enough congested events to learn from
    _, _, s_probe = sample_service(ctype, rng.uniform(0.02, 0.98, 20000), rng)
    mean_svc = float(s_probe.mean())
    stations.append(dict(station_id=sid, station_type=stype, charger_type=ctype,
                         kw=CHARGER_TYPES[ctype]["kw"], n_chargers=c, util_target=util, mean_svc=mean_svc))
    for dt in dates:
        d = dt.date()
        hol = d in _HOL
        eve = (d + timedelta(days=1)) in _HOL
        wk = dt.dayofweek >= 5
        kind = "we" if (wk or hol) else "wd"
        m = DAY_MULT[stype]
        mult = m["hol"] if hol else (m["eve"] if eve else (m["we"] if wk else m["wd"]))
        target = util * c * 1440.0 / mean_svc * mult
        tod_src, q_src = tpl[kind][rng.integers(len(tpl[kind]))]
        cnt = rng.poisson(target / len(tod_src), size=len(tod_src))
        idx = np.repeat(np.arange(len(tod_src)), cnt)
        if len(idx) == 0:
            continue
        u = np.interp(tod_src[idx] + rng.uniform(0, 1, len(idx)), GRID, CDF_ACN[kind])
        tod_new = np.interp(u, CDF_T[(stype, kind)], GRID) + rng.normal(0, 6, len(idx))
        tod_new = np.clip(tod_new, 0, 1439.9)
        q = np.clip(q_src[idx] + rng.normal(0, 0.2, len(idx)), 0.02, 0.98)
        vc, kwh, svc = sample_service(ctype, q, rng)
        parts.append(pd.DataFrame({"station_id": sid,
                                   "arr_dt": dt + pd.to_timedelta(tod_new, unit="m"),
                                   "vclass": vc, "kwh": kwh, "svc_min": svc}))

arr = pd.concat(parts, ignore_index=True)
st = pd.DataFrame(stations)
arr.to_parquet(INTERIM / "arrivals.parquet")
st.to_parquet(INTERIM / "stations.parquet")
print("arrivals:", len(arr), "| stations:", len(st))
print(st.groupby(["station_type", "charger_type"]).size())
print("mean arrivals per hour of day (all stations):")
print((arr["arr_dt"].dt.hour.value_counts(normalize=True).sort_index() * 100).round(1).to_string())

