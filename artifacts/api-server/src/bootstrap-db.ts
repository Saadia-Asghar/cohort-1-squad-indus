import { pool } from "@workspace/db";
import schemaSql from "./bootstrap-schema.sql";

let bootstrapPromise: Promise<void> | undefined;

/** Runs idempotent schema setup for a freshly provisioned Neon database. */
export function ensureDatabase(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = pool.query(schemaSql).then(() => undefined);
  }
  return bootstrapPromise!;
}
