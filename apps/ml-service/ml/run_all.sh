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

