"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  entryId: string;
  malId: number;
  userId: string;
  initialProgress: number;
  episodes: number | null;
}

export function IncrementEpisodeButton({ entryId, malId, userId, initialProgress, episodes }: Props) {
  const supabase = createClient();
  const [progress, setProgress] = useState(initialProgress);
  const [saving, setSaving] = useState(false);

  async function increment(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    const next = progress + 1;
    setProgress(next);
    setSaving(true);
    await supabase
      .from("list_entries")
      .update({ progress: next, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("mal_id", malId);
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {progress}{episodes ? `/${episodes}` : ""} ep{progress !== 1 ? "s" : ""}
      </span>
      <button
        onClick={increment}
        disabled={saving || (episodes !== null && progress >= (episodes ?? Infinity))}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 hover:opacity-80 disabled:opacity-40 disabled:cursor-default"
        style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-dim-border)" }}
        title="Mark one episode watched"
      >
        +1 ep
      </button>
    </div>
  );
}
