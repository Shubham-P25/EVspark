import type { Request, Response } from "express";
import { randomBytes } from "node:crypto";
import type { Prisma } from "../generated/prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { cloudinary, isCloudinaryConfigured } from "../lib/cloudinary";
import type { DriverOnboardingInput, OperatorOnboardingInput, OnboardingInput } from "@evspark/shared";

export async function getMe(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      role: true,
      name: true,
      username: true,
      email: true,
      onboardedAt: true,
      onboardingDraft: true,
    },
  });

  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  return res.json({
    ...user,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      username: user.username,
      email: user.email,
      onboarded: Boolean(user.onboardedAt),
      onboardingDraft: user.onboardingDraft as any,
    },
    onboarded: Boolean(user.onboardedAt),
  });
}

export async function syncMe(req: Request, res: Response) {
  return getMe(req, res);
}

export async function updateRole(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { role } = req.body;
  if (role !== "DRIVER" && role !== "OPERATOR") {
    throw new AppError(400, "BAD_REQUEST", "Role must be DRIVER or OPERATOR");
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { role },
    select: {
      id: true,
      role: true,
      name: true,
      username: true,
      email: true,
      onboardedAt: true,
      onboardingDraft: true,
    },
  });

  return res.json({
    success: true,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      username: user.username,
      email: user.email,
      onboarded: Boolean(user.onboardedAt),
      onboardingDraft: user.onboardingDraft as any,
    },
  });
}

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

function csv(values?: readonly string[] | null): string | null {
  return values && values.length > 0 ? values.join(",") : null;
}

export async function updateOnboarding(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const body = req.body as OnboardingInput;
  const userId = req.user.id;

  if ((body as { role?: string }).role === "ADMIN") {
    throw new AppError(403, "FORBIDDEN", "Cannot onboard as admin");
  }

  const headerEmail = String(req.headers["x-user-email"] || "").trim().toLowerCase();
  const validEmail = headerEmail.includes("@") ? headerEmail : undefined;

  /** Upgrade the placeholder email once a real one is known, but never collide with another account. */
  async function resolveEmailUpdate(tx: Prisma.TransactionClient): Promise<{ email?: string }> {
    if (!validEmail) return {};
    const current = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!current || !current.email.endsWith("@evspark.local")) return {};
    const taken = await tx.user.findUnique({ where: { email: validEmail }, select: { id: true } });
    return taken ? {} : { email: validEmail };
  }

  if (body.role === "DRIVER") {
    const input: DriverOnboardingInput = body;
    const now = new Date();

    const profileData = {
      vehicleModelId: input.vehicleModelId,
      vehicleRegNo: input.vehicleRegNo,
      vehicleOwnership: input.vehicleOwnership,
      batteryPct: input.batteryPct,
      city: input.city,
      language: input.language,
      connectorPref: input.connectors.join(","),
      chargingPref: input.preferredCharging,
      hasHomeCharger: input.hasHomeCharger,
      dailyKm: input.dailyKm ?? null,
      homeLat: input.homeLat,
      homeLng: input.homeLng,
      homeLabel: input.homeLabel,
      workLat: input.workLat ?? null,
      workLng: input.workLng ?? null,
      workLabel: input.workLabel ?? null,
      maxWaitMin: input.maxWaitMin ?? null,
      minKw: input.minKw ?? null,
      maxPriceKwh: input.maxPriceKwh ?? null,
      preferredTimes: csv(input.preferredTimes),
      amenityPrefs: csv(input.amenityPrefs),
      notifyChannels: csv(input.notifyChannels),
      notifications: input.notifications,
    };

    const { user, profile } = await prisma.$transaction(async (tx) => {
      const emailData = await resolveEmailUpdate(tx);
      const user = await tx.user.update({
        where: { id: userId },
        data: { name: input.fullName, phone: input.phone, onboardedAt: now, role: "DRIVER", ...emailData },
      });
      const profile = await tx.driverProfile.upsert({
        where: { userId },
        create: { userId, ...profileData },
        update: profileData,
      });
      return { user, profile };
    });

    return res.json({ success: true, onboarded: true, role: "DRIVER", user, profile });
  }

  if (body.role === "OPERATOR") {
    const input: OperatorOnboardingInput = body;
    const now = new Date();

    const profileData = {
      businessName: input.businessName,
      businessType: input.businessType,
      contactName: input.contactName,
      phone: input.phone,
      supportEmail: input.supportEmail ?? null,
      gstin: input.gstin ?? null,
      integration: input.integration,
    };

    const stationData = {
      name: input.stationName,
      operatorName: input.businessName,
      description: input.description ?? null,
      address: input.address,
      landmark: input.landmark ?? null,
      pincode: input.pincode,
      city: input.city,
      lat: input.lat,
      lng: input.lng,
      pricePerKwh: input.pricePerKwh,
      idleFeePerMin: input.idleFeePerMin ?? null,
      hours: input.hours || "24/7",
      amenities: input.amenities.length > 0 ? input.amenities.join(",") : "Parking",
      paymentMethods: csv(input.paymentMethods),
      parkingSlots: input.parkingSlots ?? null,
      accessType: input.accessType,
      photoUrl: input.photoUrl ?? null,
      phone: input.phone,
    };

    const stationStatus = process.env.AUTO_APPROVE_DEMO === "true" ? "APPROVED" : "PENDING";

    const result = await prisma.$transaction(async (tx) => {
      const emailData = await resolveEmailUpdate(tx);
      const user = await tx.user.update({
        where: { id: userId },
        data: { name: input.contactName, phone: input.phone, onboardedAt: now, role: "OPERATOR", ...emailData },
      });
      const profile = await tx.operatorProfile.upsert({
        where: { userId },
        create: { userId, ...profileData },
        update: profileData,
      });

      // Idempotent: a retry/double-submit must never create a second station.
      const existing = await tx.station.findFirst({
        where: { operatorUserId: userId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (existing) {
        const station = await tx.station.update({
          where: { id: existing.id },
          data: stationData,
          include: { chargers: true },
        });
        return { user, profile, station, resumed: true };
      }

      const station = await tx.station.create({
        data: {
          ...stationData,
          operatorUserId: userId,
          status: stationStatus,
          chargers: {
            create: input.chargers.map((c, i) => ({
              label: c.label?.trim() || `Bay ${i + 1} · ${c.connectorType}`,
              connectorType: c.connectorType,
              powerKw: Number(c.powerKw),
              status: "FREE" as const,
              ocppId: `CP-${randomBytes(4).toString("hex").toUpperCase()}`,
            })),
          },
        },
        include: { chargers: true },
      });
      return { user, profile, station, resumed: false };
    });

    return res.json({ success: true, onboarded: true, role: "OPERATOR", ...result });
  }

  throw new AppError(400, "BAD_REQUEST", "Invalid onboarding role");
}

/** Signed direct-to-Cloudinary upload params so the browser never sees the API secret. */
export async function signPhotoUpload(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  if (!isCloudinaryConfigured) {
    throw new AppError(503, "UPLOAD_NOT_CONFIGURED", "Photo upload is not configured. Paste an image URL instead.");
  }
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `evspark/stations/${req.user.id}`;
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, String(process.env.CLOUDINARY_API_SECRET));
  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
  });
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
