import type { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { driverSchema, operatorSchema } from "../validators/onboarding.js";

export async function saveDraft(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { step, data } = req.body;
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      onboardingDraft: {
        step: typeof step === "number" ? step : 0,
        data: data || {},
      },
    },
  });

  res.json({ success: true });
}

export async function completeOnboarding(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  const { data } = req.body;
  const role = user.role;

  if (role === "DRIVER") {
    const parse = driverSchema.safeParse(data);
    if (!parse.success) {
      const fields: Record<string, string> = {};
      for (const issue of parse.error.issues) {
        fields[issue.path.join(".")] = issue.message;
      }
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid driver data", fields },
      });
    }

    const d = parse.data;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: d.displayName,
          phone: d.phone || user.phone,
          onboardedAt: now,
          onboardingDraft: Prisma.DbNull,
        },
      });

      await tx.driverProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          city: d.city,
          vehicleRegNo: d.vehicle.plate,
          batteryPct: 100,
          rangeKm: d.vehicle.batteryKwh * 5,
          minKw: d.vehicle.maxDcKw,
          connectorPref: d.vehicle.connector,
          maxPriceKwh: d.prefs.maxPricePerKwh,
          amenityPrefs: d.prefs.habits.join(","),
          notifications: Boolean(d.prefs.notifyWait || d.prefs.notifyOffers),
        },
        update: {
          city: d.city,
          vehicleRegNo: d.vehicle.plate,
          minKw: d.vehicle.maxDcKw,
          connectorPref: d.vehicle.connector,
          maxPriceKwh: d.prefs.maxPricePerKwh,
          amenityPrefs: d.prefs.habits.join(","),
          notifications: Boolean(d.prefs.notifyWait || d.prefs.notifyOffers),
        },
      });
    });

    return res.json({ success: true, onboarded: true });
  }

  if (role === "OPERATOR") {
    const parse = operatorSchema.safeParse(data);
    if (!parse.success) {
      const fields: Record<string, string> = {};
      for (const issue of parse.error.issues) {
        fields[issue.path.join(".")] = issue.message;
      }
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid operator data", fields },
      });
    }

    const d = parse.data;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: d.displayName,
          phone: d.phone || user.phone,
          onboardedAt: now,
          onboardingDraft: Prisma.DbNull,
        },
      });

      await tx.operatorProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          businessName: d.businessName,
          contactName: d.displayName,
          phone: d.phone,
          gstin: d.gstin || null,
        },
        update: {
          businessName: d.businessName,
          contactName: d.displayName,
          phone: d.phone,
          gstin: d.gstin || null,
        },
      });

      const existingStation = await tx.station.findFirst({
        where: { operatorUserId: user.id },
      });

      const stationData = {
        name: d.station.name,
        operatorName: d.businessName || d.displayName,
        address: d.station.address,
        lat: d.station.lat,
        lng: d.station.lng,
        hours: d.station.open24h ? "24/7" : `${d.station.opensAt} - ${d.station.closesAt}`,
        amenities: d.station.amenities.join(","),
        pricePerKwh: d.chargers[0]?.pricePerKwh || 18,
        status: "APPROVED" as const,
      };

      let stationId: string;
      if (existingStation) {
        stationId = existingStation.id;
        await tx.station.update({
          where: { id: stationId },
          data: stationData,
        });
      } else {
        const createdStation = await tx.station.create({
          data: {
            ...stationData,
            operatorUserId: user.id,
          },
        });
        stationId = createdStation.id;
      }

      let bayIndex = 1;
      const existingChargersCount = await tx.charger.count({ where: { stationId } });
      if (existingChargersCount === 0) {
        for (const c of d.chargers) {
          for (let i = 0; i < c.count; i++) {
            await tx.charger.create({
              data: {
                stationId,
                label: `Bay ${bayIndex++} · ${c.connector}`,
                connectorType: c.connector,
                powerKw: c.powerKw,
                pricePerKwh: c.pricePerKwh,
                status: "FREE",
              },
            });
          }
        }
      }
    });

    return res.json({ success: true, onboarded: true });
  }

  throw new AppError(400, "BAD_REQUEST", "Unsupported role for onboarding");
}
