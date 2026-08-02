import { text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { sweetTooth } from "./pg.js";

export const orderAuditLogsTable = sweetTooth.table("order_audit_logs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  bakerId: integer("baker_id").notNull(),
  actorId: integer("actor_id"), // memberId of staff (null for owner/buyer/system)
  actorType: text("actor_type").notNull(), // 'owner' | 'staff' | 'buyer' | 'system'
  action: text("action").notNull(), // 'status_change' | 'payment_decision' | 'refund' | 'receipt_upload' | 'ocr_verification'
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
