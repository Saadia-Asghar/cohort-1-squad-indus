import { defineConfig } from "drizzle-kit";
import "./src/load-env";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  schemaFilter: ["sweet_tooth"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
