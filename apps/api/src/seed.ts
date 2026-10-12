import "dotenv/config";
import prisma from "./lib/prisma";
import logger from "./lib/logger";

const VEHICLE_MODELS = [
  { make: "Tata", model: "Nexon EV Max", batteryKwh: 40.5, maxAcKw: 7.2, maxDcKw: 50.0, connectors: "CCS2,Type2" },
  { make: "Tata", model: "Punch.ev", batteryKwh: 35.0, maxAcKw: 7.2, maxDcKw: 50.0, connectors: "CCS2,Type2" },
  { make: "Tata", model: "Tigor EV", batteryKwh: 26.0, maxAcKw: 3.3, maxDcKw: 25.0, connectors: "CCS2" },
  { make: "MG", model: "ZS EV", batteryKwh: 50.3, maxAcKw: 7.4, maxDcKw: 60.0, connectors: "CCS2,Type2" },
  { make: "MG", model: "Windsor EV", batteryKwh: 38.0, maxAcKw: 7.4, maxDcKw: 45.0, connectors: "CCS2,Type2" },
  { make: "Mahindra", model: "XUV400", batteryKwh: 39.4, maxAcKw: 7.2, maxDcKw: 50.0, connectors: "CCS2" },
  { make: "Hyundai", model: "Ioniq 5", batteryKwh: 72.6, maxAcKw: 11.0, maxDcKw: 220.0, connectors: "CCS2,Type2" },
  { make: "BYD", model: "Atto 3", batteryKwh: 60.5, maxAcKw: 7.0, maxDcKw: 80.0, connectors: "CCS2" },
  { make: "Ather", model: "450X Gen 3", batteryKwh: 3.7, maxAcKw: 3.0, maxDcKw: 3.0, connectors: "Ather Grid,Type2" },
  { make: "Ola", model: "S1 Pro", batteryKwh: 4.0, maxAcKw: 3.0, maxDcKw: 3.0, connectors: "Ola Hypercharger,Type2" }
];

