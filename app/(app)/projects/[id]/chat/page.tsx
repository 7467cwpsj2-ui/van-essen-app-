import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/ChatPanel";
import { sendChatMessage } from "@/lib/actions/chat";
import type { ChatMessage } from "@/types/database";

export default async function ChatPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "chat")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <ChatPanel
      currentUserId={current.id}
      messages={(messages ?? []) as ChatMessage[]}
      onSend={sendChatMessage.bind(null, params.id)}
      projectId={params.id}
      realtimeTable="chat_messages"
    />
  );
}
