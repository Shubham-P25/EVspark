# model.md — EVspark Wait-Time Model (LightGBM on baseline residual, ACN-Data adapted for India)

You are the Antigravity coding agent. Build, train, evaluate and serve a **waiting-time prediction model** for EV charging stations in India. Follow this file **top to bottom, one TASK at a time**. After each TASK, run the verification command and confirm the expected output before moving on. Do not skip tasks. Do not merge tasks. If a TASK fails, fix only that TASK's file and re-run it.

---

## 0. What we are building (read once)

**Behaviour required by the product**

1. If **any charger is free** → waiting time = **0**. No ML involved. (Deterministic gate.)
2. If **all chargers are occupied** → predict waiting time in minutes, with a range: **P50** (headline), **P80**, **P90**.
3. Also output the probability that the wait is **longer than 15 minutes** (a "long wait" alert with high precision).

**Model design (fixed — do not change)**

- **Stage A — Baseline (physics/queue):** simulate the queue forward using the estimated remaining time of each busy charger and the recent average session length for cars already queued.
- **Stage B — LightGBM on the baseline's error:** target = `actual_wait − baseline_wait`. Final prediction = `max(0, baseline + predicted_residual)`.
- **Quantile models:** three LightGBM regressors (alpha 0.5, 0.8, 0.9) on the residual.
- **Classifier:** LightGBM binary classifier for `wait > 15 min`, threshold chosen on validation to reach precision ≥ 0.88.

**Data design — IMPORTANT, understand this**

- ACN-Data (Caltech/JPL, USA) contains **real charging sessions** (arrival time, departure time, energy) but **has NO queue or waiting-time labels** and is a US workplace.
- So we use ACN-Data for what is real in it: **arrival sequences** (day-to-day variation, bursts, weekday/weekend structure) and the **energy-demand distribution shape**.
- We then **adapt to India** (all India settings are marked `ASSUMPTION` — they are replaceable with real operator data later):
  - Re-time arrivals to Indian demand profiles per station type (office / mall / highway / residential) with an **evening peak around 6 PM** (public Indian data shows session peak at ~6 PM and two-wheelers dominating sessions).
  - Indian vehicle mix (2W / 3W / 4W) and Indian charger types (AC 3.3 kW, AC 7.4 kW, DC 30 kW, DC 60 kW).
  - Indian holidays (Maharashtra calendar), festival days, holiday eves and long weekends.
- Wait labels are produced by **replaying arrivals through a FIFO multi-charger queue** (each station has c chargers, cars wait if all are busy, cars balk if the queue is already long).
- **Therefore all metrics in this project are measured on simulator-derived labels.** They prove the pipeline works and the model learns queue/rush-hour behaviour. They are NOT proof of real-world accuracy in India. The report MUST say this (see TASK 12).

---

## 1. HARD RULES (violating any of these = task failed)

1. **Never fabricate ACN-Data.** If the download fails or no token exists, STOP and tell the user exactly what is missing. Do not generate fake "ACN" data.
2. **Never change these to make metrics pass:** `EST_NOISE_SIGMA`, `TOL_ABS_MIN`, `TOL_REL`, `LONG_WAIT_MIN`, split dates, the label definition, the metric definitions, the acceptance thresholds.
3. **Time-based split only.** Train ≤ 2019-09-30, Val 2019-10-01..2019-11-30, Test ≥ 2019-12-01. Never shuffle across time. Never evaluate on train/val and call it test.
4. **No leakage.** Model features must never include `true_rem`, `wait`, `start`, or anything computed from the future. Only use information that a live system would know at the moment a car arrives.
5. **Report honest numbers even if the gate fails.** If the acceptance gate fails after the allowed tuning steps (section 6), write the real numbers in the report and stop. Do not rig anything.
6. Python 3.10+. Keep every script runnable on its own: `python <file>.py`.
7. Do not print or commit the ACN API token. `.env` must be in `.gitignore`.

---

## 2. Where to put things

First **inspect the repo**. Find the existing FastAPI forecasting service (Phase 2 scaffolding). Create the folder `ml/` **inside that service's root**. If you cannot find it, create `ml/` at the repo root and tell the user.

Final layout (create exactly this):

