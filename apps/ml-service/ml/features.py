import heapq
import functools
from datetime import timedelta

import numpy as np
import pandas as pd
import holidays

from config import *

_HOL = holidays.India(subdiv=HOLIDAY_SUBDIV, years=range(2019, 2032))

CATEGORY_LEVELS = {
    "station_type": ["office", "mall", "highway", "residential"],
    "charger_type": ["AC_3.3", "AC_7.4", "DC_30", "DC_60"],
    "rush_phase": [0, 1, 2, 3, 4],
}

FEATURES = [
    # time / calendar
    "hour", "tod_sin", "tod_cos", "dow", "is_weekend", "month", "dom",
    "is_holiday", "is_holiday_eve", "is_long_weekend", "rush_phase", "mins_from_eve_peak",
    # station descriptors (NOTE: station_id is deliberately NOT a feature; new real stations are unseen)
    "station_type", "charger_type", "charger_kw", "n_chargers",
    # live state at the moment a car arrives and finds every charger busy
    "queue_len", "load_ratio",
    "est_rem_1", "est_rem_2", "est_rem_3", "est_rem_mean", "est_rem_max", "est_rem_sum",
    "recent_svc", "arr_30", "arr_60", "full_for", "offered_load_30",
    "baseline",
]


def baseline_wait(est_rem, q, mean_svc):
    """Forward-simulate the queue. est_rem: estimated remaining minutes of each busy charger.
    q: cars already waiting ahead. mean_svc: average session minutes for queued cars."""
    h = [float(x) for x in est_rem]
    heapq.heapify(h)
    for _ in range(int(q)):
        t = heapq.heappop(h)
        heapq.heappush(h, t + float(mean_svc))
    return float(h[0])


@functools.lru_cache(maxsize=None)
def _nonwork(d):
    return d.weekday() >= 5 or d in _HOL


@functools.lru_cache(maxsize=None)
def _block_len(d):
    if not _nonwork(d):
        return 0
    n = 1
    for s in (1, -1):
        k = 1
        while k <= 4 and _nonwork(d + timedelta(days=s * k)):
            n += 1
            k += 1
    return n


def rush_phase(h):
    if h >= 22 or h <= 5:
        return 0   # night
    if h <= 10:
        return 1   # morning ramp
    if h <= 15:
        return 2   # midday
    if h <= 20:
        return 3   # evening peak
    return 4       # late evening


def time_features(ts):
    ts = pd.DatetimeIndex(ts)
    dates = [t.date() for t in ts]
    hour = ts.hour.values
    tod = hour * 60 + ts.minute.values
    return pd.DataFrame({
        "hour": hour,
        "tod_sin": np.sin(2 * np.pi * tod / 1440),
        "tod_cos": np.cos(2 * np.pi * tod / 1440),
        "dow": ts.dayofweek.values,
        "is_weekend": (ts.dayofweek.values >= 5).astype(int),
        "month": ts.month.values,
        "dom": ts.day.values,
        "is_holiday": [int(d in _HOL) for d in dates],
        "is_holiday_eve": [int((d + timedelta(days=1)) in _HOL) for d in dates],
        "is_long_weekend": [int(_block_len(d) >= 3) for d in dates],
        "rush_phase": [rush_phase(int(h)) for h in hour],
        "mins_from_eve_peak": np.abs(tod - 1110),   # 18:30 = 1110 min
    })


def state_features(est_rem, q, recent_svc, arr_30, arr_60, full_for, c):
    r = sorted(float(x) for x in est_rem)
    pad = lambda i: r[i] if len(r) > i else np.nan
    return dict(
        queue_len=int(q), load_ratio=q / c,
        est_rem_1=pad(0), est_rem_2=pad(1), est_rem_3=pad(2),
        est_rem_mean=float(np.mean(r)), est_rem_max=r[-1], est_rem_sum=float(np.sum(r)),
        recent_svc=float(recent_svc), arr_30=int(arr_30), arr_60=int(arr_60),
        full_for=float(full_for), offered_load_30=arr_30 * recent_svc / (30.0 * c),
        baseline=baseline_wait(r, q, recent_svc),
    )


def to_model_frame(df):
    X = df[FEATURES].copy()
    for col, lv in CATEGORY_LEVELS.items():
        X[col] = pd.Categorical(X[col], categories=lv)
    return X


def build_features(events, stations, sigma=EST_NOISE_SIGMA, seed=SEED):
    """events: one row per car that arrived and found ALL chargers busy (see 04_simulate_queue.py)."""
    rng = np.random.default_rng(seed)
    st = stations.set_index("station_id").to_dict("index")
    recs = []
    for e in events.itertuples(index=False):
        s = st[e.station_id]
        true = np.asarray(e.true_rem, dtype=float)
        est = true * rng.lognormal(0.0, sigma, size=len(true))   # what a live system would *estimate*
        d = state_features(est, e.queue_len, e.recent_svc, e.arr_30, e.arr_60, e.full_for, int(s["n_chargers"]))
        d.update(station_type=s["station_type"], charger_type=s["charger_type"],
                 charger_kw=float(s["kw"]), n_chargers=int(s["n_chargers"]))
        recs.append(d)
    S = pd.DataFrame(recs)
    T = time_features(events["arr_dt"])
    M = events[["station_id", "arr_dt", "wait"]].reset_index(drop=True)
    out = pd.concat([T, S, M], axis=1)
    day = out["arr_dt"].dt.normalize()
    out["split"] = np.select(
        [day <= pd.Timestamp(TRAIN_END), day <= pd.Timestamp(VAL_END)],
        ["train", "val"], default="test")
    return out

