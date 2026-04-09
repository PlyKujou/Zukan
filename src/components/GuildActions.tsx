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
        className="px-3 py-1.5 rounded-lg text-xs font-bold"
        style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-dim-border)" }}
      >
        Owner
      </span>
    );
  }

  if (isMember) {
    return (
      <button
        onClick={leave}
        disabled={loading}
        className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
        style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        {loading ? "…" : "Leave"}
      </button>
    );
  }

  return (
    <button
      onClick={join}
      disabled={loading}
      className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
      style={{ backgroundColor: "var(--accent)" }}
    >
      {loading ? "…" : "Join Guild"}
    </button>
  );
}
