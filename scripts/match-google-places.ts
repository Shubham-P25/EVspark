import "dotenv/config";
import { PrismaClient } from "../apps/api/src/generated/prisma/client";
import { haversineKm } from "@evspark/shared";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  let city = "Thane";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--city" && args[i + 1]) {
      city = args[i + 1];
      i++;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  const apiKey = process.env.GOOGLE_PLACES_SERVER_KEY;
  if (!apiKey) {
    console.error("❌ GOOGLE_PLACES_SERVER_KEY is not defined in environment.");
    process.exit(1);
  }

  console.log(`🔍 Matching stations in city: ${city} (dryRun: ${dryRun})...`);

  const stations = await prisma.station.findMany({
    where: {
      city: { contains: city, mode: "insensitive" },
      googlePlaceId: null,
    },
    take: 40,
    select: {
      id: true,
      name: true,
      lat: true,
      lng: true,
      address: true,
    },
  });

  console.log(`Found ${stations.length} stations without googlePlaceId.`);

  let matched = 0;
  let ambiguous = 0;
  let none = 0;

  for (const st of stations) {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.location",
        },
        body: JSON.stringify({
          textQuery: `${st.name} EV charging`,
          locationBias: {
            circle: {
              center: { latitude: st.lat, longitude: st.lng },
              radius: 150.0,
            },
          },
        }),
      });

      if (!response.ok) {
        none++;
        continue;
      }

      const data: any = await response.json();
      const places: any[] = data?.places || [];

      // Filter places within 75m of the station
      const closeMatches = places.filter((p) => {
        if (!p.location?.latitude || !p.location?.longitude) return false;
        const distM = haversineKm(st.lat, st.lng, p.location.latitude, p.location.longitude) * 1000;
        return distM <= 75;
      });

      if (closeMatches.length === 1) {
        const placeId = closeMatches[0].id;
        matched++;
        console.log(`✅ MATCH: "${st.name}" -> ${placeId} (${closeMatches[0].displayName?.text})`);

        if (!dryRun) {
          await prisma.station.update({
            where: { id: st.id },
            data: { googlePlaceId: placeId },
          });
        }
      } else if (closeMatches.length > 1) {
        ambiguous++;
        console.log(`⚠️ AMBIGUOUS: "${st.name}" matched ${closeMatches.length} places within 75m`);
      } else {
        none++;
      }

      // Rate limit to 5 req/sec (200ms sleep)
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`Error matching station ${st.id}:`, err);
      none++;
    }
  }

  console.log("\n📊 Summary:");
  console.log(`- Matched:   ${matched}`);
  console.log(`- Ambiguous: ${ambiguous}`);
  console.log(`- None:      ${none}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
