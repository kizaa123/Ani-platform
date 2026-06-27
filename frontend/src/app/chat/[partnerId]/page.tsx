"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { Message, fullName } from "@/lib/types";

export default function ChatPage() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => api.messages.conversation(partnerId).then(setMessages).catch(console.error);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) load();
  }, [user?.id, loading, router, partnerId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    await api.messages.send(partnerId, text);
    setText("");
    load();
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-6" style={{ height: "calc(100vh - 200px)" }}>
      <h1 className="mb-4 text-xl font-bold text-brand-900">Chat</h1>
      <div className="flex-1 overflow-y-auto rounded-2xl border border-brand-100 bg-white p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === user?.id ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
              m.senderId === user?.id ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-900"
            }`}>
              <p className="text-xs opacity-70 mb-1">{fullName(m.sender)}</p>
              {m.message}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="mt-4 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..." className="flex-1 rounded-xl border px-4 py-3 focus:border-brand-500 focus:outline-none" />
        <button onClick={send} className="rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white">Send</button>
      </div>
    </div>
  );
}
