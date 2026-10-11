import dotenv from "dotenv";
import path from "path";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
  dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
  dotenv.config();
}
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX) || 10,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;