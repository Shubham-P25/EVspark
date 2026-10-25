# EVspark Simulation Demo — QA Walkthrough & Scenario Guide

This document records the visual and invariant verification of all 11 scenario presets in the EVspark Geofence Demo simulation.

---

## 1. Test Environment & Setup

- **URL:** `http://localhost:3000/driver`
- **Center Location:** Thane, Mumbai (lat: 19.2183, lng: 72.9781)
- **Controls Tested:** `DemoButton.tsx`, `DemoPanel.tsx`, `DemoCanvas.tsx`, `DemoSlot.tsx`
- **Active Invariants Enforced:**
  1. Minimum car-to-car center distance: $\ge 3.0\text{ m}$.
  2. Charging queue capacity: $\le \text{online chargers}$.
  3. Geofence clearance to adjacent roads: $\ge 7.0\text{ m}$.
  4. Labeling: "Simulated demo" banner visible whenever engine runs.

---

## 2. Preset Walkthrough (Scenarios 1–11)

### Preset 1: Empty → First Car (Default)
- **Action:** Select "1. Empty → first car (default)" or click "Demo" button.
- **Expected Behavior:**
  - Map darkens normal station pins to 35% opacity.
  - "Simulated demo" banner appears at the top center.
  - Station fences appear as translucent blue circles with dashed borders.
  - Station bays are initially empty (`⚡ 0/3 · ⏳ 0`).
  - First car appears along approach road, advances towards the gate, and enters the fence.
- **Verification:** ✅ PASS. Invariant holds: initial state is empty.

### Preset 2: Free Charger (Direct to Bay)
- **Action:** Select "2. Free charger (direct to bay)".
- **Expected Behavior:**
  - One `CHARGER` car is spawned on the approach route.
  - Upon reaching the gate and entering the fence, it immediately reserves Charger 1.
  - Bay chip changes to amber (RESERVED), car moves along the driveway to Bay 1, and plugs in (`PLUG_IN` event emitted).
  - Bay turns blue with vertical progress fill indicator.
- **Verification:** ✅ PASS. Car transitions from `APPROACH` → `INSIDE_MOVE` → `CHARGING`.

### Preset 3: Fill All Chargers
- **Action:** Select "3. Fill all chargers".
- **Expected Behavior:**
  - 3 `CHARGER` cars spawn at 3-second staggered intervals.
  - Each car navigates into the fence and occupies a free charger bay.
  - Charging queue counter reaches `3/3`. Waiting queue remains `0`.
- **Verification:** ✅ PASS. Charging queue reaches exactly the capacity of online chargers.

### Preset 4: Overflow → Waiting Queue
- **Action:** Select "4. Overflow → Waiting queue".
- **Expected Behavior:**
  - 6 cars spawn sequentially.
  - First 3 cars occupy all 3 charger bays.
  - Cars 4, 5, and 6 enter the fence, detect that all chargers are full, and are assigned to the `WAITING` queue.
  - Waiting cars drive into designated parking slots.
  - UI displays: `⚡ 3/3  ⏳ 3  ~12 min`.
- **Verification:** ✅ PASS. Overflow gracefully routes into the waiting queue and parks without blocking driveway circulation.

### Preset 5: Other Jobs (Visitor Discard)
- **Action:** Select "5. Other jobs (visitor discard)".
- **Expected Behavior:**
  - Car 1 (charger) fills Bay 1.
  - Car 2 and Car 3 (`STAYER` visitors) join the waiting queue and park in the parking area.
  - When Car 1 finishes charging and leaves, Charger 1 is offered to the head of the waiting queue (Car 2).
  - Because Car 2 is a visitor, it does not drive to the bay and does not plug in.
  - After the offer grace period expires, Car 2 is classified `OTHER_JOBS`, discarded from the queue (`OTHER_JOBS` event emitted), and the charger is immediately re-offered to Car 3.
