import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env"), override: true });

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: "-c search_path=sweet_tooth,public",
});
export const db = drizzle(pool, { schema });

export * from "./schema";