```
ml/
  .env                      # ACN_API_TOKEN=xxxx   (user provides; never commit)
  requirements.txt
  config.py
  features.py
  01_download_acn.py
  02_clean_sessions.py
  03_generate_arrivals.py
  04_simulate_queue.py
  05_build_features.py
  06_train.py
  07_evaluate.py
  predictor.py
  run_all.sh
  tests/test_ml.py
  data/raw/  data/interim/  data/processed/   # git-ignored
  models/    reports/
```

Add to the repo `.gitignore`:

```
ml/.env
ml/data/
```

---

## TASK 1 — requirements.txt

Create `ml/requirements.txt`:

```
pandas>=2.0
numpy>=1.24
scipy>=1.10
requests>=2.31
lightgbm>=4.0
scikit-learn>=1.3
holidays>=0.50
pyarrow>=14
matplotlib>=3.7
tabulate>=0.9
python-dotenv>=1.0
pytest>=7.4
```

Run: `cd ml && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
Verify: `python -c "import lightgbm, holidays, pyarrow; print('ok')"` prints `ok`.

---

## TASK 2 — config.py

Create `ml/config.py` with exactly:

```python
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw"
INTERIM = ROOT / "data" / "interim"
PROC = ROOT / "data" / "processed"
MODELS = ROOT / "models"
REPORTS = ROOT / "reports"
for _p in (RAW, INTERIM, PROC, MODELS, REPORTS):
    _p.mkdir(parents=True, exist_ok=True)

SEED = 42

# ---- ACN-Data (pre-COVID window only) ----
ACN_SITES = ["caltech", "jpl"]
ACN_START = "2019-01-01"
ACN_END = "2020-02-29"

# ---- time-based split (test = after VAL_END) ----
TRAIN_END = "2019-09-30"
VAL_END = "2019-11-30"

# ---- FIXED evaluation / realism settings (HARD RULE 2: never tune these to pass) ----
EST_NOISE_SIGMA = 0.15      # lognormal error of the *estimated* remaining charge time reported per busy charger
TOL_ABS_MIN = 5.0           # "accurate" if |error| <= max(TOL_ABS_MIN, TOL_REL * actual_wait)
TOL_REL = 0.20
LONG_WAIT_MIN = 15.0        # long-wait alert threshold
BALK_MIN_QUEUE = 2          # a car balks (does not join) if queue_len >= max(BALK_MIN_QUEUE, n_chargers)

# ---- simulator size ----
N_STATIONS = 40
HOLIDAY_SUBDIV = "MH"       # Maharashtra calendar (ASSUMPTION: Mumbai network)

# ---- acceptance gate (HARD RULE 2) ----
GATE_ACCURACY = 0.88        # share of test predictions within tolerance
GATE_PRECISION = 0.88       # precision of the long-wait classifier
GATE_P80_COVERAGE = (0.77, 0.83)

# ---- India charger / vehicle assumptions (ASSUMPTION: replace with operator data) ----
CHARGER_TYPES = {
    "AC_3.3": dict(kw=3.3,  dc=False, mix={"2W": 0.75, "3W": 0.10, "4W": 0.15}),
    "AC_7.4": dict(kw=7.4,  dc=False, mix={"2W": 0.35, "3W": 0.10, "4W": 0.55}),
    "DC_30":  dict(kw=30.0, dc=True,  mix={"3W": 0.05, "4W": 0.95}),
    "DC_60":  dict(kw=60.0, dc=True,  mix={"4W": 1.00}),
}
# kWh per session: (median, sigma_log, min, max)
ENERGY = {
    "2W":    (2.0, 0.35, 0.8, 5.0),
    "3W":    (6.0, 0.35, 2.0, 12.0),
    "4W_AC": (16.0, 0.50, 4.0, 45.0),
    "4W_DC": (24.0, 0.35, 8.0, 45.0),
}
VEH_MAX_KW = {"2W": 3.0, "3W": 4.0, "4W_AC": 7.4, "4W_DC": 50.0}
CHARGER_EFFICIENCY = 0.90
PLUGIN_OVERHEAD_MIN = 2.0

STATION_TYPES = ["office", "mall", "highway", "residential"]
# probability of each charger type per station type, order = AC_3.3, AC_7.4, DC_30, DC_60
CTYPE_PROB = {
    "office":      [0.30, 0.55, 0.15, 0.00],
    "mall":        [0.30, 0.40, 0.20, 0.10],
    "highway":     [0.00, 0.10, 0.45, 0.45],
    "residential": [0.60, 0.40, 0.00, 0.00],
}

