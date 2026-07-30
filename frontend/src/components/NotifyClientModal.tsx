"use client";

import { useEffect, useState } from "react";
import { AvatarWithVerification } from "@/components/AvatarWithVerification";
import { Icon } from "@/components/icons";
import { fullName, type FarmClient } from "@/lib/types";

const DEFAULT_MESSAGE = "Farm products are available, please access my farm";

interface NotifyClientModalProps {
  client: FarmClient;
  onClose: () => void;
  onSend: (message: string) => Promise<void>;
}

export function NotifyClientModal({ client, onClose, onSend }: NotifyClientModalProps) {
  const [useCustom, setUseCustom] = useState(false);
  const [customMessage, setCustomMessage] = useState(DEFAULT_MESSAGE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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

  const handleSend = async () => {
    setBusy(true);
    setError(null);
    try {
      const message = useCustom ? customMessage.trim() : DEFAULT_MESSAGE;
      if (!message) {
        setError("Message cannot be empty.");
        return;
      }
      await onSend(message);
      setSent(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send notification");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notify-client-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarWithVerification
              src={client.profilePicture}
              name={client.firstName}
              size={64}
              verificationStatus={client.verificationStatus}
              verificationTags={client.verificationTags}
            />
            <div className="min-w-0">
              <h2 id="notify-client-title" className="truncate text-lg font-bold text-brand-900">
                Notify {fullName(client)}
              </h2>
              <p className="text-xs text-gray-500">{client.roleLabel}</p>
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

        <div className="space-y-4 p-5">
          {sent ? (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              Notification sent successfully.
            </p>
          ) : (
            <>
              <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3">
                <p className="text-sm text-brand-900">{DEFAULT_MESSAGE}</p>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={useCustom}
                  onChange={(e) => setUseCustom(e.target.checked)}
                  className="rounded border-brand-300 text-brand-700 focus:ring-brand-500"
                />
                Use custom message
              </label>

              {useCustom && (
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Write your message..."
                  className="w-full rounded-xl border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              )}

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </>
          )}
        </div>

        {!sent && (
          <div className="flex justify-end border-t border-brand-100 px-5 py-4">
            <button
              type="button"
              onClick={handleSend}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
            >
              <Icon name="send" className="h-4 w-4" />
              {busy ? "Sending…" : "Send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
