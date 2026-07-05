"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Connection, ConnectionUser, fullName, isBuyer, isFarmer, isStaff, ROLES } from "@/lib/types";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { ConnectionChatModal } from "@/components/ConnectionChatModal";
import { VerificationBadge } from "@/components/VerificationBadge";
import { formatDate, formatGhc } from "@/lib/format";

function canApproveConnection(roleId: number) {
  return isStaff(roleId);
}

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

function partnerRoleLabel(isBuyerView: boolean) {
  return isBuyerView ? "Farmer" : "Buyer";
}

type ChatTarget = {
  partnerId: string;
  partnerName: string;
  partnerPhoto?: string | null;
};

export default function ConnectionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);

  const load = () => api.connections.list().then(setConnections).catch(console.error);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) load();
  }, [user?.id, loading, router]);

  const updateStatus = async (id: string, status: string) => {
    await api.connections.updateStatus(id, status);
    load();
  };

  if (loading || !user) return <div className="p-12 text-center">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold text-brand-900">Connections</h1>
      <p className="mb-8 text-gray-500">
        {isFarmer(user.roleId)
          ? "Buyers who requested farm access — ANI admin approves access; you'll be notified when someone requests"
          : isBuyer(user.roleId)
            ? "Farmers you requested access from — message them once ANI admin approves"
            : user.roleId === ROLES.FARMER_HANDLER
              ? "Buyer connections for your farmer clients — view-only; ANI admin approves access"
              : user.roleId === ROLES.BUYER_HANDLER
                ? "Farmer connections for your buyer clients — see who they connected with and message farmers"
                : isStaff(user.roleId)
                  ? "Pending farm access requests — approve or reject buyer connections"
                  : "Client connection requests"}
      </p>

      {connections.length === 0 ? (
        <p className="text-gray-500">No connection requests yet.</p>
      ) : (
        <div className="space-y-4">
          {connections.map((c) => {
            const isBuyerView = isBuyer(user.roleId);
            const isFarmerHandlerView = user.roleId === ROLES.FARMER_HANDLER;
            const isBuyerHandlerView = user.roleId === ROLES.BUYER_HANDLER;
            const partner: ConnectionUser | undefined = isBuyerView
              ? c.farmer
              : isFarmer(user.roleId) || isFarmerHandlerView
                ? c.buyer
                : isBuyerHandlerView
                  ? c.farmer
                  : c.buyer?.id === user.id
                    ? c.farmer
                    : c.buyer;

            return (
              <ConnectionCard
                key={c.id}
                connection={c}
                partner={partner}
                farmerClient={isFarmerHandlerView ? c.farmer : undefined}
                buyerClient={isBuyerHandlerView ? c.buyer : undefined}
                isBuyerView={isBuyerView}
                isHandlerView={isFarmerHandlerView}
                isBuyerHandlerView={isBuyerHandlerView}
                canApprove={canApproveConnection(user.roleId)}
                onApprove={() => updateStatus(c.id, "ACCEPTED")}
                onReject={() => updateStatus(c.id, "REJECTED")}
                onOpenChat={() => {
                  if (!partner) return;
                  setChatTarget({
                    partnerId: partner.id,
                    partnerName: fullName(partner),
                    partnerPhoto: partner.profilePicture,
                  });
                }}
              />
            );
          })}
        </div>
      )}

      {chatTarget && (
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

function ConnectionCard({
  connection: c,
  partner,
  farmerClient,
  buyerClient,
  isBuyerView,
  isHandlerView,
  isBuyerHandlerView,
  canApprove,
  onApprove,
  onReject,
  onOpenChat,
}: {
  connection: Connection;
  partner?: ConnectionUser;
  farmerClient?: ConnectionUser;
  buyerClient?: ConnectionUser;
  isBuyerView: boolean;
  isHandlerView?: boolean;
  isBuyerHandlerView?: boolean;
  canApprove: boolean;
  onApprove: () => void;
  onReject: () => void;
  onOpenChat: () => void;
}) {
  const farmName = partner && "farmName" in partner ? partner.farmName : null;
  const showPhone = !isBuyerView && partner?.phone;

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
      {isHandlerView && farmerClient && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
            Farmer client
          </p>
          <p className="font-bold text-brand-900">{fullName(farmerClient)}</p>
          {farmerClient.farmName && (
            <p className="text-sm font-medium text-brand-700">{farmerClient.farmName}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            This buyer requested access to {farmerClient.farmName ?? fullName(farmerClient)}&apos;s
            farm
          </p>
        </div>
      )}

      {isBuyerHandlerView && buyerClient && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
            Buyer client
          </p>
          <p className="font-bold text-brand-900">{fullName(buyerClient)}</p>
          <p className="mt-1 text-xs text-gray-500">
            Your buyer requested access to this farmer&apos;s products
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <ProfilePhoto
            src={partner?.profilePicture}
            name={partner?.firstName}
            size={56}
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {isBuyerHandlerView ? "Farmer" : partnerRoleLabel(isBuyerView)}
            </p>
            <p className="font-bold text-brand-900">
              {partner ? fullName(partner) : "Unknown"}
            </p>
            {partner?.verificationStatus && (
              <VerificationBadge status={partner.verificationStatus} className="mt-1" />
            )}
            {farmName && (
              <p className="text-sm font-medium text-brand-700">{farmName}</p>
            )}
            {partner && (
              <CountryBadge
                country={partner.country}
                region={partner.region}
                className="mt-1"
              />
            )}
            {partner?.city && (
              <p className="mt-1 text-sm text-gray-600">{partner.city}</p>
            )}

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {showPhone && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-400">Phone</p>
                  <a
                    href={`tel:${partner.phone}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {partner.phone}
                  </a>
                </div>
              )}
              {partner?.email && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-400">Email</p>
                  <p className="break-all text-gray-700">{partner.email}</p>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(c.status)}`}
              >
                {statusLabel(c.status)}
              </span>
              <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
            </div>

            {isBuyerView && c.accessPaid && c.farmAccess && (
              <p className="mt-2 text-xs text-gray-600">
                Access fee paid: {formatGhc(c.farmAccess.amount)} ·{" "}
                {c.farmAccess.paymentMethod.replace("_", " ")}
              </p>
            )}

            {c.accessPaid && c.status === "PENDING" && !isBuyerView && !canApprove && (
              <p className="mt-2 text-xs font-medium text-amber-800">
                Payment received — awaiting ANI admin approval
              </p>
            )}
            {c.accessPaid && c.status === "PENDING" && isBuyerView && (
              <p className="mt-2 text-xs font-medium text-amber-800">
                Payment received — waiting for ANI admin to approve your connection
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {c.status === "PENDING" && canApprove && (
            <>
              <button type="button" onClick={onApprove} className="btn-primary px-4 py-2">
                Approve
              </button>
              <button
                type="button"
                onClick={onReject}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Reject
              </button>
            </>
          )}
          {c.status === "ACCEPTED" && partner && (
            <button type="button" onClick={onOpenChat} className="btn-primary px-4 py-2">
              Message
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
