"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Connection, ConnectionUser, fullName, isBuyer, isFarmer, isStaff, ROLES } from "@/lib/types";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { CountryBadge } from "@/components/CountrySelect";
import { VerificationBadge } from "@/components/VerificationBadge";

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

export default function ConnectionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);

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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-brand-900">Connections</h1>
      <p className="mb-6 text-sm text-gray-500">
        {isFarmer(user.roleId)
          ? "Buyers who requested farm access — ANI admin approves access; you'll be notified when someone requests"
          : isBuyer(user.roleId)
            ? "Farmers you requested access from — approved once ANI admin reviews"
            : user.roleId === ROLES.FARMER_HANDLER
              ? "Buyer connections for your farmer clients — view-only; ANI admin approves access"
              : user.roleId === ROLES.BUYER_HANDLER
                ? "Farmer connections for your buyer clients — see who they connected with"
                : isStaff(user.roleId)
                  ? "Pending farm access requests — approve or reject buyer connections"
                  : "Client connection requests"}
      </p>

      {connections.length === 0 ? (
        <p className="text-sm text-gray-500">No connection requests yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
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
  canApprove,
  onApprove,
  onReject,
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
}) {
  const farmName = partner && "farmName" in partner ? partner.farmName : null;
  const showPhone = !isBuyerView && partner?.phone;

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
        <ProfilePhoto
          src={partner?.profilePicture}
          name={partner?.firstName}
          size={48}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {isBuyerHandlerView ? "Farmer" : partnerRoleLabel(isBuyerView)}
          </p>
          <p className="truncate font-bold text-brand-900">
            {partner ? fullName(partner) : "Unknown"}
          </p>

          {partner?.verificationStatus && (
            <VerificationBadge status={partner.verificationStatus} className="mt-0.5" />
          )}
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

          {showPhone && (
            <a
              href={`tel:${partner.phone}`}
              className="mt-1 block text-xs font-medium text-brand-700 hover:underline"
            >
              {partner.phone}
            </a>
          )}

          {c.accessPaid && c.status === "PENDING" && !isBuyerView && !canApprove && (
            <p className="mt-2 text-xs font-medium text-amber-800">
              Payment received — awaiting ANI admin approval
            </p>
          )}
          {c.accessPaid && c.status === "PENDING" && isBuyerView && (
            <p className="mt-2 text-xs font-medium text-amber-800">
              Payment received — waiting for ANI admin approval
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(c.status)}`}>
            {statusLabel(c.status)}
          </span>

          {c.status === "PENDING" && canApprove && (
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={onApprove} className="btn-primary px-3 py-1.5 text-xs">
                Approve
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
