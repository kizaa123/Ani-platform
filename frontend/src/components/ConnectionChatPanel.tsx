"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Message, fullName } from "@/lib/types";
import { ProfilePhoto } from "@/components/FarmerAvatar";

interface ConnectionChatPanelProps {
  partnerId: string;
  partnerName: string;
  partnerPhoto?: string | null;
  currentUserId: string;
  embedded?: boolean;
}

export function ConnectionChatPanel({
  partnerId,
  partnerName,
  partnerPhoto,
  currentUserId,
  embedded = false,
}: ConnectionChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () =>
    api.messages
      .conversation(partnerId)
      .then(setMessages)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load messages"));

  useEffect(() => {
    load();
  }, [partnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await api.messages.send(partnerId, text.trim());
      setText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={embedded ? "" : "mt-4 border-t border-brand-100 pt-4"}>
      {!embedded && (
        <div className="mb-3 flex items-center gap-3">
          <ProfilePhoto src={partnerPhoto} name={partnerName} size={44} />
          <p className="text-sm font-semibold text-brand-900">Chat with {partnerName}</p>
        </div>
      )}

      <div
        className={`overflow-y-auto rounded-xl border border-brand-100 bg-brand-50/30 p-3 space-y-2 ${
          embedded ? "max-h-[50vh] min-h-[240px]" : "max-h-64"
        }`}
      >
        {messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.senderId === currentUserId ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.senderId === currentUserId
                    ? "bg-brand-700 text-white"
                    : "bg-white text-brand-900 border border-brand-100"
                }`}
              >
                <p className="mb-0.5 text-[10px] opacity-70">{fullName(m.sender)}</p>
                {m.message}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !text.trim()}
          className="btn-primary px-4 py-2 disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  );
}
