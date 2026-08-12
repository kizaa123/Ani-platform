"use client";

import { AuthProvider } from "@/context/AuthProvider";
import { NotificationProvider } from "@/context/NotificationProvider";
import { AppShell } from "@/components/AppShell";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppShell>{children}</AppShell>
      </NotificationProvider>
    </AuthProvider>
  );
}