# hourly arrival weights (24 values, hour 0..23). ASSUMPTION: shapes follow Indian commuting; evening peak ~18:00.
HOURLY = {
    "office": {
        "wd": [0.1,0.05,0.05,0.05,0.1,0.3, 1.0,3.0,5.5,4.5,3.0,2.5, 3.0,2.5,2.0,2.0,2.5,3.0, 2.5,1.5,0.8,0.4,0.2,0.1],
        "we": [0.2,0.1,0.1,0.1,0.1,0.2, 0.4,0.8,1.2,1.5,1.8,2.0, 2.0,2.0,1.8,1.6,1.5,1.5, 1.2,0.8,0.5,0.3,0.2,0.2],
    },
    "mall": {
        "wd": [0.1,0.05,0.05,0.05,0.05,0.1, 0.3,0.8,1.2,1.5,2.0,2.8, 3.2,3.0,2.8,3.0,3.8,5.0, 6.5,6.0,4.5,2.5,1.0,0.3],
        "we": [0.1,0.05,0.05,0.05,0.05,0.1, 0.3,0.6,1.0,2.0,3.2,4.2, 4.8,4.8,4.5,4.5,5.0,5.5, 6.0,5.5,4.5,3.0,1.5,0.5],
    },
    "highway": {
        "wd": [0.4,0.3,0.3,0.4,0.8,1.5, 2.5,3.5,4.0,4.0,4.2,4.5, 4.5,4.2,4.0,4.0,4.2,4.5, 4.5,4.0,3.0,2.0,1.2,0.7],
        "we": [0.4,0.3,0.3,0.4,0.8,1.5, 2.5,3.5,4.5,5.0,5.5,5.5, 5.5,5.0,4.5,4.5,4.8,5.0, 5.0,4.5,3.5,2.2,1.2,0.7],
    },
    "residential": {
        "wd": [0.3,0.2,0.2,0.2,0.3,0.8, 1.5,2.0,1.5,1.0,0.8,0.8, 1.0,0.8,0.8,0.8,1.2,2.5, 4.5,6.0,6.5,5.5,3.5,1.5],
        "we": [0.4,0.3,0.3,0.3,0.4,0.8, 1.5,2.2,2.8,3.0,3.0,3.0, 3.0,2.8,2.8,3.0,3.5,4.0, 4.5,5.0,5.0,4.2,3.0,1.2],
    },
}
# daily volume multipliers by day kind. ASSUMPTION: highways spike on holidays / holiday eves (long-weekend travel).
DAY_MULT = {
    "office":      {"wd": 1.0, "we": 0.45, "hol": 0.35, "eve": 1.0},
    "mall":        {"wd": 1.0, "we": 1.40, "hol": 1.35, "eve": 1.1},
    "highway":     {"wd": 1.0, "we": 1.50, "hol": 1.80, "eve": 1.5},
    "residential": {"wd": 1.0, "we": 1.15, "hol": 1.20, "eve": 1.0},
}
```

Verify: `python -c "import config; print(len(config.HOURLY['mall']['wd']))"` prints `24`.
Also verify every list in `HOURLY` has length 24:
`python -c "import config as c; assert all(len(v)==24 for s in c.HOURLY.values() for v in s.values()); print('ok')"`

---

## TASK 3 — features.py (shared by training AND serving)

Create `ml/features.py` with exactly:

```python
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
```

Verify: `python -c "from features import baseline_wait as b; print(b([10,20],2,30))"` prints `40.0`
(explanation: queued car 1 takes the charger free at 10 → ends 40; queued car 2 takes the charger free at 20 → ends 50; new car waits until 40).

---

## TASK 4 — 01_download_acn.py

ACN-Data needs a **free API token**: register at https://ev.caltech.edu/dataset . The user puts it in `ml/.env` as `ACN_API_TOKEN=...`. If the token is missing, **stop and ask the user**.

Create `ml/01_download_acn.py`:

```python
import os, sys, json
import requests
import pandas as pd
from dotenv import load_dotenv
from config import *

load_dotenv(ROOT / ".env")
TOKEN = os.getenv("ACN_API_TOKEN")
if not TOKEN:
    sys.exit("ACN_API_TOKEN missing. Get a free token at https://ev.caltech.edu/dataset and put it in ml/.env. "
             "Do NOT fabricate data.")

