import "dotenv/config";
import prisma from "../../apps/api/src/lib/prisma";

export const INDIAN_VEHICLE_MODELS = [
  { make: "Tata", model: "Nexon EV", batteryKwh: 40.5, maxAcKw: 7.2, maxDcKw: 50.0, connectors: "CCS2,Type2" },
  { make: "Tata", model: "Tiago EV", batteryKwh: 24.0, maxAcKw: 7.2, maxDcKw: 30.0, connectors: "CCS2,Type2" },
  { make: "Tata", model: "Punch EV", batteryKwh: 35.0, maxAcKw: 7.2, maxDcKw: 50.0, connectors: "CCS2,Type2" },
  { make: "MG", model: "ZS EV", batteryKwh: 50.3, maxAcKw: 7.4, maxDcKw: 60.0, connectors: "CCS2,Type2" },
  { make: "Mahindra", model: "XUV400", batteryKwh: 39.4, maxAcKw: 7.2, maxDcKw: 50.0, connectors: "CCS2,Type2" },
  { make: "Hyundai", model: "Ioniq 5", batteryKwh: 72.6, maxAcKw: 11.0, maxDcKw: 350.0, connectors: "CCS2,Type2" },
  { make: "BYD", model: "Atto 3", batteryKwh: 60.48, maxAcKw: 7.4, maxDcKw: 80.0, connectors: "CCS2,Type2" },
  { make: "Kia", model: "EV6", batteryKwh: 77.4, maxAcKw: 11.0, maxDcKw: 350.0, connectors: "CCS2,Type2" },
  { make: "Ola Electric", model: "S1 Pro", batteryKwh: 4.0, maxAcKw: 3.3, maxDcKw: 3.3, connectors: "Type2,Standard" },
  { make: "Ather", model: "450X", batteryKwh: 3.7, maxAcKw: 3.3, maxDcKw: 3.3, connectors: "Ather Dot,Standard" },
];

export async function seedVehicles() {
  console.log(`[Vehicles] Importing ${INDIAN_VEHICLE_MODELS.length} Indian EV models...`);
  for (const v of INDIAN_VEHICLE_MODELS) {
    const existing = await prisma.vehicleModel.findFirst({
      where: { make: v.make, model: v.model },
    });

    if (existing) {
      await prisma.vehicleModel.update({
        where: { id: existing.id },
        data: v,
      });
    } else {
      await prisma.vehicleModel.create({
        data: v,
      });
    }
  }

  const count = await prisma.vehicleModel.count();
  console.log(`[Vehicles] Seed complete. Total vehicle models in DB: ${count}`);
}

if (process.argv[1]?.includes("vehicles")) {
  seedVehicles()
    .catch((err) => {
      console.error("[Vehicles] Failed to seed:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
