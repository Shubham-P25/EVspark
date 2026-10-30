-- DriverProfile: richer onboarding fields (chargingPref was collected before but never stored)
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "language" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "chargingPref" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "vehicleOwnership" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "hasHomeCharger" BOOLEAN;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "dailyKm" INTEGER;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "maxPriceKwh" DOUBLE PRECISION;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "preferredTimes" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "amenityPrefs" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "notifyChannels" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "notifications" BOOLEAN NOT NULL DEFAULT true;

-- OperatorProfile
ALTER TABLE "OperatorProfile" ADD COLUMN IF NOT EXISTS "businessType" TEXT;
ALTER TABLE "OperatorProfile" ADD COLUMN IF NOT EXISTS "supportEmail" TEXT;
ALTER TABLE "OperatorProfile" ADD COLUMN IF NOT EXISTS "integration" TEXT;

-- Station
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "pincode" TEXT;
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "landmark" TEXT;
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "parkingSlots" INTEGER;
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "paymentMethods" TEXT;
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "idleFeePerMin" DOUBLE PRECISION;
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "accessType" TEXT DEFAULT 'PUBLIC';

-- QueueEntry: operator "call" action
ALTER TABLE "QueueEntry" ADD COLUMN IF NOT EXISTS "calledAt" TIMESTAMP(3);
ALTER TABLE "QueueEntry" ADD COLUMN IF NOT EXISTS "calledChargerId" TEXT;

