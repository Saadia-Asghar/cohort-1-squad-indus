import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load local env files and map DATABASE_* (from D:\sweettooth app\.env)
 * into the DATABASE_URL this package expects.
 */
function loadLooseEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!key || !value || process.env[key]) continue;
    process.env[key] = value;
  }
}

function applyDatabaseUrlFromParts(): void {
  if (process.env.DATABASE_URL?.trim()) return;
  const user = process.env.DATABASE_USERNAME?.trim();
  const password = process.env.DATABASE_PASSWORD ?? "";
  const host = process.env.DATABASE_HOST?.trim();
  const port = process.env.DATABASE_PORT?.trim() || "5432";
  const name = process.env.DATABASE_NAME?.trim();
  if (!user || !host || !name) return;
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  process.env.DATABASE_URL = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${name}`;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const envCandidates = [
  path.join(repoRoot, "artifacts/api-server/.env"),
  path.join(repoRoot, ".env"),
  path.join(repoRoot, "../.env"),
];

for (const candidate of envCandidates) {
  loadLooseEnvFile(candidate);
}

applyDatabaseUrlFromParts();

if (!process.env.DATABASE_URL?.trim() && process.env.VITEST) {
  process.env.DATABASE_URL = "postgresql://127.0.0.1:5432/vitest_placeholder";
}

if (!process.env.FRONTEND_URL?.trim() && process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  process.env.FRONTEND_URL = "http://localhost:5173";
}
