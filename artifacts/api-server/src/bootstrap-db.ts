import { pool } from "@workspace/db";
import schemaSql from "./bootstrap-schema.sql";

let bootstrapPromise: Promise<void> | undefined;

/** Runs idempotent schema setup for a freshly provisioned Neon database. */
export function ensureDatabase(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = pool.query(schemaSql).then(() => undefined).catch((error: unknown) => {
      // Do not start a function that looks healthy while its database schema
      // is unavailable. Clearing the cached promise also permits a later
      // serverless invocation to retry after a transient Neon outage.
      bootstrapPromise = undefined;
      throw error;
    });
  }
  return bootstrapPromise;
}
