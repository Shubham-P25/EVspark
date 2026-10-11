-- CreateExtension
CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable
ALTER TABLE "Station" ADD COLUMN "location" geography(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("lng","lat"),4326)::geography) STORED;

-- CreateIndex
CREATE INDEX "Station_location_gist" ON "Station" USING GIST ("location");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Station_status_city_idx" ON "Station" ("status", "city");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Charger_stationId_status_idx" ON "Charger" ("stationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QueueEntry_stationId_status_joinedTs_idx" ON "QueueEntry" ("stationId", "status", "joinedTs");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_stationId_endTs_idx" ON "Session" ("stationId", "endTs");
