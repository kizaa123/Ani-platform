"use client";

import { useEffect } from "react";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { ConnectionChatPanel } from "@/components/ConnectionChatPanel";
import type { UserVerificationTag } from "@/lib/types";

interface ConnectionChatModalProps {
  partnerId: string;
  partnerName: string;
  partnerPhoto?: string | null;
  partnerVerificationStatus?: string | null;
  partnerVerificationTags?: UserVerificationTag[];
  currentUserId: string;
  onClose: () => void;
}

export function ConnectionChatModal({
  partnerId,
  partnerName,
  partnerPhoto,
  partnerVerificationStatus,
  partnerVerificationTags,
  currentUserId,
  onClose,
}: ConnectionChatModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connection-chat-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarWithVerification
              src={partnerPhoto}
              name={partnerName}
              size={48}
              verificationStatus={partnerVerificationStatus}
              verificationTags={partnerVerificationTags}
            />
            <div className="min-w-0">
              <h2 id="connection-chat-title" className="truncate text-lg font-bold text-brand-900">
                Message {partnerName}
              </h2>
              <p className="text-xs text-gray-500">Connection chat</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <ConnectionChatPanel
            embedded
            partnerId={partnerId}
            partnerName={partnerName}
            partnerPhoto={partnerPhoto}
            partnerVerificationStatus={partnerVerificationStatus}
            partnerVerificationTags={partnerVerificationTags}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </div>
  );
}
