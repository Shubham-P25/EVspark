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

