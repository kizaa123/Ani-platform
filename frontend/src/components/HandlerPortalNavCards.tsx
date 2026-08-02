"use client";

import { PortalNavCard } from "@/components/PortalNavCard";
import { ScrollReveal } from "@/components/ScrollReveal";
import { scrollStagger } from "@/lib/scrollStagger";
import { getPortalNavImage } from "@/lib/portalNavImages";
import { isBuyerHandler } from "@/lib/types";
import type { IconName } from "@/components/icons";

type HandlerNavCard = {
  href: string;
  title: string;
  desc: string;
  icon: IconName;
};

function handlerNavCards(roleId: number): HandlerNavCard[] {
  const isClo = isBuyerHandler(roleId);

  return [
    {
      href: "/agents",
      title: isClo ? "My Clients" : "My Fellows",
      desc: isClo
        ? "View assigned clients, orders & connections"
        : "View assigned fellows, orders & profiles",
      icon: "users",
    },
    {
      href: "/agents/financials",
      title: "Financial Statement",
      desc: isClo
        ? "Your liaison commission from client orders"
        : "Your 10% liaison commission from fellow orders",
      icon: "chart",
    },
    {
      href: "/library",
      title: "Research Library",
      desc: "Browse books & research publications",
      icon: "book",
    },
    {
      href: "/agents/settings",
      title: "Profile",
      desc: "Profile photo & contact details",
      icon: "user",
    },
  ];
}

/** Image-backed nav cards for handler portal sections - matches fellow/client dashboard style. */
export function HandlerPortalNavCards({
  roleId,
  excludeHref,
  startIndex = 0,
}: {
  roleId: number;
  excludeHref?: string;
  /** Stagger index offset when mixed with other dashboard cards */
  startIndex?: number;
}) {
  const cards = handlerNavCards(roleId).filter((c) => c.href !== excludeHref);

  return (
    <>
      {cards.map((c, i) => (
        <ScrollReveal
          key={c.href}
          delay={scrollStagger(startIndex + i, 90)}
          duration={500}
          direction="fade-up"
        >
          <PortalNavCard
            href={c.href}
            title={c.title}
            desc={c.desc}
            icon={c.icon}
            image={getPortalNavImage(c.href, roleId)}
          />
        </ScrollReveal>
      ))}
    </>
  );
}
