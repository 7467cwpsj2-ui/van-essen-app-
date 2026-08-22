"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Lock, Paperclip, Send } from "lucide-react";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { FileCaptureButtons } from "@/components/FileCaptureButtons";
import { FilePreview } from "@/components/FilePreview";
import { Lightbox } from "@/components/Lightbox";
import { processUploadedFile } from "@/lib/fileProcessing";
import { createClient } from "@/lib/supabase/client";

export interface ChatItem {
  id: string;
  author_name: string | null;
  author_id: string | null;
  text: string;
  created_at: string;
  fileUrl?: string | null;
  fileType?: "image" | "pdf" | null;
}

export function ChatPanel({
  currentUserId,
  messages,
  onSend,
  hint,
  isPrivate,
  allowAttachments,
  projectId,
  realtimeTable,
}: {
  currentUserId: string;
  messages: ChatItem[];
  onSend: (text: string, file?: { path: string; type: "image" | "pdf" } | null) => Promise<void>;
  hint?: string;
  isPrivate?: boolean;
  allowAttachments?: boolean;
  projectId: string;
  realtimeTable: string;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<{ blob: Blob; fileType: "image" | "pdf"; fileName: string; previewUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useRealtimeRefresh(realtimeTable, projectId);

  const handlePicked = async (file: File) => {
    setBusy(true);
    try {
      const result = await processUploadedFile(file);
      setPending(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verwerken mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!text.trim() && !pending) return;
    const value = text;
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setBusy(true);
    try {
      let file: { path: string; type: "image" | "pdf" } | null = null;
      if (pending) {
        const supabase = createClient();
        const ext = pending.fileName.split(".").pop() || (pending.fileType === "pdf" ? "pdf" : "jpg");
        const path = `${projectId}/privechat/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("project-files").upload(path, pending.blob, {
          contentType: pending.fileType === "pdf" ? "application/pdf" : "image/jpeg",
        });
        if (uploadError) throw new Error(uploadError.message);
        file = { path, type: pending.fileType };
      }
      setPending(null);
      await onSend(value, file);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Versturen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <Lightbox src={preview} onClose={() => setPreview(null)} />
      {hint && (
        <div className={"hint-bar" + (isPrivate ? " hint-private" : "")}>
          {isPrivate && <Lock size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />}
          {hint}
        </div>
      )}
      {messages.length === 0 && <div className="empty-hint">Nog geen berichten.</div>}
      <div className="chat-list">
        {messages.map((m) => (
          <div key={m.id} className={"chat-msg" + (m.author_id === currentUserId ? " mine" : "")}>
            <div className="chat-msg-top">
              <span className="chat-author">{m.author_name || "—"}</span>
              <span className="mono chat-date">{new Date(m.created_at).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            {m.fileUrl &&
              (m.fileType === "pdf" ? (
                <a href={m.fileUrl} target="_blank" rel="noreferrer" className="chat-attachment-link">
                  <FileText size={13} /> Bestand openen
                </a>
              ) : (
                <button type="button" className="thumb-btn" onClick={() => setPreview(m.fileUrl ?? null)}>
                  <img src={m.fileUrl} alt="" className="chat-attachment-thumb" />
                </button>
              ))}
            {m.text && <div className="chat-text">{m.text}</div>}
          </div>
        ))}
      </div>
      {allowAttachments && pending && (
        <FilePreview
          previewUrl={pending.previewUrl}
          fileType={pending.fileType}
          fileName={pending.fileName}
          onClear={() => setPending(null)}
        />
      )}
      <div className="chat-input-row">
        {allowAttachments && (
          <FileCaptureButtons
            accept="image/*,application/pdf"
            onPicked={handlePicked}
            busy={busy}
            variant="icon"
          />
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Typ een bericht…"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            resizeTextarea(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn-primary" onClick={send} disabled={busy || (!text.trim() && !pending)}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
