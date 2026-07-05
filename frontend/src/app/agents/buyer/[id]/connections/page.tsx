"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Connection, ConnectionUser, fullName, isHandler } from "@/lib/types";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { ConnectionChatModal } from "@/components/ConnectionChatModal";
import { HandlerBuyerClientNav } from "@/components/HandlerBuyerClientNav";
import { formatDate, formatGhc } from "@/lib/format";

type ChatTarget = {
  partnerId: string;
  partnerName: string;
  partnerPhoto?: string | null;
};

function statusLabel(status: string) {
  switch (status) {
    case "ACCEPTED":
      return "Approved";
    case "REJECTED":
      return "Declined";
    default:
      return "Pending approval";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "ACCEPTED":
      return "bg-green-100 text-green-800";
    case "REJECTED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-amber-100 text-amber-900";
  }
}

export default function HandlerClientBuyerConnectionsPage() {
  const params = useParams();
  const ownerId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && !isHandler(user.roleId)) {
      router.push("/dashboard");
      return;
    }
    if (user && ownerId) {
      Promise.all([api.agents.clientConnections(ownerId), api.agents.clientFarm(ownerId)])
        .then(([rows, client]) => {
          setConnections(rows);
          if (client.clientType === "buyer" && client.buyer) {
            setBuyerName(client.buyer.name);
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load connections"));
    }
  }, [user?.id, loading, router, ownerId]);

  if (loading || !user) {
    return <div className="p-12 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <HandlerBuyerClientNav ownerId={ownerId} buyerName={buyerName} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Farmer connections</h1>
        <p className="text-gray-500">
          Every farmer your buyer requested access from — status, fees, and messaging
        </p>
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {connections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/30 p-12 text-center">
          <p className="text-4xl">🤝</p>
          <p className="mt-3 font-semibold text-brand-900">No connection requests yet</p>
          <p className="mt-1 text-sm text-gray-500">
            When this buyer requests farm access, you will see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((c) => (
            <ConnectionRow
              key={c.id}
              connection={c}
              farmer={c.farmer}
              onOpenChat={() => {
                if (!c.farmer) return;
                setChatTarget({
                  partnerId: c.farmer.id,
                  partnerName: fullName(c.farmer),
                  partnerPhoto: c.farmer.profilePicture,
                });
              }}
            />
          ))}
        </div>
      )}

      {chatTarget && user && (
        <ConnectionChatModal
          partnerId={chatTarget.partnerId}
          partnerName={chatTarget.partnerName}
          partnerPhoto={chatTarget.partnerPhoto}
          currentUserId={user.id}
          onClose={() => setChatTarget(null)}
        />
      )}
    </div>
  );
}

function ConnectionRow({
  connection: c,
  farmer,
  onOpenChat,
}: {
  connection: Connection;
  farmer?: ConnectionUser;
  onOpenChat: () => void;
}) {
  const farmName = farmer && "farmName" in farmer ? farmer.farmName : null;

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <ProfilePhoto src={farmer?.profilePicture} name={farmer?.firstName} size={72} />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Farmer</p>
            <p className="font-bold text-brand-900">{farmer ? fullName(farmer) : "Unknown"}</p>
            {farmName && <p className="text-sm font-medium text-brand-700">{farmName}</p>}
            {farmer && (
              <CountryBadge country={farmer.country} region={farmer.region} className="mt-1" />
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(c.status)}`}
              >
                {statusLabel(c.status)}
              </span>
              <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
            </div>

            {c.accessPaid && c.farmAccess && (
              <p className="mt-2 text-xs text-gray-600">
                Access fee paid: {formatGhc(c.farmAccess.amount)} ·{" "}
                {c.farmAccess.paymentMethod.replace("_", " ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {c.status === "ACCEPTED" && farmer && (
            <button type="button" onClick={onOpenChat} className="btn-primary px-4 py-2">
              Message farmer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
