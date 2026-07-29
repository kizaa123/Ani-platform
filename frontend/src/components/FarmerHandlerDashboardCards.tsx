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

function isFarmerAssignment(a: AgentAssignment) {
  return a.owner.isFarmer || a.owner.roleId === 1 || a.owner.roleId === 2;
}

export function FarmerHandlerDashboardCards() {
  const [farmers, setFarmers] = useState<AgentAssignment[] | null>(null);
  const [orderAlertCount, setOrderAlertCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.agents.assignments(), api.notifications.list()])
      .then(([assignments, notifications]) => {
        if (cancelled) return;
        setFarmers(assignments.filter(isFarmerAssignment));
        const unreadOrderAlerts = (notifications as AppNotification[]).filter(
          (n) => !n.read && ORDER_NOTIFICATION_TYPES.has(n.type)
        ).length;
        setOrderAlertCount(unreadOrderAlerts);
      })
      .catch(() => {
        if (!cancelled) {
          setFarmers([]);
          setOrderAlertCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = farmers === null;

  return (
    <>
      <ScrollReveal delay={scrollStagger(0, 90)} duration={500} direction="fade-up">
        <HandlerAssignmentsPreviewCard
          href="/agents"
          title="Assigned Farmers"
          icon="users"
          assignments={farmers ?? []}
          loading={loading}
          emptyMessage="No farmers assigned yet"
          clientType="farmer"
          getSubtitle={(owner) => {
            const farm = owner.farmerProfile?.farmName;
            const location = [owner.city, owner.region].filter(Boolean).join(", ");
            return [farm, location].filter(Boolean).join(" · ");
          }}
          getStat={(owner) => owner.farmerProfile?.farmSize ?? undefined}
        />
      </ScrollReveal>
      <ScrollReveal delay={scrollStagger(1, 90)} duration={500} direction="fade-up">
        <HandlerOrderAlertsCard
          href="/agents"
          count={orderAlertCount}
          loading={orderAlertCount === null}
          entityLabel="farmers"
        />
      </ScrollReveal>
    </>
  );
}

export function FarmerHandlerDashboardHint() {
  return (
    <p className="mb-6 text-sm text-gray-500">
      Manage your assigned farmers, track their orders, and view your liaison commission.{" "}
      <Link href="/library" className="font-semibold text-brand-700 hover:underline">
        Research Library
      </Link>{" "}
      is available for agricultural resources.
    </p>
  );
}
