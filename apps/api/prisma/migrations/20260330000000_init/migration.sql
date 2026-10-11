-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DRIVER', 'OPERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "StationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ChargerStatus" AS ENUM ('FREE', 'BUSY', 'MAINTENANCE', 'FAULTED', 'OFFLINE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DRIVER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "batteryKwh" DOUBLE PRECISION NOT NULL,
    "maxAcKw" DOUBLE PRECISION NOT NULL,
    "maxDcKw" DOUBLE PRECISION NOT NULL,
    "connectors" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleModelId" TEXT,
    "connectorPref" TEXT,
    "rangeKm" DOUBLE PRECISION,
    "homeLat" DOUBLE PRECISION,
    "homeLng" DOUBLE PRECISION,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "phone" TEXT,

    CONSTRAINT "OperatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "operatorUserId" TEXT,
    "name" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "state" TEXT DEFAULT 'Maharashtra',
    "district" TEXT,
    "city" TEXT DEFAULT 'Mumbai',
    "address" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "pricePerKwh" DOUBLE PRECISION NOT NULL,
    "hours" TEXT DEFAULT '24/7',
    "amenities" TEXT DEFAULT 'WiFi,Cafe,Restroom,Parking',
    "status" "StationStatus" NOT NULL DEFAULT 'APPROVED',
    "ratingAvg" DOUBLE PRECISION DEFAULT 4.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Charger" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "label" TEXT,
    "connectorType" TEXT NOT NULL,
    "powerKw" DOUBLE PRECISION NOT NULL,
    "status" "ChargerStatus" NOT NULL DEFAULT 'FREE',
    "ocppId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Charger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargerEvent" (
    "id" TEXT NOT NULL,
    "chargerId" TEXT NOT NULL,
    "status" "ChargerStatus" NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" TEXT,

    CONSTRAINT "ChargerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "chargerId" TEXT NOT NULL,
    "driverUserId" TEXT,
    "vehicleModelId" TEXT,
    "startTs" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTs" TIMESTAMP(3),
    "socStart" DOUBLE PRECISION,
    "socEnd" DOUBLE PRECISION,
    "energyKwh" DOUBLE PRECISION,
    "amountInr" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'sim',

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueEntry" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "vehicleRef" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "joinedTs" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'waiting',

    CONSTRAINT "QueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "driverUserId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "chargerId" TEXT,
    "startTs" TIMESTAMP(3) NOT NULL,
    "endTs" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "reply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "chargerId" TEXT,
    "reporterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationMetricHourly" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "hourTs" TIMESTAMP(3) NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "occupancyPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgWaitMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "energyKwh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenueInr" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "StationMetricHourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Forecast" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "madeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horizonMin" INTEGER NOT NULL DEFAULT 30,
    "predictedWait" DOUBLE PRECISION NOT NULL,
    "actualWait" DOUBLE PRECISION,

    CONSTRAINT "Forecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "surgeStations" TEXT NOT NULL DEFAULT '',
    "seed" INTEGER NOT NULL DEFAULT 42,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorProfile_userId_key" ON "OperatorProfile"("userId");

-- CreateIndex
CREATE INDEX "ChargerEvent_chargerId_ts_idx" ON "ChargerEvent"("chargerId", "ts" DESC);

-- CreateIndex
CREATE INDEX "Session_stationId_startTs_idx" ON "Session"("stationId", "startTs" DESC);

-- CreateIndex
CREATE INDEX "QueueEntry_stationId_status_idx" ON "QueueEntry"("stationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_stationId_key" ON "Favorite"("userId", "stationId");

-- CreateIndex
CREATE UNIQUE INDEX "StationMetricHourly_stationId_hourTs_key" ON "StationMetricHourly"("stationId", "hourTs");

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorProfile" ADD CONSTRAINT "OperatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charger" ADD CONSTRAINT "Charger_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargerEvent" ADD CONSTRAINT "ChargerEvent_chargerId_fkey" FOREIGN KEY ("chargerId") REFERENCES "Charger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_chargerId_fkey" FOREIGN KEY ("chargerId") REFERENCES "Charger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_chargerId_fkey" FOREIGN KEY ("chargerId") REFERENCES "Charger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationMetricHourly" ADD CONSTRAINT "StationMetricHourly_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
