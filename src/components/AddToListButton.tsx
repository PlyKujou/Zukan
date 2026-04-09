"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ListStatus = "watching" | "completed" | "plan_to_watch" | "on_hold" | "dropped";

const STATUS_LABELS: Record<ListStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  plan_to_watch: "Plan to Watch",
  on_hold: "On Hold",
  dropped: "Dropped",
};

interface Props {
  malId: number;
  title: string;
  imageUrl: string;
  episodes: number | null;
}

export function AddToListButton({ malId, title, imageUrl, episodes }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<{ status: ListStatus; rating: number | null; progress: number } | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        supabase
          .from("list_entries")
          .select("status, rating, progress")
          .eq("user_id", data.user.id)
          .eq("mal_id", malId)
          .maybeSingle()
          .then(({ data: entry }) => {
            if (entry) {
              setCurrent(entry as { status: ListStatus; rating: number | null; progress: number });
              setRating(entry.rating);
              setProgress(entry.progress ?? 0);
            }
          });
      }
    });
  }, [malId]);

  async function save(status: ListStatus) {
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    setSaving(true);
    await supabase.from("list_entries").upsert({
      user_id: userId,
      mal_id: malId,
      title,
      image_url: imageUrl,
      episodes,
      status,
      rating,
      progress,
    }, { onConflict: "user_id,mal_id" });
    setCurrent({ status, rating, progress });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!userId) return;
    setSaving(true);
    await supabase.from("list_entries").delete().eq("user_id", userId).eq("mal_id", malId);
    setCurrent(null);
    setRating(null);
    setProgress(0);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors cursor-pointer"
        style={{ backgroundColor: current ? "var(--surface-2)" : "var(--accent)" }}
      >
        {current ? `${STATUS_LABELS[current.status]} ▾` : "+ Add to List"}
      </button>

      {open && (
        <div
          className="absolute left-0 mt-2 w-64 rounded-lg shadow-xl z-50 p-4 space-y-3"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Status
          </p>
          <div className="grid grid-cols-1 gap-1">
            {(Object.keys(STATUS_LABELS) as ListStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => save(s)}
                disabled={saving}
                className="text-left px-3 py-1.5 rounded text-sm transition-colors cursor-pointer"
                style={{
                  backgroundColor: current?.status === s ? "var(--accent)" : "transparent",
                  color: current?.status === s ? "#fff" : "var(--text)",
                }}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
              Rating (1–10)
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={rating ?? ""}
              onChange={(e) => setRating(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-2 py-1 rounded text-sm"
              style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>

          {episodes && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                Progress ({progress}/{episodes})
              </label>
              <input
                type="range"
                min={0}
                max={episodes}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {current && (
            <button
              onClick={remove}
              disabled={saving}
              className="w-full text-center text-xs py-1 rounded transition-colors cursor-pointer"
              style={{ color: "#f87171" }}
            >
              Remove from list
            </button>
          )}
        </div>
      )}
    </div>
  );
}
