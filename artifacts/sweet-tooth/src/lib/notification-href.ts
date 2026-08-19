export type NotificationLinkInput = {
  type?: string | null;
  relatedId?: number | null;
  relatedType?: string | null;
};

export function chatSessionFromRelatedType(relatedType?: string | null): string | null {
  if (!relatedType?.startsWith("chat:")) return null;
  const sessionId = relatedType.slice(5).trim();
  return sessionId || null;
}

export function notificationHref(notification: NotificationLinkInput): string {
  const type = notification.type ?? "";
  const relatedId = notification.relatedId ?? null;
  const sessionId = chatSessionFromRelatedType(notification.relatedType);

  if (type === "chat_escalation") {
    return "/dashboard/human-inbox";
  }

  if (type === "new_message" || notification.relatedType === "chat" || sessionId) {
    const params = new URLSearchParams({ tab: "conversations" });
    if (relatedId && relatedId > 0) params.set("buyer", String(relatedId));
    if (sessionId) params.set("session", sessionId);
    return `/dashboard/agent-hub?${params.toString()}`;
  }

  if (
    type === "new_order" ||
    type === "payment_pending" ||
    type === "order_delivered" ||
    notification.relatedType === "order"
  ) {
    if (relatedId) return `/dashboard/orders?order=${relatedId}`;
    return "/dashboard/orders";
  }

  return "/dashboard";
}
