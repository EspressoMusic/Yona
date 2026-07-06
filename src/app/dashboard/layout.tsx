import { requireUser } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <DashboardShell name={user.name} email={user.email}>
      {children}
    </DashboardShell>
  );
}
