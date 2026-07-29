"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AgentAssignment, AppNotification } from "@/lib/types";
import {
  HandlerAssignmentsPreviewCard,
  HandlerOrderAlertsCard,
} from "@/components/HandlerAssignmentCards";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";

const ORDER_NOTIFICATION_TYPES = new Set([
  "NEW_ORDER",
  "ORDER_TRACKED",
  "ORDER_PAYMENT_RELEASED",
  "MONEY_DISTRIBUTED",
]);

function isBuyerAssignment(a: AgentAssignment) {
  return !(a.owner.isFarmer || a.owner.roleId === 1 || a.owner.roleId === 2);
}

export function BuyerHandlerDashboardCards() {
  const [clients, setClients] = useState<AgentAssignment[] | null>(null);
  const [orderAlertCount, setOrderAlertCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.agents.assignments(), api.notifications.list()])
      .then(([assignments, notifications]) => {
        if (cancelled) return;
        setClients(assignments.filter(isBuyerAssignment));
        const unreadOrderAlerts = (notifications as AppNotification[]).filter(
          (n) => !n.read && ORDER_NOTIFICATION_TYPES.has(n.type)
        ).length;
        setOrderAlertCount(unreadOrderAlerts);
      })
      .catch(() => {
        if (!cancelled) {
          setClients([]);
          setOrderAlertCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = clients === null;

  return (
    <>
      <ScrollReveal delay={scrollStagger(0, 90)} duration={500} direction="fade-up">
        <HandlerAssignmentsPreviewCard
          href="/agents"
          title="Assigned Clients"
          icon="users"
          assignments={clients ?? []}
          loading={loading}
          emptyMessage="No clients assigned yet"
          clientType="buyer"
          getSubtitle={(owner) => {
            const company = owner.buyerProfile?.company;
            const location = [owner.city, owner.region].filter(Boolean).join(", ");
            return [company, location].filter(Boolean).join(" · ");
          }}
        />
      </ScrollReveal>
      <ScrollReveal delay={scrollStagger(1, 90)} duration={500} direction="fade-up">
        <HandlerOrderAlertsCard
          href="/agents"
          count={orderAlertCount}
          loading={orderAlertCount === null}
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
