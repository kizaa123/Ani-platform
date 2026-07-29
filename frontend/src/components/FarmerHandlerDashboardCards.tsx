"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AppNotification } from "@/lib/types";
import { PortalNavCard } from "@/components/PortalNavCard";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { getPortalNavImage } from "@/lib/portalNavImages";

const ORDER_NOTIFICATION_TYPES = new Set([
  "NEW_ORDER",
  "ORDER_TRACKED",
  "ORDER_PAYMENT_RELEASED",
  "MONEY_DISTRIBUTED",
]);

export function FarmerHandlerDashboardCards({ roleId }: { roleId: number }) {
  const [farmerCount, setFarmerCount] = useState<number | null>(null);
  const [orderAlertCount, setOrderAlertCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.agents.assignments(), api.notifications.list()])
      .then(([assignments, notifications]) => {
        if (cancelled) return;
        const farmers = assignments.filter((a) => a.owner.isFarmer || a.owner.roleId === 1 || a.owner.roleId === 2);
        setFarmerCount(farmers.length);
        const unreadOrderAlerts = (notifications as AppNotification[]).filter(
          (n) => !n.read && ORDER_NOTIFICATION_TYPES.has(n.type)
        ).length;
        setOrderAlertCount(unreadOrderAlerts);
      })
      .catch(() => {
        if (!cancelled) {
          setFarmerCount(0);
          setOrderAlertCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      href: "/agents",
      title: "Assigned Farmers",
      desc:
        farmerCount === null
          ? "Loading assigned farmers..."
          : farmerCount === 0
            ? "No farmers assigned yet"
            : `${farmerCount} farmer${farmerCount === 1 ? "" : "s"} under your liaison care`,
      icon: "users" as const,
    },
    {
      href: "/agents",
      title: "Order Notifications",
      desc:
        orderAlertCount === null
          ? "Loading order alerts..."
          : orderAlertCount === 0
            ? "No unread order notifications"
            : `${orderAlertCount} unread order notification${orderAlertCount === 1 ? "" : "s"} for your farmers`,
      icon: "package" as const,
    },
  ];

  return (
    <>
      {cards.map((card, i) => (
        <ScrollReveal key={card.title} delay={scrollStagger(i, 90)} duration={500} direction="fade-up">
          <PortalNavCard
            href={card.href}
            title={card.title}
            desc={card.desc}
            icon={card.icon}
            image={getPortalNavImage(card.href, roleId)}
          />
        </ScrollReveal>
      ))}
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
