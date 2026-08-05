"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AgentAssignment, AppNotification, isFarmerAssignment } from "@/lib/types";
import { filterUnreadHandlerOrderNotifications } from "@/lib/handlerOrderNotifications";
import {
  HandlerAssignmentsPreviewCard,
  HandlerOrderAlertsCard,
} from "@/components/HandlerAssignmentCards";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { formatUserLocation } from "@/lib/formatUserLocation";

export function FarmerHandlerDashboardCards() {
  const [farmers, setFarmers] = useState<AgentAssignment[] | null>(null);
  const [orderAlerts, setOrderAlerts] = useState<AppNotification[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.agents.assignments(), api.notifications.list()])
      .then(([assignments, notifications]) => {
        if (cancelled) return;
        setFarmers(assignments.filter(isFarmerAssignment));
        setOrderAlerts(filterUnreadHandlerOrderNotifications(notifications));
        setLoadError("");
      })
      .catch((e) => {
        if (!cancelled) {
          setFarmers([]);
          setOrderAlerts([]);
          setLoadError(e instanceof Error ? e.message : "Failed to load assigned fellows");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = farmers === null || orderAlerts === null;

  return (
    <>
      {loadError && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {loadError}
        </p>
      )}
      <ScrollReveal delay={scrollStagger(0, 90)} duration={500} direction="fade-up">
        <HandlerAssignmentsPreviewCard
          href="/agents/fellows"
          title="Assigned Fellows"
          icon="users"
          assignments={farmers ?? []}
          loading={loading}
          emptyMessage="No fellows assigned yet"
          clientType="farmer"
          getSubtitle={(owner) => {
            const farm = owner.farmerProfile?.farmName;
            const location = formatUserLocation(owner);
            return [location, farm].filter(Boolean) as string[];
          }}
          getStat={(owner) => owner.farmerProfile?.farmSize ?? undefined}
        />
      </ScrollReveal>
      <ScrollReveal delay={scrollStagger(1, 90)} duration={500} direction="fade-up">
        <HandlerOrderAlertsCard
          href="/agents/order-notifications"
          notifications={orderAlerts}
          loading={loading}
          entityLabel="fellows"
        />
      </ScrollReveal>
    </>
  );
}

export function FarmerHandlerDashboardHint() {
  return (
    <p className="mb-6 text-sm text-gray-500">
      Manage your assigned fellows, track their orders, and view your liaison commission.{" "}
      <Link href="/library" className="font-semibold text-brand-700 hover:underline">
        Research Library
      </Link>{" "}
      is available for industry and academic resources.
    </p>
  );
}
