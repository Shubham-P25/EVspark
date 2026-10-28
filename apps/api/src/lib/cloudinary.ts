import { v2 as cloudinary } from "cloudinary";
import logger from "./logger";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  logger.info({ cloudName }, "⚡ Cloudinary initialized for station photo CDN & compression");
} else {
  logger.debug("Cloudinary credentials not configured in environment; fallback to direct CDN URLs");
}

export { cloudinary };

/**
 * Generates an ultra-compressed, auto-format Cloudinary delivery URL.
 * Applies:
 * - f_auto (AVIF / WebP based on client browser capability)
 * - q_auto:good / q_auto (intelligent perceptual compression, saves 80-90% bandwidth)
 * - w_${width}, c_limit (responsive image resizing)
 */
export function getOptimizedImageUrl(urlOrPublicId: string, width = 800): string {
  if (!urlOrPublicId) return "";

  // 1. If it's already a Cloudinary upload URL, ensure compression flags are applied
  if (urlOrPublicId.includes("res.cloudinary.com") && urlOrPublicId.includes("/image/upload/")) {
    if (urlOrPublicId.includes("f_auto") || urlOrPublicId.includes("q_auto")) {
      return urlOrPublicId;
    }
    return urlOrPublicId.replace(
      "/image/upload/",
      `/image/upload/f_auto,q_auto,w_${width},c_limit/`
    );
  }

  // 2. If Cloudinary cloud name is configured, use Cloudinary Fetch delivery for instant edge compression
  if (cloudName && urlOrPublicId.startsWith("http")) {
    return `https://res.cloudinary.com/${cloudName}/image/fetch/f_auto,q_auto,w_${width},c_limit/${encodeURIComponent(
      urlOrPublicId
    )}`;
  }

  // 3. If Unsplash image, optimize with native Unsplash params
  if (urlOrPublicId.includes("images.unsplash.com")) {
    try {
      const u = new URL(urlOrPublicId);
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      u.searchParams.set("w", String(width));
      u.searchParams.set("q", "75");
      return u.toString();
    } catch {
      return urlOrPublicId;
    }
  }

  return urlOrPublicId;
}

/**
 * Uploads an external image URL to Cloudinary, applies compression, and returns the optimized URL.
 */
export async function uploadStationImageToCloudinary(
  sourceUrl: string,
  stationId: string,
  options?: { folder?: string; publicIdSuffix?: string }
): Promise<string> {
  if (!isCloudinaryConfigured) {
    throw new Error(
      "Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not set in .env"
    );
  }

  const folder = options?.folder || "evspark/stations";
  const publicId = `${folder}/${stationId}${options?.publicIdSuffix ? `_${options.publicIdSuffix}` : ""}`;

  const uploadResult = await cloudinary.uploader.upload(sourceUrl, {
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
    transformation: [
      { width: 1200, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  });

  // Return optimized delivery URL with auto format & auto quality
  return getOptimizedImageUrl(uploadResult.secure_url, 1000);
}
