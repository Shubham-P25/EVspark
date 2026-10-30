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
    url, params, items = BASE + site, {"where": where, "max_results": 100}, []
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
        print(f"Fetching {site}: {len(items)} sessions...", end="\r", flush=True)
    print()
    return items


for site in ACN_SITES:
    data = fetch_site(site)
    if not data:
        sys.exit(f"No sessions returned for {site}. Check the token and the API docs at https://ev.caltech.edu/info/api")
    with open(RAW / f"{site}.json", "w") as f:
        json.dump(data, f)
    print(f"saved {site}: {len(data)} sessions")
