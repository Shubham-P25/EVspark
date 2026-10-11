-- AlterTable Station
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "datasetSource" TEXT;
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "externalId" TEXT;

-- CreateIndex Station externalId
CREATE UNIQUE INDEX IF NOT EXISTS "Station_externalId_key" ON "Station"("externalId");

-- AlterTable Session
ALTER TABLE "Session" ALTER COLUMN "source" SET DEFAULT 'twin';
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "queueWaitMin" DOUBLE PRECISION;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "ocppTxId" INTEGER;

-- AlterTable QueueEntry
ALTER TABLE "QueueEntry" ADD COLUMN IF NOT EXISTS "vehicleModelId" TEXT;
ALTER TABLE "QueueEntry" ADD COLUMN IF NOT EXISTS "etaTs" TIMESTAMP(3);

-- AlterTable SimConfig
ALTER TABLE "SimConfig" ADD COLUMN IF NOT EXISTS "arrivalsPerMin" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "SimConfig" ADD COLUMN IF NOT EXISTS "running" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SimConfig" ADD COLUMN IF NOT EXISTS "surgeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.0;

-- CreateTable VehiclePing
CREATE TABLE IF NOT EXISTS "VehiclePing" (
    "id" TEXT NOT NULL,
    "vehicleRef" TEXT NOT NULL,
    "stationId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intent" TEXT NOT NULL,

    CONSTRAINT "VehiclePing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex VehiclePing
CREATE INDEX IF NOT EXISTS "VehiclePing_stationId_ts_idx" ON "VehiclePing"("stationId", "ts");

-- AddForeignKey VehiclePing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VehiclePing_stationId_fkey') THEN
        ALTER TABLE "VehiclePing" ADD CONSTRAINT "VehiclePing_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
