# Real-Data Integration Guide

This guide details how real hardware chargers and operator networks connect to EVspark.

---

## 1. Option A — MQTT Gateway

Hardware gateways (or cloud-to-cloud IoT bridges) publish telemetry directly to the broker:

- **Topic:** `evtwin/stations/{stationId}/chargers/{chargerId}/telemetry`
- **QoS:** 1 (retained message recommended for initial state)
- **JSON Payload Contract:** Set `"source": "real"` for physical equipment.

### Example Telemetry Message:
```json
{
  "v": 1,
  "ts": "2026-10-12T10:15:30.000Z",
  "status": "BUSY",
  "powerKw": 58.4,
  "soc": 64.2,
  "socStart": 22.0,
  "energyKwh": 26.8,
  "sessionId": "real-tx-883149",
  "vehicle": "Tata Nexon EV Max",
  "source": "real"
}
```

When a session finishes:
```json
{
  "v": 1,
  "ts": "2026-10-12T10:45:00.000Z",
  "status": "FREE",
  "powerKw": 0,
  "soc": 80.0,
  "energyKwh": 35.6,
  "source": "real"
}
```

---

## 2. Option B — OCPP 1.6J

Physical charge points connect over WebSocket directly to the EVspark OCPP central system:

- **Endpoint:** `ws://<api-host>/ocpp/1.6/{chargePointId}`
- **ChargePoint Identity:** The `{chargePointId}` path parameter must match the station's `Charger.ocppId` in the EVspark database.
- Supported operations: `BootNotification`, `StatusNotification`, `StartTransaction`, `MeterValues`, `StopTransaction`, `Heartbeat`.

---

## 3. How a New Operator Onboards

1. **Create Account:** Register as an operator via the onboarding flow (`POST /api/onboarding`).
2. **Add Station:** Register the station and hardware specifications (`POST /api/operator/stations`).
3. **Obtain Charger IDs:** Chargers receive generated UUIDs and optional OCPP identifiers.
4. **Configure Gateway/Chargers:** Configure the physical MQTT bridge with the assigned `{stationId}` and `{chargerId}` or point OCPP WebSocket to `ws://<api>/ocpp/1.6/{chargePointId}`.
5. **Live Verification:** Real-time charging telemetry instantly reflects in the Operator Console (`/station`) and Driver Map without manual refresh.

---

## 4. What to Turn Off for Real Data

When deploying for production with real hardware:

- Set `DEMO_MODE=false` in API environment variables.
- Stop the simulation processes (`pnpm feed` and `pnpm ghosts`).
- Change geofence radius to production value: `GEOFENCE_RADIUS_M=300` (or `200` to `500` meters).

---

## 5. Honesty Rule

To maintain transparency:
- Any telemetry or session without `"source": "real"` is tagged as `"source": "twin"` and rendered with the "Simulated" badge in UI layers.
- Production systems must preserve the distinction between simulated data and verified hardware telemetry.