const SEED_STATIONS = [
  // Mumbai Central & South
  {
    name: "Tata Power EZ Charge - Bandra Kurla Complex",
    operatorName: "Tata Power",
    city: "Mumbai",
    district: "Mumbai Suburban",
    state: "Maharashtra",
    address: "G Block, BKC, Bandra East, Mumbai, Maharashtra 400051",
    lat: 19.0657,
    lng: 72.8687,
    pricePerKwh: 18.5,
    hours: "24/7",
    amenities: "Cafe,Restroom,WiFi,Valet,Lounge",
    ratingAvg: 4.8,
    chargers: [
      { label: "BKC-DC-01", connectorType: "CCS2", powerKw: 120, status: "BUSY" },
      { label: "BKC-DC-02", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "BKC-DC-03", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "BKC-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  {
    name: "Jio-bp pulse - Lower Parel High Street Phoenix",
    operatorName: "Jio-bp pulse",
    city: "Mumbai",
    district: "Mumbai City",
    state: "Maharashtra",
    address: "Grand Galleria, High Street Phoenix, Lower Parel, Mumbai 400013",
    lat: 18.9953,
    lng: 72.8248,
    pricePerKwh: 19.0,
    hours: "24/7",
    amenities: "Shopping,Cafe,Restroom,Underground Parking",
    ratingAvg: 4.6,
    chargers: [
      { label: "Parel-DC-01", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "Parel-DC-02", connectorType: "CCS2", powerKw: 60, status: "BUSY" },
      { label: "Parel-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  {
    name: "Statiq EV Charging - Worli Sea Face",
    operatorName: "Statiq",
    city: "Mumbai",
    district: "Mumbai City",
    state: "Maharashtra",
    address: "Dr Annie Besant Rd, Worli, Mumbai, Maharashtra 400018",
    lat: 19.0144,
    lng: 72.8179,
    pricePerKwh: 17.5,
    hours: "24/7",
    amenities: "Sea View Walk,Cafe,Restroom",
    ratingAvg: 4.5,
    chargers: [
      { label: "Worli-DC-01", connectorType: "CCS2", powerKw: 90, status: "FREE" },
      { label: "Worli-DC-02", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "Worli-CHA-01", connectorType: "CHAdeMO", powerKw: 50, status: "FREE" }
    ]
  },
  {
    name: "Magenta ChargeGrid - Nariman Point",
    operatorName: "Magenta ChargeGrid",
    city: "Mumbai",
    district: "Mumbai City",
    state: "Maharashtra",
    address: "Free Press Journal Marg, Nariman Point, Mumbai 400021",
    lat: 18.9265,
    lng: 72.8236,
    pricePerKwh: 20.0,
    hours: "06:00 - 23:00",
    amenities: "Parking,Restroom,Security",
    ratingAvg: 4.3,
    chargers: [
      { label: "Nariman-DC-01", connectorType: "CCS2", powerKw: 50, status: "MAINTENANCE" },
      { label: "Nariman-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  // Western Suburbs
  {
    name: "Zeon Charging - Andheri East MIDC",
    operatorName: "Zeon",
    city: "Mumbai",
    district: "Mumbai Suburban",
    state: "Maharashtra",
    address: "MIDC Central Rd, Andheri East, Mumbai 400093",
    lat: 19.1172,
    lng: 72.8631,
    pricePerKwh: 18.0,
    hours: "24/7",
    amenities: "Cafe,WiFi,Restroom,Quick Bites",
    ratingAvg: 4.7,
    chargers: [
      { label: "Andheri-DC-01", connectorType: "CCS2", powerKw: 120, status: "BUSY" },
      { label: "Andheri-DC-02", connectorType: "CCS2", powerKw: 60, status: "BUSY" },
      { label: "Andheri-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  {
    name: "Tata Power - Chhatrapati Shivaji Maharaj Intl Airport (T2)",
    operatorName: "Tata Power",
    city: "Mumbai",
    district: "Mumbai Suburban",
    state: "Maharashtra",
    address: "Terminal 2 MLCP Level P4, Sahar, Andheri East, Mumbai 400099",
    lat: 19.0974,
    lng: 72.8744,
    pricePerKwh: 21.0,
    hours: "24/7",
    amenities: "Airport Amenities,Restroom,Food Court,Covered Parking",
    ratingAvg: 4.9,
    chargers: [
      { label: "T2-DC-01", connectorType: "CCS2", powerKw: 120, status: "BUSY" },
      { label: "T2-DC-02", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "T2-DC-03", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "T2-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  {
    name: "Adani Total Gas EV - Malad Infinity Mall",
    operatorName: "Adani TotalEnergies",
    city: "Mumbai",
    district: "Mumbai Suburban",
    state: "Maharashtra",
    address: "Link Rd, Mindspace, Malad West, Mumbai 400064",
    lat: 19.1843,
    lng: 72.8347,
    pricePerKwh: 17.5,
    hours: "10:00 - 23:00",
    amenities: "Mall,Cinema,Food Court,Restroom",
    ratingAvg: 4.4,
    chargers: [
      { label: "Malad-DC-01", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "Malad-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  {
    name: "Shell Recharge - Borivali Link Road",
    operatorName: "Shell",
    city: "Mumbai",
    district: "Mumbai Suburban",
    state: "Maharashtra",
    address: "New Link Rd, Borivali West, Mumbai 400091",
    lat: 19.2312,
    lng: 72.8422,
    pricePerKwh: 19.5,
    hours: "24/7",
    amenities: "Shell Select Store,Cafe,Restroom,Tyre Care",
    ratingAvg: 4.8,
    chargers: [
      { label: "Borivali-DC-01", connectorType: "CCS2", powerKw: 120, status: "FREE" },
      { label: "Borivali-DC-02", connectorType: "CCS2", powerKw: 60, status: "FREE" }
    ]
  },
  // Thane & Navi Mumbai
  {
    name: "Tata Power EZ Charge - Viviana Mall Thane",
    operatorName: "Tata Power",
    city: "Thane",
    district: "Thane",
    state: "Maharashtra",
    address: "Eastern Express Hwy, On Service Road, Laxmi Nagar, Thane West 400606",
    lat: 19.2094,
    lng: 72.9714,
    pricePerKwh: 18.0,
    hours: "24/7",
    amenities: "Mall,Multiplex,Restroom,Dining",
    ratingAvg: 4.7,
    chargers: [
      { label: "Viviana-DC-01", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "Viviana-DC-02", connectorType: "CCS2", powerKw: 60, status: "BUSY" },
      { label: "Viviana-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  {
    name: "Jio-bp pulse - Majiwada Junction Thane",
    operatorName: "Jio-bp pulse",
    city: "Thane",
    district: "Thane",
    state: "Maharashtra",
    address: "Ghodbunder Rd, Majiwada, Thane West 400601",
    lat: 19.2183,
    lng: 72.9781,
    pricePerKwh: 17.0,
    hours: "24/7",
    amenities: "Convenience Store,Wild Bean Cafe,Restroom",
    ratingAvg: 4.6,
    chargers: [
      { label: "Majiwada-DC-01", connectorType: "CCS2", powerKw: 90, status: "FREE" },
      { label: "Majiwada-DC-02", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "Majiwada-CHA-01", connectorType: "CHAdeMO", powerKw: 50, status: "FREE" }
    ]
  },
  {
    name: "Statiq Charging Hub - Vashi Sector 17",
    operatorName: "Statiq",
    city: "Navi Mumbai",
    district: "Thane",
    state: "Maharashtra",
    address: "Sector 17, Vashi, Navi Mumbai, Maharashtra 400703",
    lat: 19.0768,
    lng: 72.9986,
    pricePerKwh: 17.8,
    hours: "24/7",
    amenities: "Shopping,Market,Cafe,Restroom",
    ratingAvg: 4.5,
    chargers: [
      { label: "Vashi-DC-01", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "Vashi-DC-02", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "Vashi-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  {
    name: "Magenta ChargeGrid - Seawoods Grand Central",
    operatorName: "Magenta ChargeGrid",
    city: "Navi Mumbai",
    district: "Thane",
    state: "Maharashtra",
    address: "Railway Station Complex, Sector 40, Seawoods, Navi Mumbai 400706",
    lat: 19.0211,
    lng: 73.0182,
    pricePerKwh: 18.2,
    hours: "24/7",
    amenities: "Railway Transit,Mall,Dining,Restroom",
    ratingAvg: 4.6,
    chargers: [
      { label: "Seawoods-DC-01", connectorType: "CCS2", powerKw: 60, status: "BUSY" },
      { label: "Seawoods-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  {
    name: "Zeon Charging - Kharghar Central Park",
    operatorName: "Zeon",
    city: "Navi Mumbai",
    district: "Raigad",
    state: "Maharashtra",
    address: "Sector 23, Kharghar, Navi Mumbai 410210",
    lat: 19.0438,
    lng: 73.0682,
    pricePerKwh: 17.0,
    hours: "24/7",
    amenities: "Park,Jogging Track,Restroom,Cafe",
    ratingAvg: 4.4,
    chargers: [
      { label: "Kharghar-DC-01", connectorType: "CCS2", powerKw: 50, status: "FREE" },
      { label: "Kharghar-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  // Expressway & Pune Corridor
  {
    name: "Tata Power - Mumbai-Pune Expressway Khalapur Food Mall",
    operatorName: "Tata Power",
    city: "Khalapur",
    district: "Raigad",
    state: "Maharashtra",
    address: "Mumbai - Pune Expy, Khalapur Toll Plaza, Khalapur 410202",
    lat: 18.8166,
    lng: 73.2985,
    pricePerKwh: 20.5,
    hours: "24/7",
    amenities: "Food Court,McDonalds,Starbucks,Restroom,Kids Play Area",
    ratingAvg: 4.9,
    chargers: [
      { label: "Exp-Khalapur-01", connectorType: "CCS2", powerKw: 150, status: "BUSY" },
      { label: "Exp-Khalapur-02", connectorType: "CCS2", powerKw: 120, status: "FREE" },
      { label: "Exp-Khalapur-03", connectorType: "CCS2", powerKw: 60, status: "FREE" }
    ]
  },
  {
    name: "Jio-bp pulse - Express Food Mall Urse",
    operatorName: "Jio-bp pulse",
    city: "Urse",
    district: "Pune",
    state: "Maharashtra",
    address: "Mumbai - Pune Expy, Urse Toll Plaza, Pune 410506",
    lat: 18.7302,
    lng: 73.6521,
    pricePerKwh: 20.0,
    hours: "24/7",
    amenities: "Food Court,Restroom,Fuel Station,Cafe",
    ratingAvg: 4.8,
    chargers: [
      { label: "Urse-DC-01", connectorType: "CCS2", powerKw: 120, status: "FREE" },
      { label: "Urse-DC-02", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "Urse-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  // Pune City & IT Hubs
  {
    name: "Tata Power - Hinjewadi Phase 1 IT Park",
    operatorName: "Tata Power",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    address: "Rajiv Gandhi Infotech Park, Hinjewadi Phase 1, Pune 411057",
    lat: 18.5913,
    lng: 73.7389,
    pricePerKwh: 17.5,
    hours: "24/7",
    amenities: "IT Cafeteria,WiFi,Security,Restroom",
    ratingAvg: 4.7,
    chargers: [
      { label: "Hinj-DC-01", connectorType: "CCS2", powerKw: 120, status: "BUSY" },
      { label: "Hinj-DC-02", connectorType: "CCS2", powerKw: 60, status: "BUSY" },
      { label: "Hinj-DC-03", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "Hinj-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  {
    name: "GreenCharge Hub - Wakad Phoenix Mall of the Millennium",
    operatorName: "GreenCharge Hub",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    address: "Sayaji Hotel Rd, Shankar Kalat Nagar, Wakad, Pune 411057",
    lat: 18.6046,
    lng: 73.7634,
    pricePerKwh: 18.0,
    hours: "24/7",
    amenities: "Mega Mall,Dining,Restroom,Fast Charging Lounge",
    ratingAvg: 4.8,
    chargers: [
      { label: "Wakad-DC-01", connectorType: "CCS2", powerKw: 150, status: "BUSY" },
      { label: "Wakad-DC-02", connectorType: "CCS2", powerKw: 120, status: "FREE" },
      { label: "Wakad-DC-03", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "Wakad-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  {
    name: "Statiq Charging Hub - Baner Balewadi High Street",
    operatorName: "Statiq",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    address: "Balewadi High St, Laxman Nagar, Baner, Pune 411045",
    lat: 18.5746,
    lng: 73.7749,
    pricePerKwh: 18.0,
    hours: "24/7",
    amenities: "Pubs,Dining,Cafe,Restroom,Valet",
    ratingAvg: 4.6,
    chargers: [
      { label: "Baner-DC-01", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "Baner-DC-02", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "Baner-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  {
    name: "Zeon Charging - Koregaon Park North Main Rd",
    operatorName: "Zeon",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    address: "Lane 7, North Main Rd, Koregaon Park, Pune 411001",
    lat: 18.5362,
    lng: 73.8940,
    pricePerKwh: 19.0,
    hours: "24/7",
    amenities: "Boutique Cafes,Restroom,Green Ambience",
    ratingAvg: 4.7,
    chargers: [
      { label: "KP-DC-01", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "KP-DC-02", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "KP-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  },
  {
    name: "Tata Power - Pune Airport Lohegaon",
    operatorName: "Tata Power",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    address: "New Airport Rd, Pune International Airport, Lohegaon, Pune 411032",
    lat: 18.5793,
    lng: 73.9089,
    pricePerKwh: 20.0,
    hours: "24/7",
    amenities: "Airport Terminal,Restroom,Waiting Lounge",
    ratingAvg: 4.8,
    chargers: [
      { label: "PNQ-DC-01", connectorType: "CCS2", powerKw: 120, status: "BUSY" },
      { label: "PNQ-DC-02", connectorType: "CCS2", powerKw: 60, status: "FREE" },
      { label: "PNQ-AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" }
    ]
  }
];

async function main() {
  logger.info("🌱 Starting EVspark database seeding...");

  // 1. SimConfig
  await prisma.simConfig.upsert({
    where: { id: "default" },
    update: { speed: 10, seed: 42 },
    create: { id: "default", speed: 10, seed: 42, surgeStations: "" }
  });
  logger.info("✓ SimConfig seeded");

  // 2. Vehicle Models
  for (const v of VEHICLE_MODELS) {
    const existing = await prisma.vehicleModel.findFirst({
      where: { make: v.make, model: v.model }
    });
    if (!existing) {
      await prisma.vehicleModel.create({ data: v });
    }
  }
  logger.info(`✓ ${VEHICLE_MODELS.length} Vehicle Models seeded`);

  // 3. Demo Users
  const driverUser = await prisma.user.upsert({
    where: { email: "driver@evspark.in" },
    update: { name: "Arjun Sharma", role: "DRIVER" },
    create: { email: "driver@evspark.in", name: "Arjun Sharma", role: "DRIVER" }
  });

  const operatorUser = await prisma.user.upsert({
    where: { email: "operator@evspark.in" },
    update: { name: "Aakash Mehta", role: "OPERATOR" },
    create: { email: "operator@evspark.in", name: "Aakash Mehta", role: "OPERATOR" }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@evspark.in" },
    update: { name: "Priya Patel", role: "ADMIN" },
    create: { email: "admin@evspark.in", name: "Priya Patel", role: "ADMIN" }
  });

  // User profiles
  await prisma.driverProfile.upsert({
    where: { userId: driverUser.id },
    update: { connectorPref: "CCS2", rangeKm: 320, homeLat: 19.2183, homeLng: 72.9781 },
    create: { userId: driverUser.id, connectorPref: "CCS2", rangeKm: 320, homeLat: 19.2183, homeLng: 72.9781 }
  });

  await prisma.operatorProfile.upsert({
    where: { userId: operatorUser.id },
    update: { businessName: "GreenCharge Hub", phone: "+91 98200 12345" },
    create: { userId: operatorUser.id, businessName: "GreenCharge Hub", phone: "+91 98200 12345" }
  });
  logger.info("✓ Demo Users & Profiles seeded (driver, operator, admin)");

  // 4. Stations & Chargers
  let createdCount = 0;
  const defaultPhotos = [
    "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1558441719-72f5341cfab0?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1647427017067-8f33cd449248?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80"
  ];

  for (const item of SEED_STATIONS) {
    const { chargers, ...stationData } = item;
    const photoUrl = (stationData as any).photoUrl || defaultPhotos[createdCount % defaultPhotos.length];
    let station = await prisma.station.findFirst({
      where: { name: stationData.name }
    });

    if (!station) {
      station = await prisma.station.create({
        data: {
          ...stationData,
          photoUrl,
          operatorUserId: item.operatorName === "GreenCharge Hub" ? operatorUser.id : null,
          chargers: {
            create: chargers.map(c => ({
              label: c.label,
              connectorType: c.connectorType,
              powerKw: c.powerKw,
              status: c.status as any,
              ocppId: `CP-${c.label}`
            }))
          }
        }
      });
      createdCount++;
    } else {
      if (!station.photoUrl) {
        await prisma.station.update({
          where: { id: station.id },
          data: { photoUrl }
        });
      }
      // update chargers if needed
      for (const c of chargers) {
        const existingCharger = await prisma.charger.findFirst({
          where: { stationId: station.id, label: c.label }
        });
        if (!existingCharger) {
          await prisma.charger.create({
            data: {
              stationId: station.id,
              label: c.label,
              connectorType: c.connectorType,
              powerKw: c.powerKw,
              status: c.status as any,
              ocppId: `CP-${c.label}`
            }
          });
        }
      }
    }
  }
  logger.info(`✓ Stations processed (${createdCount} new stations created, total ${SEED_STATIONS.length})`);

  // 5. Add initial reviews for top stations
  const sampleStations = await prisma.station.findMany({ take: 3 });
  for (const st of sampleStations) {
    const existingRev = await prisma.review.findFirst({ where: { stationId: st.id, userId: driverUser.id } });
    if (!existingRev) {
      await prisma.review.create({
        data: {
          stationId: st.id,
          userId: driverUser.id,
          rating: 5,
          comment: "Super fast 120kW charging! Very clean lounge with coffee.",
          reply: "Thank you Arjun! Glad you enjoyed the fast charging experience."
        }
      });
    }
  }
  logger.info("✓ Sample reviews seeded");

  logger.info("🎉 EVspark database seeding successfully completed!");
}

main()
  .catch((e) => {
    logger.error({ err: e }, "❌ Seeding error");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
