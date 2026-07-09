import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "@workspace/db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(__dirname, "bootstrap-schema.sql");
const sql = readFileSync(sqlPath, "utf8");

async function main() {
  try {
    await pool.query(sql);
    console.log("Schema bootstrap complete");
  } catch (e) {
    const err = e as Error;
    console.error("Bootstrap failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void main();
