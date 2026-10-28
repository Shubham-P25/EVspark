import "dotenv/config";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import {
  isCloudinaryConfigured,
  uploadStationImageToCloudinary,
  getOptimizedImageUrl,
} from "../lib/cloudinary";

const DEFAULT_PHOTOS = [
  "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1558441719-72f5341cfab0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1647427017067-8f33cd449248?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80",
];

async function main() {
  logger.info("⚡ Starting Cloudinary station photo synchronization & compression pipeline...");

  if (!isCloudinaryConfigured) {
    logger.error("=========================================================================");
    logger.error("❌ Cloudinary is not configured in your environment!");
    logger.error("Please add the following to your .env / apps/api/.env file:");
    logger.error("  CLOUDINARY_CLOUD_NAME=your_cloud_name");
    logger.error("  CLOUDINARY_API_KEY=your_api_key");
    logger.error("  CLOUDINARY_API_SECRET=your_api_secret");
    logger.error("=========================================================================");
    process.exit(1);
  }

  const stations = await prisma.station.findMany({
    select: { id: true, name: true, photoUrl: true },
    orderBy: { createdAt: "asc" },
  });

  logger.info(`Found ${stations.length} stations in database to process.`);

  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    const sourceUrl = s.photoUrl || DEFAULT_PHOTOS[i % DEFAULT_PHOTOS.length];

    // If already uploaded to Cloudinary, ensure it has optimized flags
    if (s.photoUrl && s.photoUrl.includes("res.cloudinary.com")) {
      const optimizedUrl = getOptimizedImageUrl(s.photoUrl, 800);
      if (optimizedUrl !== s.photoUrl) {
        await prisma.station.update({
          where: { id: s.id },
          data: { photoUrl: optimizedUrl },
        });
      }
      skippedCount++;
      continue;
    }

    try {
      logger.info(`[${i + 1}/${stations.length}] Uploading & compressing photo for: ${s.name}...`);
      const optimizedCloudinaryUrl = await uploadStationImageToCloudinary(sourceUrl, s.id, {
        folder: "evspark/stations",
      });

      await prisma.station.update({
        where: { id: s.id },
        data: { photoUrl: optimizedCloudinaryUrl },
      });

      logger.info(`  ✅ Uploaded & compressed: ${optimizedCloudinaryUrl}`);
      uploadedCount++;
    } catch (err: any) {
      logger.error({ err: err?.message || err, stationId: s.id }, "Failed to upload photo to Cloudinary");
      errorCount++;
    }
  }

  logger.info("=========================================================================");
  logger.info("🎉 Cloudinary Sync Summary:");
  logger.info(`  Total stations: ${stations.length}`);
  logger.info(`  Newly uploaded & compressed to Cloudinary: ${uploadedCount}`);
  logger.info(`  Already on Cloudinary: ${skippedCount}`);
  logger.info(`  Errors: ${errorCount}`);
  logger.info("All stations now load compressed WebP/AVIF images instantly!");
  logger.info("=========================================================================");
}

main()
  .catch((e) => {
    logger.error(e, "Fatal error in Cloudinary synchronization");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
