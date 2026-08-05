"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";

export interface ChatItem {
  id: string;
  author_name: string | null;
  author_id: string | null;
  text: string;
  created_at: string;
}

export function ChatPanel({
  currentUserId,
  messages,
  onSend,
  hint,
}: {
  currentUserId: string;
  messages: ChatItem[];
  onSend: (text: string) => Promise<void>;
  hint?: string;
}) {
  const [text, setText] = useState("");
  const [, startTransition] = useTransition();

  const send = () => {
    if (!text.trim()) return;
    const value = text;
    setText("");
    startTransition(() => {
      onSend(value).catch((err) => alert(err instanceof Error ? err.message : "Versturen mislukt."));
    });
  };

  return (
    <div className="panel">
      {hint && <div className="hint-bar">{hint}</div>}
      {messages.length === 0 && <div className="empty-hint">Nog geen berichten.</div>}
      <div className="chat-list">
        {messages.map((m) => (
          <div key={m.id} className={"chat-msg" + (m.author_id === currentUserId ? " mine" : "")}>
            <div className="chat-msg-top">
              <span className="chat-author">{m.author_name || "—"}</span>
              <span className="mono chat-date">{new Date(m.created_at).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="chat-text">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          placeholder="Typ een bericht…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn-primary" onClick={send}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