HOST = "https://ev.caltech.edu"
BASE = HOST + "/api/v1/sessions/"


def http_date(d):
    return pd.Timestamp(d, tz="UTC").strftime("%a, %d %b %Y %H:%M:%S GMT")


def fetch_site(site):
    where = f'connectionTime>="{http_date(ACN_START)}" and connectionTime<="{http_date(ACN_END)}"'
    url, params, items = BASE + site, {"where": where}, []
    while url:
        r = requests.get(url, params=params, auth=(TOKEN, ""), timeout=120)
        r.raise_for_status()
        js = r.json()
        items += js["_items"]
        nxt = js.get("_links", {}).get("next")
        params = None
        if nxt:
            href = nxt["href"]
            url = href if href.startswith("http") else (HOST + href if href.startswith("/") else BASE.rsplit("sessions/", 1)[0] + href)
        else:
            url = None
        print(site, len(items), end="\r")
    print()
    return items


for site in ACN_SITES:
    data = fetch_site(site)
    if not data:
        sys.exit(f"No sessions returned for {site}. Check the token and the API docs at https://ev.caltech.edu/info/api")
    with open(RAW / f"{site}.json", "w") as f:
        json.dump(data, f)
    print(f"saved {site}: {len(data)} sessions")
```

Run: `python 01_download_acn.py`
Expected: prints a count for `caltech` and `jpl`, each in the **thousands** (Caltech roughly 15–25k for the window, JPL roughly 10–20k). If pagination/auth format differs from the code, print the first response (`js.keys()`), read https://ev.caltech.edu/info/api, fix ONLY the request code, and retry. Never fall back to fake data.

---

## TASK 5 — 02_clean_sessions.py

```python
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
```

Run: `python 02_clean_sessions.py`
Expected: sessions > 15,000, days > 300.

---

## TASK 6 — 03_generate_arrivals.py (India adaptation)

What it does: creates `N_STATIONS` virtual Indian stations; for every calendar day picks a **real ACN day as a template**, keeps its relative arrival ordering/bursts, **re-times it to the station type's Indian hourly profile** (quantile mapping), scales volume by day kind (weekday / weekend / holiday / holiday-eve), and gives every car an Indian vehicle class, energy and charging time.

```python
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
```

Run: `python 03_generate_arrivals.py`
Expected: arrivals between 150,000 and 1,500,000; the hourly distribution should show a visible **evening peak around 17:00–20:00**.

---

## TASK 7 — 04_simulate_queue.py (labels)

Replays each station's arrivals through a FIFO queue with `c` chargers. A car that finds a free charger starts immediately (wait 0, no training row). A car that finds all chargers busy either **balks** (queue already long, no row) or **joins** (creates one training event whose label is its realised wait).

```python
import heapq
from collections import deque
import numpy as np
import pandas as pd
from config import *

arr_all = pd.read_parquet(INTERIM / "arrivals.parquet")
stations = pd.read_parquet(INTERIM / "stations.parquet")
T0 = pd.Timestamp(ACN_START)


def simulate_station(arr_min, svc, c, prior_svc):
    n = len(arr_min)
    start = np.full(n, np.nan)
    servers, queue = [], deque()
    done_svc = deque(maxlen=20)
    st = {"last_free": float(arr_min[0]) if n else 0.0}
    rows, balked = [], 0

    def advance(t):
        while servers and servers[0][0] <= t:
            end_t, j = heapq.heappop(servers)
            done_svc.append(svc[j])
            if queue:
                k = queue.popleft()
                start[k] = end_t
                heapq.heappush(servers, (end_t + svc[k], k))
            else:
                st["last_free"] = end_t

    for i in range(n):
        t = arr_min[i]
        advance(t)
        if len(servers) < c:
            start[i] = t
            heapq.heappush(servers, (t + svc[i], i))
            st["last_free"] = t
        else:
            ql = len(queue)
            if ql >= max(BALK_MIN_QUEUE, c):
                balked += 1
                continue
            rows.append(dict(
                arr_idx=i, arr_min=float(t),
                true_rem=sorted(float(e - t) for e, _ in servers),
                queue_len=ql,
                recent_svc=float(np.mean(done_svc)) if len(done_svc) >= 5 else float(prior_svc),
                arr_30=int(i - np.searchsorted(arr_min, t - 30, side="right")),
                arr_60=int(i - np.searchsorted(arr_min, t - 60, side="right")),
                full_for=float(t - st["last_free"]),
            ))
            queue.append(i)
    advance(np.inf)
    for r in rows:
        r["wait"] = float(start[r["arr_idx"]] - arr_min[r["arr_idx"]])
    return rows, balked


