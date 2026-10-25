-- CreateExtension
CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS geom geography(Point, 4326);

-- Backfill
UPDATE "Station"
SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE geom IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS station_geom_gix ON "Station" USING GIST (geom);

-- Trigger Function
CREATE OR REPLACE FUNCTION station_set_geom() RETURNS trigger AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS station_geom_trg ON "Station";
CREATE TRIGGER station_geom_trg BEFORE INSERT OR UPDATE OF lat, lng ON "Station"
FOR EACH ROW EXECUTE FUNCTION station_set_geom();
