import prisma from "../lib/prisma.js";
import { computeRevenueAnalytics, computeHeatmap, computeBreakdown } from "../services/analytics.service.js";

async function main() {
  const op = await prisma.user.findUnique({ where: { email: "operator@evspark.in" } });
  if (!op) throw new Error("operator@evspark.in not found - run db:seed first");
  const ids = (await prisma.station.findMany({ where: { operatorUserId: op.id }, select: { id: true } })).map((s) => s.id);
  console.log("stations:", ids.length);
  console.log(JSON.stringify(await computeRevenueAnalytics(ids), null, 2));
  console.log(JSON.stringify(await computeHeatmap(ids), null, 2));
  console.log(JSON.stringify(await computeBreakdown(ids), null, 2));
  // new operator with no stations must give empty/zero values, not someone else's data
  console.log("EMPTY CASE:", JSON.stringify((await computeRevenueAnalytics([])).summary));
}
main().finally(() => prisma.$disconnect());
