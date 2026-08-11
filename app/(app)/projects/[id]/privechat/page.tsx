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

  const hint =
    current.profile.role === "eigenaar"
      ? "Privégesprek tussen jou en de klant — je team ziet dit nooit."
      : "Privégesprek tussen jou en Van Essen Bouw & Onderhoud — hun team ziet dit nooit.";

  return (
    <ChatPanel
      currentUserId={current.id}
      messages={(messages ?? []) as OwnerClientMessage[]}
      onSend={sendPrivateMessage.bind(null, params.id)}
      hint={hint}
      isPrivate
      projectId={params.id}
      realtimeTable="owner_client_messages"
    />
  );
}
