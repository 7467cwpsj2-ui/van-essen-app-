import { notFound } from "next/navigation";
import { canSeePrivateChat, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/ChatPanel";
import { sendPrivateMessage } from "@/lib/actions/chat";
import type { OwnerClientMessage } from "@/types/database";

export default async function PrivateChatPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeePrivateChat(current)) notFound();

  const supabase = createClient();
  const { data: messages } = await supabase
    .from("owner_client_messages")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: true });

  const rows = (messages ?? []) as OwnerClientMessage[];
  const withFiles = await Promise.all(
    rows.map(async (m) => {
      let fileUrl: string | null = null;
      if (m.file_path) {
        const { data } = await supabase.storage.from("project-files").createSignedUrl(m.file_path, 3600);
        fileUrl = data?.signedUrl ?? null;
      }
      return { id: m.id, author_name: m.author_name, author_id: m.author_id, text: m.text, created_at: m.created_at, fileUrl, fileType: m.file_type };
    })
  );

  const hint =
    current.profile.role === "eigenaar"
      ? "Privégesprek tussen jou en de klant — je team ziet dit nooit."
      : "Privégesprek tussen jou en Van Essen Bouw & Onderhoud — hun team ziet dit nooit.";

  return (
    <ChatPanel
      currentUserId={current.id}
      messages={withFiles}
      onSend={sendPrivateMessage.bind(null, params.id)}
      hint={hint}
      isPrivate
      allowAttachments
      projectId={params.id}
      realtimeTable="owner_client_messages"
    />
  );
}
