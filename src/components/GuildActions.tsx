"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  guildId: string;
  isMember: boolean;
  isOwner: boolean;
  userId: string;
}

export function GuildActions({ guildId, isMember, isOwner, userId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function join() {
    setLoading(true);
    await supabase.from("guild_members").insert({ guild_id: guildId, user_id: userId, role: "member" });
    router.refresh();
    setLoading(false);
  }

  async function leave() {
    setLoading(true);
    await supabase.from("guild_members").delete().eq("guild_id", guildId).eq("user_id", userId);
    router.refresh();
    setLoading(false);
  }

  if (isOwner) {
    return (
      <span
        className="eyebrow px-3 py-1.5 rounded-lg"
        style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-dim-border)" }}
      >
        Owner
      </span>
    );
  }

  if (isMember) {
    return (
      <button onClick={leave} disabled={loading} className="btn btn-ghost">
        {loading ? "…" : "Leave"}
      </button>
    );
  }

  return (
    <button onClick={join} disabled={loading} className="btn btn-primary">
      {loading ? "…" : "Join Guild"}
    </button>
  );
}