all_rows, tot_arr, tot_balk = [], 0, 0
for s in stations.itertuples(index=False):
    a = arr_all[arr_all["station_id"] == s.station_id].sort_values("arr_dt").reset_index(drop=True)
    arr_min = ((a["arr_dt"] - T0).dt.total_seconds() / 60.0).values
    rows, balked = simulate_station(arr_min, a["svc_min"].values, int(s.n_chargers), s.mean_svc)
    for r in rows:
        r["station_id"] = s.station_id
        r["arr_dt"] = T0 + pd.Timedelta(minutes=r["arr_min"])
    all_rows += rows
    tot_arr += len(a)
    tot_balk += balked

ev = pd.DataFrame(all_rows)
assert ev["wait"].notna().all() and (ev["wait"] > 0).all(), "labels must be positive and complete"
ev.to_parquet(INTERIM / "blocked_events.parquet")

share = len(ev) / tot_arr
print(f"arrivals={tot_arr:,} | joined-queue events={len(ev):,} ({share:.1%}) | balked={tot_balk:,}")
print("wait minutes quantiles:\n", ev["wait"].quantile([.1, .25, .5, .75, .9, .99]).round(1).to_string())
assert 0.03 <= share <= 0.50, "blocked share unrealistic: adjust the util range in 03_generate_arrivals.py ONLY"
assert 3 <= ev["wait"].median() <= 120, "median wait unrealistic: adjust the util range in 03 ONLY"
```

Run: `python 04_simulate_queue.py`
Expected: at least **15,000 events**, positive waits, median wait between 3 and 120 minutes. If an assert fails, you may adjust the `util` range in TASK 6 only (not noise, not tolerances).

---

## TASK 8 — 05_build_features.py

```python
import pandas as pd
from config import *
from features import build_features

ev = pd.read_parquet(INTERIM / "blocked_events.parquet")
st = pd.read_parquet(INTERIM / "stations.parquet")
df = build_features(ev, st, sigma=EST_NOISE_SIGMA, seed=SEED)
df.to_parquet(PROC / "features.parquet")
print(df["split"].value_counts())
print("baseline MAE (all):", round((df["wait"] - df["baseline"]).abs().mean(), 2), "min")
```

Run: `python 05_build_features.py`
Expected: three splits, each with thousands of rows (train largest). A printed baseline MAE.

Leakage check (run once):
`python -c "from features import FEATURES as F; assert not any(('true' in f) or f=='wait' or f=='split' for f in F); print('no leakage columns')"`

---

## TASK 9 — 06_train.py

```python
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
```

Run: `python 06_train.py`
Expected: four model files in `ml/models/` (`lgbm_resid_p50.txt`, `lgbm_resid_p80.txt`, `lgbm_resid_p90.txt`, `lgbm_long_wait_clf.txt`) plus `metadata.json`.

---

## TASK 10 — 07_evaluate.py (acceptance gate + report)

```python
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
```

Run: `python 07_evaluate.py`
Expected: prints the gate table, writes `reports/report.md`, `reports/metrics.json`, `reports/evaluation.png`. Exit code 0 means the hard gate passed; exit code 1 means at least one hard check failed.

---

## TASK 11 — predictor.py (serving, uses the SAME features.py)

```python
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
```

### FastAPI endpoint
Find the existing FastAPI forecasting service and add a router (follow the project's existing router style):

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from ml.predictor import WaitPredictor   # adjust import path to the service layout

router = APIRouter()
_predictor = WaitPredictor()

class WaitRequest(BaseModel):
    station_id: str
    station_type: str = Field(pattern="^(office|mall|highway|residential)$")
    charger_type: str = Field(pattern=r"^(AC_3\.3|AC_7\.4|DC_30|DC_60)$")
    n_chargers: int = Field(ge=1, le=50)
    chargers_free: int = Field(ge=0)
    timestamp: str                                   # ISO 8601, IST or with tz offset
    queue_len: int = Field(0, ge=0)
    charger_remaining_min: Optional[List[float]] = None   # estimated minutes left on each busy charger
    arrivals_last_30: int = 0
    arrivals_last_60: int = 0
    recent_avg_session_min: Optional[float] = None
    minutes_station_full: float = 0.0

@router.post("/v1/wait-time")
def wait_time(req: WaitRequest):
    try:
        return _predictor.predict(req.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
```

