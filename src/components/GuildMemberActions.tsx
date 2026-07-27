"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  guildId: string;
  targetUserId: string;
  currentRole: string;
  ownerId: string;
  viewerRole: string;
}

export function GuildMemberActions({ guildId, targetUserId, currentRole, ownerId, viewerRole }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (viewerRole !== "owner" || targetUserId === ownerId) return null;

  async function setRole(role: string) {
    setLoading(true);
    await supabase.from("guild_members").update({ role }).eq("guild_id", guildId).eq("user_id", targetUserId);
    router.refresh();
    setLoading(false);
  }

  async function kick() {
    if (!confirm("Remove this member from the guild?")) return;
    setLoading(true);
    await supabase.from("guild_members").delete().eq("guild_id", guildId).eq("user_id", targetUserId);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex gap-1 ml-auto">
      {currentRole === "member" && (
        <button
          onClick={() => setRole("mod")}
          disabled={loading}
          className="text-xs px-2 py-0.5 rounded cursor-pointer"
          style={{ backgroundColor: "rgba(94,176,255,0.15)", color: "#5eb0ff" }}
        >
          + Mod
        </button>
      )}
      {currentRole === "mod" && (
        <button
          onClick={() => setRole("member")}
          disabled={loading}
          className="text-xs px-2 py-0.5 rounded cursor-pointer"
          style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
        >
          – Mod
        </button>
      )}
      <button
        onClick={kick}
        disabled={loading}
        className="text-xs px-2 py-0.5 rounded cursor-pointer"
        style={{ backgroundColor: "rgba(255,92,92,0.12)", color: "var(--destructive)" }}
      >
        Kick
      </button>
    </div>
  );
}
