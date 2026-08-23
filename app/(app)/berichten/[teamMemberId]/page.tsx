import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DirectMessagePanel } from "@/components/DirectMessagePanel";
import { markDirectMessagesRead, sendDirectMessage } from "@/lib/actions/directMessages";
import type { DirectMessage } from "@/types/database";

const MEMBER_TYPE_LABEL: Record<string, string> = {
  personeel: "eigen personeel",
  onderaannemer: "onderaannemer",
};

export default async function DirectMessagePage({ params }: { params: { teamMemberId: string } }) {
  const current = await requireUser();

  if (current.profile.role === "klant") redirect("/dashboard");
  if (current.profile.role === "team" && current.profile.team_member_id !== params.teamMemberId) {
    redirect(current.profile.team_member_id ? `/berichten/${current.profile.team_member_id}` : "/dashboard");
  }

  const supabase = createClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("id,name,member_type,trade")
    .eq("id", params.teamMemberId)
    .maybeSingle();
  if (!member) notFound();

  const { data: messages } = await supabase
    .from("direct_messages")
    .select("*")
    .eq("team_member_id", params.teamMemberId)
    .order("created_at", { ascending: true });

  const rows = (messages ?? []) as DirectMessage[];
  const withFiles = await Promise.all(
    rows.map(async (m) => {
      let fileUrl: string | null = null;
      if (m.file_path) {
        const { data } = await supabase.storage.from("team-messages").createSignedUrl(m.file_path, 3600);
        fileUrl = data?.signedUrl ?? null;
      }
      return {
        id: m.id,
        author_name: m.author_name,
        author_id: m.author_id,
        text: m.text,
        created_at: m.created_at,
        fileUrl,
        fileType: m.file_type,
      };
    })
  );

  await markDirectMessagesRead(params.teamMemberId);

  return (
    <div>
      <div className="header-eyebrow">
        <Link href="/berichten" className="link-btn">
          Berichten
        </Link>{" "}
        · {MEMBER_TYPE_LABEL[member.member_type] ?? member.member_type}
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, margin: "0 0 12px", textTransform: "uppercase" }}>
        {member.name}
      </h1>
      <DirectMessagePanel
        currentUserId={current.id}
        teamMemberId={params.teamMemberId}
        messages={withFiles}
        onSend={sendDirectMessage.bind(null, params.teamMemberId)}
      />
    </div>
  );
}
