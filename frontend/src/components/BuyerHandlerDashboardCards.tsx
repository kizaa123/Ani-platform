"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AgentAssignment, AppNotification, isBuyerAssignment, isResearcher } from "@/lib/types";
import {
  HandlerAssignmentsPreviewCard,
  HandlerOrderAlertsCard,
} from "@/components/HandlerAssignmentCards";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { formatUserLocation } from "@/lib/formatUserLocation";

const ORDER_NOTIFICATION_TYPES = new Set([
  "NEW_ORDER",
  "ORDER_TRACKED",
  "ORDER_PAYMENT_RELEASED",
  "MONEY_DISTRIBUTED",
]);

export function BuyerHandlerDashboardCards() {
  const [clients, setClients] = useState<AgentAssignment[] | null>(null);
  const [orderAlerts, setOrderAlerts] = useState<AppNotification[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api.agents
      .assignments()
      .then((assignments) => {
        if (cancelled) return;
        setClients(assignments.filter(isBuyerAssignment));
        setLoadError("");
      })
      .catch((e) => {
        if (!cancelled) {
          setClients([]);
          setLoadError(e instanceof Error ? e.message : "Failed to load assigned clients");
        }
      });

    api.notifications
      .list()
      .then((notifications) => {
        if (cancelled) return;
        const unreadOrderAlerts = (notifications as AppNotification[])
          .filter((n) => !n.read && ORDER_NOTIFICATION_TYPES.has(n.type))
          .sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        setOrderAlerts(unreadOrderAlerts);
      })
      .catch(() => {
        if (!cancelled) setOrderAlerts([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = clients === null;

  return (
    <>
      {loadError && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {loadError}
        </p>
      )}
      <ScrollReveal delay={scrollStagger(0, 90)} duration={500} direction="fade-up">
        <HandlerAssignmentsPreviewCard
          href="/agents/clients"
          title="Assigned Clients"
          icon="users"
          assignments={clients ?? []}
          loading={loading}
          emptyMessage="No clients assigned yet"
          clientType="buyer"
          getSubtitle={(owner) => {
            const organization = isResearcher(owner.roleId ?? 0)
              ? owner.researcherProfile?.institution?.trim()
              : owner.buyerProfile?.company?.trim();
            const location = formatUserLocation(owner);
            return [location, organization].filter(Boolean) as string[];
          }}
        />
      </ScrollReveal>
      <ScrollReveal delay={scrollStagger(1, 90)} duration={500} direction="fade-up">
        <HandlerOrderAlertsCard
          href="/agents/clients"
          notifications={orderAlerts}
          loading={orderAlerts === null}
          entityLabel="clients"
        />
      </ScrollReveal>
    </>
  );
}

export function BuyerHandlerDashboardHint() {
  return (
    <p className="mb-6 text-sm text-gray-500">
      Manage your assigned clients, track their orders, and view your liaison commission.{" "}
      <Link href="/library" className="font-semibold text-brand-700 hover:underline">
        Research Library
      </Link>{" "}
      is available for agricultural resources.
    </p>
  );
}
