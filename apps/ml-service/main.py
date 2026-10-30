import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import model

sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn and sentry_dsn.strip():
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=sentry_dsn.strip(),
            traces_sample_rate=0.1,
        )
    except ImportError:
        pass

app = FastAPI(
    title="EVspark AI Forecasting Service",
    description="Physics-informed LightGBM / HistGradientBoosting wait-time prediction service for Maharashtra EV charging network.",
    version="1.2.0"
)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:4000")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SingleWaitRequest(BaseModel):
    station_id: str
    hour: Optional[int] = None
    day_of_week: Optional[int] = None
    total_chargers: Optional[int] = 4
    busy_chargers: Optional[int] = 0
    queue_length: Optional[float] = 0.0
    avg_power_kw: Optional[float] = 50.0
    historical_avg_duration: Optional[float] = 35.0
    # Backward compatibility fields
    current_wait: Optional[float] = None
    chargers_busy: Optional[int] = None
    chargers_total: Optional[int] = None
    hour_of_day: Optional[int] = None
    horizon_min: Optional[int] = 30

class WaitPredictionResponse(BaseModel):
    station_id: str
    predicted_wait_min: float
    confidence: float
    horizon_min: int = 30
    model_version: str
    traffic_level: str
    is_fallback: bool

class BatchWaitRequest(BaseModel):
    stations: List[SingleWaitRequest]

class BatchWaitResponse(BaseModel):
    predictions: List[Dict[str, Any]]
    total_stations: int

@app.get("/health")
@app.get("/healthz")
def health():
    metrics = model.get_metrics()
    return {
        "status": "ok",
        "service": "evspark-ml-forecast",
        "model_loaded": metrics.get("model_loaded", False),
        "version": metrics.get("version", "1.2.0"),
        "mae": metrics.get("mae", 2.8),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/metrics")
def get_metrics():
    """
    Returns live model accuracy and training evaluation statistics.
    """
    return model.get_metrics()

@app.post("/predict/wait", response_model=WaitPredictionResponse)
def predict_wait(req: SingleWaitRequest):
    req_dict = req.dict()
    # Normalize input aliases
    if req.chargers_busy is not None:
        req_dict["busy_chargers"] = req.chargers_busy
    if req.chargers_total is not None:
        req_dict["total_chargers"] = req.chargers_total
    if req.hour_of_day is not None:
        req_dict["hour"] = req.hour_of_day

    result = model.predict_wait_time(req_dict)
    wait = result["predicted_wait_min"]

    traffic = "low" if wait < 5 else "moderate" if wait <= 15 else "high"

    return WaitPredictionResponse(
        station_id=req.station_id,
        predicted_wait_min=wait,
        confidence=result["confidence"],
        horizon_min=req.horizon_min or 30,
        model_version=result["model_version"],
        traffic_level=traffic,
        is_fallback=result["is_fallback"],
    )

@app.post("/predict/batch", response_model=BatchWaitResponse)
def predict_batch_endpoint(req: BatchWaitRequest):
    stations_data = []
    for s in req.stations:
        d = s.dict()
        if s.chargers_busy is not None:
            d["busy_chargers"] = s.chargers_busy
        if s.chargers_total is not None:
            d["total_chargers"] = s.chargers_total
        if s.hour_of_day is not None:
            d["hour"] = s.hour_of_day
        stations_data.append(d)

    preds = model.predict_batch(stations_data)
    return BatchWaitResponse(
        predictions=preds,
        total_stations=len(preds)
    )

@app.post("/predict")
def legacy_predict(req: SingleWaitRequest):
    """
    Backward compatibility endpoint for older API clients.
    """
    return predict_wait(req)


# --- Wait-Time Model (LightGBM on baseline residual) Endpoint (Task 11) ---
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

_wait_predictor = None

def get_wait_predictor():
    global _wait_predictor
    if _wait_predictor is None:
        try:
            from ml.predictor import WaitPredictor
            _wait_predictor = WaitPredictor()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"WaitPredictor model not loaded: {e}")
    return _wait_predictor

@app.post("/v1/wait-time")
def wait_time(req: WaitRequest):
    """
    Predicts waiting time for an EV arriving at a charging station.
    - If any charger is free -> wait_min = 0 (deterministic gate).
    - If all chargers are busy -> evaluates baseline + LightGBM quantile regressors (P50, P80, P90)
      plus long-wait (> 15 min) classifier alert.

    Mapping from existing EV Twin pipeline:
    - chargers_free and charger_remaining_min come from OCPP->MQTT availability + meter values.
    - queue_len, arrivals_last_30/60 and minutes_station_full come from geofence queue logic.
    - recent_avg_session_min is the rolling mean of the last completed sessions at that pool.
    """
    predictor = get_wait_predictor()
    try:
        return predictor.predict(req.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
