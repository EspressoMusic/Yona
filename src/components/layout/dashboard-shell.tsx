"use client";

import { useState } from "react";
import { Sidebar, MobileSidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { PageTransition } from "./page-transition";

export function DashboardShell({
  name,
  email,
  children,
}: {
  name: string | null;
  email: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} name={name} email={email} />
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
