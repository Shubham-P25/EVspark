import prisma from "../../apps/api/src/lib/prisma";

export interface SimulatedVehicle {
  vehicleRef: string;
  vehicleModelId: string;
  make: string;
  model: string;
  batteryKwh: number;
  maxAcKw: number;
  maxDcKw: number;
  connectors: string[];
  socStart: number;
  socTarget: number;
}

let cachedVehicleModels: any[] = [];

export async function sampleSimulatedVehicle(): Promise<SimulatedVehicle> {
  if (cachedVehicleModels.length === 0) {
    try {
      cachedVehicleModels = await prisma.vehicleModel.findMany();
    } catch {
      // fallback
    }
  }

  const model = cachedVehicleModels.length > 0
    ? cachedVehicleModels[Math.floor(Math.random() * cachedVehicleModels.length)]
    : {
        id: "default-model-nexon",
        make: "Tata",
        model: "Nexon EV",
        batteryKwh: 40.5,
        maxAcKw: 7.2,
        maxDcKw: 50.0,
        connectors: "CCS2,Type2",
      };

  const rtoCodes = ["01", "02", "03", "04", "12", "14", "15", "31", "43", "46"];
  const rto = rtoCodes[Math.floor(Math.random() * rtoCodes.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const vehicleRef = `MH-${rto}-EV-${num}`;

  // Random start SoC (10%–35%)
  const socStart = Math.floor(10 + Math.random() * 26);
  // Desired SoC (80%–100%)
  const socTarget = Math.floor(80 + Math.random() * 21);

  const connectorList = (model.connectors || "CCS2,Type2").split(",").map((c: string) => c.trim());

  return {
    vehicleRef,
    vehicleModelId: model.id,
    make: model.make,
    model: model.model,
    batteryKwh: model.batteryKwh,
    maxAcKw: model.maxAcKw,
    maxDcKw: model.maxDcKw,
    connectors: connectorList,
    socStart,
    socTarget,
  };
}