Mapping from the existing EV Twin pipeline (document this in the code as comments): `chargers_free` and `charger_remaining_min` come from the OCPP→MQTT availability + meter values; `queue_len`, `arrivals_last_30/60` and `minutes_station_full` come from the geofence queue logic (80 m entry / 100 m exit, 5-minute dwell); `recent_avg_session_min` is the rolling mean of the last completed sessions at that pool.

---

## TASK 12 — tests/test_ml.py

```python
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
```

Run: `cd ml && python -m pytest tests -q`
Expected: 5 passed.

---

## TASK 13 — run_all.sh

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
python 01_download_acn.py
python 02_clean_sessions.py
python 03_generate_arrivals.py
python 04_simulate_queue.py
python 05_build_features.py
python 06_train.py
python 07_evaluate.py || echo "GATE NOT FULLY PASSED — read reports/report.md"
python -m pytest tests -q
```

---

## 6. If the acceptance gate FAILS — allowed steps, in this order

Re-run `06_train.py` then `07_evaluate.py` after each step. Stop at the first step that passes the gate.

1. **Sanity-check the data** (TASK 7 printout): is the median wait plausible (3–120 min)? Is the blocked share between 3% and 50%? Is there an evening peak in TASK 6's hourly printout? Fix the simulator `util` range only if not.
2. **More data:** raise `N_STATIONS` to 80 in `config.py`, re-run TASKS 6–10.
3. **Better fit:** lower `learning_rate` to 0.02; try `num_leaves` in {31, 63, 127}; `min_child_samples` in {20, 40, 80}. Keep early stopping on the validation split.
4. **More causal features** (computed only from information available at arrival): e.g. `arr_15`, `arr_30 - arr_60/2` (demand trend), average of the last 5 completed sessions. Add them in BOTH `features.state_features` / `04_simulate_queue.py` and the predictor request schema.
5. **Optional Optuna** (max 30 trials, objective = validation MAE of the P50 model; never look at test).

**Forbidden at any step:** changing `EST_NOISE_SIGMA`, `TOL_*`, `LONG_WAIT_MIN`, split dates, label definition, gate thresholds; dropping hard rows from the test set; training on validation or test; adding features derived from `true_rem` or `wait`.

If the gate still fails after step 5: **stop**, leave the real numbers in `reports/report.md`, and tell the user which checks failed and by how much.

---

## 7. What to tell the user at the end (final message format)

Report, in plain language:

1. Which gate checks PASSED / FAILED, with the real numbers: accuracy within tolerance, MAE, RMSE, long-wait precision and recall, P80 coverage, MAE improvement over the baseline.
2. The robustness table (how accuracy changes when the live remaining-time estimate is noisier). Highlight that real-world accuracy depends heavily on how good the real remaining-time estimate is.
3. The limitation paragraph (labels are simulator-derived, India settings are assumptions).
4. The files created and the endpoint `/v1/wait-time`.
5. Next step: when real EV Twin logs exist, produce a `blocked_events.parquet` in the same schema (columns: `station_id, arr_dt, true_rem (list of minutes), queue_len, recent_svc, arr_30, arr_60, full_for, wait`, plus a `stations.parquet`), skip TASKS 4–6, and re-run TASKS 8–10 to retrain on real data.

---

## 8. Definition of done (checklist)

- [ ] All 13 tasks completed in order, each verified
- [ ] `ml/models/` has 4 model files + `metadata.json`
- [ ] `ml/reports/report.md`, `metrics.json`, `evaluation.png` exist and contain the limitation paragraph
- [ ] `pytest` shows 5 passed
- [ ] `/v1/wait-time` returns `wait_min = 0` when a charger is free and P50/P80/P90 when all are busy
- [ ] `.env` and `data/` are git-ignored; no token in any committed file
- [ ] Final message follows section 7, with honest numbers
