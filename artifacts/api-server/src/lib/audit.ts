import { db, orderAuditLogsTable } from "@workspace/db";
import { AuthenticatedRequest } from "../middlewares/auth.js";

export interface AuditActor {
  actorType: "owner" | "staff" | "buyer" | "system";
  actorId?: number;
}

export function getActorFromRequest(req: any): AuditActor {
  const auth = req as AuthenticatedRequest;
  if (!auth || !auth.bakerId) {
    return { actorType: "buyer" };
  }
  if (auth.memberRole === "owner") {
    return { actorType: "owner" };
  }
  return {
    actorType: "staff",
    actorId: auth.memberId,
  };
}

export async function logOrderActivity(params: {
  orderId: number;
  bakerId: number;
  actor: AuditActor;
  action: "status_change" | "payment_decision" | "refund" | "receipt_upload" | "ocr_verification";
  fromStatus?: string | null;
  toStatus?: string | null;
  metadata?: Record<string, any>;
}) {
  try {
    await db.insert(orderAuditLogsTable).values({
      orderId: params.orderId,
      bakerId: params.bakerId,
      actorId: params.actor.actorId ?? null,
      actorType: params.actor.actorType,
      action: params.action,
      fromStatus: params.fromStatus ?? null,
      toStatus: params.toStatus ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.error("Failed to log order audit trail:", err);
  }
}
