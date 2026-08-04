import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ApprovedHomePreview } from "@/components/dashboard/approved-home-preview";

export default function DashboardHome() {
  return (
    <DashboardLayout>
      <ApprovedHomePreview />
    </DashboardLayout>
  );
}