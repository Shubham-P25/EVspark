$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$Python = "..\venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    $Python = "python"
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  EVspark Wait-Time Model Training Pipeline" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/8] Downloading real ACN-Data sessions (Caltech & JPL)..." -ForegroundColor Yellow
& $Python 01_download_acn.py

Write-Host "`n[2/8] Cleaning sessions & filtering charging durations..." -ForegroundColor Yellow
& $Python 02_clean_sessions.py

Write-Host "`n[3/8] Generating Indian station arrivals and demand profiles..." -ForegroundColor Yellow
& $Python 03_generate_arrivals.py

Write-Host "`n[4/8] Simulating multi-charger FIFO queue and wait-time labels..." -ForegroundColor Yellow
& $Python 04_simulate_queue.py

Write-Host "`n[5/8] Building engineered features and train/val/test splits..." -ForegroundColor Yellow
& $Python 05_build_features.py

Write-Host "`n[6/8] Training LightGBM quantile regressors (P50, P80, P90) and classifier..." -ForegroundColor Yellow
& $Python 06_train.py

Write-Host "`n[7/8] Evaluating against acceptance gate & generating reports..." -ForegroundColor Yellow
try {
    & $Python 07_evaluate.py
} catch {
    Write-Warning "Acceptance gate did not meet 100% of hard thresholds. See reports/report.md."
}

Write-Host "`n[8/8] Running ML predictor unit test suite..." -ForegroundColor Yellow
& $Python -m pytest tests -q

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  Pipeline execution complete! Check reports/report.md" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

