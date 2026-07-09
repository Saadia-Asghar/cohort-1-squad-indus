import { pgSchema } from "drizzle-orm/pg-core";

/** Supabase tables live in the sweet_tooth schema (not public). */
export const sweetTooth = pgSchema("sweet_tooth");
