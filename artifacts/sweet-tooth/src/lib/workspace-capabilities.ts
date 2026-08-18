import { Bot, CalendarDays, PackageCheck, WalletCards, type LucideIcon } from "lucide-react";

export const WORKSPACE_CAPABILITIES = [
  {
    id: "assistant",
    icon: Bot,
    title: "AI bakery assistant",
    description: "Answers common customer questions using your menu, prices, policies and delivery areas.",
  },
  {
    id: "orders",
    icon: PackageCheck,
    title: "Order management",
    description: "Keeps products, cake notes, customer information and delivery requirements together.",
  },
  {
    id: "payments",
    icon: WalletCards,
    title: "Payment review",
    description: "Connects customer payment evidence, advance amounts and remaining balances to each order.",
  },
  {
    id: "calendar",
    icon: CalendarDays,
    title: "Production calendar",
    description: "Shows what must be prepared, decorated, completed and delivered next.",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}>;

export type WorkspaceCapabilityId = (typeof WORKSPACE_CAPABILITIES)[number]["id"];

export const WORKSPACE_CAPABILITY_IDS: WorkspaceCapabilityId[] = WORKSPACE_CAPABILITIES.map(
  (capability) => capability.id,
);
