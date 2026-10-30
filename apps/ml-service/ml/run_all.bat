@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
set "PYTHON=..\venv\Scripts\python.exe"

if not exist "!PYTHON!" (
    set "PYTHON=python"
)

echo ========================================================
echo   EVspark Wait-Time Model Training Pipeline
echo ========================================================
echo.

echo [1/8] Downloading real ACN-Data sessions (Caltech & JPL)...
!PYTHON! 01_download_acn.py
if errorlevel 1 (
    echo Error during download. Exiting.
    exit /b 1
)

echo.
echo [2/8] Cleaning sessions & filtering charging durations...
!PYTHON! 02_clean_sessions.py
if errorlevel 1 (
    echo Error during cleaning. Exiting.
    exit /b 1
)

echo.
echo [3/8] Generating Indian station arrivals and demand profiles...
!PYTHON! 03_generate_arrivals.py
if errorlevel 1 (
    echo Error during arrival generation. Exiting.
    exit /b 1
)

echo.
echo [4/8] Simulating multi-charger FIFO queue and wait-time labels...
!PYTHON! 04_simulate_queue.py
if errorlevel 1 (
    echo Error during queue simulation. Exiting.
    exit /b 1
)

echo.
echo [5/8] Building engineered features and train/val/test splits...
!PYTHON! 05_build_features.py
if errorlevel 1 (
    echo Error during feature engineering. Exiting.
    exit /b 1
)

echo.
echo [6/8] Training LightGBM quantile regressors (P50, P80, P90) and classifier...
!PYTHON! 06_train.py
if errorlevel 1 (
    echo Error during model training. Exiting.
    exit /b 1
)

echo.
echo [7/8] Evaluating against acceptance gate & generating reports...
!PYTHON! 07_evaluate.py
if errorlevel 1 (
    echo [NOTE] Some gate metrics did not pass all hard thresholds. See reports\report.md.
)

echo.
echo [8/8] Running ML predictor unit test suite...
!PYTHON! -m pytest tests -q

echo.
echo ========================================================
echo   Pipeline finished! Check reports\report.md
echo ========================================================

