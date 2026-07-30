"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Connection, ConnectionUser, fullName, isBuyer, isFarmer, isStaff, isMarketplaceBuyer, isResearcher, isHandler, ROLES } from "@/lib/types";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { CountryBadge } from "@/components/CountrySelect";

function canModerateConnection(roleId: number) {
  return isStaff(roleId);
}

function showConnectionStatusBadge(status: string, partner?: ConnectionUser) {
  if (status === "PENDING" && partner?.verificationStatus !== "VERIFIED") {
    return false;
  }
  return true;
}

function statusLabel(status: string) {
  switch (status) {
    case "ACCEPTED":
      return "Accepted";
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

export default function ConnectionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);

  const load = () => api.connections.list().then(setConnections).catch(console.error);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && isResearcher(user.roleId)) router.push("/dashboard");
    if (user && isHandler(user.roleId)) router.push("/dashboard");
    if (user && !isResearcher(user.roleId) && !isHandler(user.roleId)) load();
  }, [user?.id, loading, router]);

  const updateStatus = async (id: string, status: string) => {
    await api.connections.updateStatus(id, status);
    load();
  };

  if (loading || !user) return <div className="p-12 text-center">Loading...</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-brand-900">Connections</h1>
      <p className="mb-6 text-sm text-gray-500">
        {isFarmer(user.roleId)
          ? "Buyers who requested farm access — ANI admin approves access; you'll be notified when someone requests"
          : isMarketplaceBuyer(user.roleId)
            ? "Farmers you requested access from — approved once ANI admin reviews"
            : user.roleId === ROLES.FARMER_HANDLER
              ? "Buyer connections for your farmer clients — view-only; ANI admin approves access"
              : user.roleId === ROLES.BUYER_HANDLER
                ? "Farmer connections for your buyer clients — see who they connected with"
                : isStaff(user.roleId)
                  ? "Pending farm access requests — accept or reject buyer connections"
                  : "Client connection requests"}
      </p>

      {connections.length === 0 ? (
        <p className="text-sm text-gray-500">No connection requests yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {connections.map((c) => {
            const isBuyerView = isMarketplaceBuyer(user.roleId);
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
                canModerate={canModerateConnection(user.roleId)}
                onAccept={() => updateStatus(c.id, "ACCEPTED")}
                onReject={() => updateStatus(c.id, "REJECTED")}
              />
            );
          })}
        </div>
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
  canModerate,
  onAccept,
  onReject,
}: {
  connection: Connection;
  partner?: ConnectionUser;
  farmerClient?: ConnectionUser;
  buyerClient?: ConnectionUser;
  isBuyerView: boolean;
  isHandlerView?: boolean;
  isBuyerHandlerView?: boolean;
  canModerate: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const farmName = partner && "farmName" in partner ? partner.farmName : null;
  const showPendingConnectionUi =
    c.status === "PENDING" && partner?.verificationStatus === "VERIFIED";

  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
      {isHandlerView && farmerClient && (
        <div className="mb-3 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
            Farmer client
          </p>
          <p className="text-sm font-bold text-brand-900">{fullName(farmerClient)}</p>
          {farmerClient.farmName && (
            <p className="text-xs font-medium text-brand-700">{farmerClient.farmName}</p>
          )}
        </div>
      )}

      {isBuyerHandlerView && buyerClient && (
        <div className="mb-3 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
            Buyer client
          </p>
          <p className="text-sm font-bold text-brand-900">{fullName(buyerClient)}</p>
        </div>
      )}

      <div className="flex items-start gap-3">
        <AvatarWithVerification
          src={partner?.profilePicture}
          name={partner?.firstName}
          size={56}
          verificationStatus={partner?.verificationStatus}
          verificationTags={partner?.verificationTags}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {isBuyerHandlerView ? "Farmer" : partnerRoleLabel(isBuyerView)}
          </p>
          <p className="truncate font-bold text-brand-900">
            {partner ? fullName(partner) : "Unknown"}
          </p>

          {farmName && (
            <p className="mt-0.5 truncate text-xs font-medium text-brand-700">{farmName}</p>
          )}
          {partner && (
            <CountryBadge
              country={partner.country}
              region={partner.region}
              className="mt-1"
            />
          )}
          {partner?.city && (
            <p className="mt-0.5 text-xs text-gray-500">{partner.city}</p>
          )}

          {c.accessPaid && showPendingConnectionUi && !isBuyerView && !canModerate && (
            <p className="mt-2 text-xs font-medium text-amber-800">
              Payment received — awaiting ANI admin review
            </p>
          )}
          {c.accessPaid && showPendingConnectionUi && isBuyerView && (
            <p className="mt-2 text-xs font-medium text-amber-800">
              Payment received — waiting for ANI admin review
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {showConnectionStatusBadge(c.status, partner) && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(c.status)}`}>
              {statusLabel(c.status)}
            </span>
          )}

          {c.status === "PENDING" && canModerate && (
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={onAccept} className="btn-primary px-3 py-1.5 text-xs">
                Accept
              </button>
              <button
                type="button"
                onClick={onReject}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