- **Verification:** ✅ PASS. Intent detection rule 9 correctly resolves without human intervention.

### Preset 6: Tired of Waiting (Reneging)
- **Action:** Select "6. Tired of waiting (reneging)".
- **Expected Behavior:**
  - Charger bay is occupied by a long-running session.
  - Impatient car arrives with a 10s patience threshold and joins the waiting queue.
  - After 10s of waiting, a `RENEGED` event is emitted: *"Car got tired of waiting and left"*.
  - Car backs out of the parking slot, follows the exit driveway, and drives away down the road.
  - Waiting queue count drops from 1 back to 0.
- **Verification:** ✅ PASS. Reneging cars clean up from queue arrays and free their parking slot.

### Preset 7: Waiting Area Full (Balking)
- **Action:** Select "7. Waiting full (balking)".
- **Expected Behavior:**
  - A rapid succession of cars enter a station with limited parking slots.
  - When all bays and parking slots are occupied, subsequent arriving cars cannot park.
  - A `BALKED` event is emitted: *"Car found no space and left"*.
  - Balking cars immediately transition to `LEAVING` and drive away.
- **Verification:** ✅ PASS. Station stats increment `balked` counter. No gridlock occurs.

### Preset 8: Charger Fault & Re-Queue
- **Action:** Select "8. Charger fault & re-queue" or click an active charger chip in the panel.
- **Expected Behavior:**
  - Charger status changes to `FAULT` (red chip).
  - Active charging session is interrupted.
  - The interrupted car is safely relocated to the **front** of the Waiting queue.
  - Station online capacity drops (e.g. `2/2` instead of `3/3`).
  - Clicking the chip again restores the charger (`RESTORED` event).
- **Verification:** ✅ PASS. Fault handling protects interrupted drivers by prioritizing them in the queue.

### Preset 9: Rush Hour
- **Action:** Select "9. Rush hour (3× arrival rate)" or click the "Rush Hour" button.
- **Expected Behavior:**
  - Arrival interval divides by 3 (e.g. from 16s down to ~5s) for 60 simulation seconds.
  - High traffic density forms along the approach routes.
  - Collision avoidance maintains 5.0m safe following distance and 3.2m hard separation.
  - After 60 seconds, interval automatically restores to normal.
- **Verification:** ✅ PASS. Cars maintain lane discipline on left-hand traffic offset with zero overlap.

### Preset 10: Visitors Only (100% Stayers)
- **Action:** Select "10. Visitors only (100% stayers)".
- **Expected Behavior:**
  - Charging intent share is set to 0%. All arriving cars are `STAYER` kinds.
  - Cars enter the station, park in the parking slots, stay for their visit duration, and drive off.
  - No car uses the charger bays; chargers remain `FREE`.
  - Toggle "Show True Intent" switch: all cars render with purple badges/fill.
- **Verification:** ✅ PASS. Station functions cleanly as a mixed-use parking area.

### Preset 11: Shrunken Fence Clearance
- **Action:** Select "11. Shrunken fence clearance".
- **Expected Behavior:**
  - Focuses on a station adjacent to a major arterial roadway.
  - Fence badge indicates road clearance (e.g. "Fence 18m · Clr 25m").
  - Geofence circle visibly shrinks to avoid contacting the roadway line.
  - If the station is on road frontage, a badge indicates: *"Fence center shifted away from road frontage"*.
- **Verification:** ✅ PASS. Geofence circle maintains the required clearance buffer from road vectors.

---

## 3. Map Restoration & Cleanup
- **Action:** Click "Stop demo" button or the close button in the panel.
- **Expected Behavior:**
  - Canvas overlay is cleanly removed (`canvas.dispose()`).
  - Animation frame loop cancels immediately.
  - Normal station pins restore to 100% opacity and interactive state.
  - No lingering background intervals or memory leaks.
- **Verification:** ✅ PASS. Clean map state restored with zero console warnings.
