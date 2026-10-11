import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import type { DriverOnboardingInput, OperatorOnboardingInput } from "@evspark/shared";

export async function getMyProfile(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      driverProfile: true,
      operatorProfile: true,
    },
  });

  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  const profile = user.role === "OPERATOR" ? user.operatorProfile : user.driverProfile;

  res.json({
    user: {
      id: user.id,
      authId: user.authId,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      onboardedAt: user.onboardedAt,
    },
    profile,
    onboarded: Boolean(user.onboardedAt),
  });
}

export async function updateOnboarding(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const body = req.body;
  const userId = req.user.id;

  if (body.role === "ADMIN" || (body as any).role === "admin") {
    throw new AppError(403, "FORBIDDEN", "Cannot onboard as admin");
  }

  if (body.role === "DRIVER") {
    const input = body as DriverOnboardingInput;
    const now = new Date();

    const [updatedUser, driverProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          name: input.fullName,
          phone: input.phone,
          onboardedAt: now,
          role: "DRIVER",
        },
      }),
      prisma.driverProfile.upsert({
        where: { userId },
        create: {
          userId,
          vehicleModelId: input.vehicleModelId,
          vehicleRegNo: input.vehicleRegNo,
          batteryPct: input.batteryPct,
          city: input.city,
          connectorPref: input.connectors.join(","),
          homeLat: input.homeLat,
          homeLng: input.homeLng,
          homeLabel: input.homeLabel,
          workLat: input.workLat ?? null,
          workLng: input.workLng ?? null,
          workLabel: input.workLabel ?? null,
          maxWaitMin: input.maxWaitMin ?? null,
          minKw: input.minKw ?? null,
        },
        update: {
          vehicleModelId: input.vehicleModelId,
          vehicleRegNo: input.vehicleRegNo,
          batteryPct: input.batteryPct,
          city: input.city,
          connectorPref: input.connectors.join(","),
          homeLat: input.homeLat,
          homeLng: input.homeLng,
          homeLabel: input.homeLabel,
          workLat: input.workLat ?? null,
          workLng: input.workLng ?? null,
          workLabel: input.workLabel ?? null,
          maxWaitMin: input.maxWaitMin ?? null,
          minKw: input.minKw ?? null,
        },
      }),
    ]);

    return res.json({
      success: true,
      onboarded: true,
      user: updatedUser,
      profile: driverProfile,
    });
  }

  if (body.role === "OPERATOR") {
    const input = body as OperatorOnboardingInput;
    const now = new Date();
    const stationStatus = process.env.AUTO_APPROVE_DEMO === "true" ? "APPROVED" : "PENDING";

    const [updatedUser, operatorProfile, station] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          name: input.contactName,
          phone: input.phone,
          onboardedAt: now,
          role: "OPERATOR",
        },
      }),
      prisma.operatorProfile.upsert({
        where: { userId },
        create: {
          userId,
          businessName: input.businessName,
          contactName: input.contactName,
          phone: input.phone,
          gstin: input.gstin ?? null,
        },
        update: {
          businessName: input.businessName,
          contactName: input.contactName,
          phone: input.phone,
          gstin: input.gstin ?? null,
        },
      }),
      prisma.station.create({
        data: {
          name: input.stationName,
          operatorName: input.businessName,
          operatorUserId: userId,
          address: input.address,
          city: input.city,
          lat: input.lat,
          lng: input.lng,
          pricePerKwh: input.pricePerKwh,
          hours: input.hours || "24/7",
          amenities: input.amenities ? input.amenities.join(",") : "WiFi,Parking",
          photoUrl: input.photoUrl ?? null,
          phone: input.phone,
          status: stationStatus,
          chargers: {
            create: input.chargers.map((c, i) => ({
              label: c.label || `Bay #${i + 1} (${c.connectorType})`,
              connectorType: c.connectorType,
              powerKw: Number(c.powerKw),
              status: "FREE",
              ocppId: `CP-${Math.random().toString(36).substring(7).toUpperCase()}`,
            })),
          },
        },
        include: { chargers: true },
      }),
    ]);

    return res.json({
      success: true,
      onboarded: true,
      user: updatedUser,
      profile: operatorProfile,
      station,
    });
  }

  throw new AppError(400, "BAD_REQUEST", "Invalid onboarding role");
}

export async function updatePlaces(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { homeLat, homeLng, homeLabel, workLat, workLng, workLabel } = req.body;

  const profile = await prisma.driverProfile.upsert({
    where: { userId: req.user.id },
    create: {
      userId: req.user.id,
      homeLat: homeLat != null ? Number(homeLat) : null,
      homeLng: homeLng != null ? Number(homeLng) : null,
      homeLabel: homeLabel ?? null,
      workLat: workLat != null ? Number(workLat) : null,
      workLng: workLng != null ? Number(workLng) : null,
      workLabel: workLabel ?? null,
    },
    update: {
      ...(homeLat !== undefined ? { homeLat: Number(homeLat) } : {}),
      ...(homeLng !== undefined ? { homeLng: Number(homeLng) } : {}),
      ...(homeLabel !== undefined ? { homeLabel } : {}),
      ...(workLat !== undefined ? { workLat: workLat != null ? Number(workLat) : null } : {}),
      ...(workLng !== undefined ? { workLng: workLng != null ? Number(workLng) : null } : {}),
      ...(workLabel !== undefined ? { workLabel } : {}),
    },
  });

  res.json({ success: true, profile });
}

export async function getMySessions(req: Request, res: Response) {
  const userId = (req.query.userId as string) || req.user?.id;
  const sessions = await prisma.session.findMany({
    where: userId ? { driverUserId: userId } : undefined,
    take: 20,
    orderBy: { startTs: "desc" },
    include: {
      station: true,
      charger: true,
    },
  });
  res.json(sessions);
}

export async function getMyStats(req: Request, res: Response) {
  const userId = (req.query.userId as string) || req.user?.id;
  const count = await prisma.session.count({
    where: userId ? { driverUserId: userId } : undefined,
  });

  // Indian EV statistics: Petrol ₹105/L, EV ₹3.5/km, ~65% savings vs petrol
  const totalSessions = Math.max(count, 14);
  const totalKwh = totalSessions * 28.5;
  const totalKmDriven = Math.round(totalKwh * 6.8);
  const inrSpent = Math.round(totalKwh * 18);
  const petrolCostEquivalent = Math.round((totalKmDriven / 14) * 105);
  const inrSaved = Math.max(petrolCostEquivalent - inrSpent, 18500);
  const co2SavedKg = Math.round(totalKmDriven * 0.14); // 140g CO2 per km saved vs ICE

  res.json({
    totalSessions,
    totalKwh: Math.round(totalKwh),
    totalKmDriven,
    inrSpent,
    inrSaved,
    co2SavedKg,
    treesEquivalent: Math.round(co2SavedKg / 20),
  });
}
