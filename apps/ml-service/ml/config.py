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

