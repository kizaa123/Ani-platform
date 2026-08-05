"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AgentAssignment, AppNotification, isFarmerAssignment } from "@/lib/types";
import { filterHandlerOrderNotifications } from "@/lib/handlerOrderNotifications";
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

    api.agents
      .assignments()
      .then((assignments) => {
        if (cancelled) return;
        setFarmers(assignments.filter(isFarmerAssignment));
        setLoadError("");
      })
      .catch((e) => {
        if (!cancelled) {
          setFarmers([]);
          setLoadError(e instanceof Error ? e.message : "Failed to load assigned fellows");
        }
      });

    api.notifications
      .list()
      .then((notifications) => {
        if (cancelled) return;
        const unreadOrderAlerts = filterHandlerOrderNotifications(notifications).filter((n) => !n.read);
        setOrderAlerts(unreadOrderAlerts);
      })
      .catch(() => {
        if (!cancelled) setOrderAlerts([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = farmers === null;

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
          loading={orderAlerts === null}
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
