"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MediaType } from "@/lib/anilist";
import { type ListStatus, getStatusLabels } from "@/lib/listStatus";

interface Props {
  malId: number;
  title: string;
  imageUrl: string;
  episodes: number | null;
  mediaType?: MediaType;
}

export function AddToListButton({ malId, title, imageUrl, episodes, mediaType = "anime" }: Props) {
  const isManga = mediaType === "manga";
  const unitWord = isManga ? "chapters" : "episodes";
  const STATUS_LABELS = getStatusLabels(mediaType);
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
          .eq("media_type", mediaType)
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
  }, [malId, mediaType]);

  async function save(status: ListStatus) {
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    setSaving(true);
    const effectiveProgress = status === "completed" && episodes ? episodes : progress;
    await supabase.from("list_entries").upsert({
      user_id: userId,
      mal_id: malId,
      media_type: mediaType,
      title,
      image_url: imageUrl,
      episodes,
      status,
      rating,
      progress: effectiveProgress,
    }, { onConflict: "user_id,mal_id,media_type" });
    setProgress(effectiveProgress);
    setCurrent({ status, rating, progress: effectiveProgress });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!userId) return;
    setSaving(true);
    await supabase.from("list_entries").delete().eq("user_id", userId).eq("mal_id", malId).eq("media_type", mediaType);
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
        className={current ? "btn btn-secondary" : "btn btn-primary"}
      >
        {current ? (
          <>
            {STATUS_LABELS[current.status]}
            <ChevronDown size={14} strokeWidth={2.5} />
          </>
        ) : (
          <>
            <Plus size={14} strokeWidth={2.5} />
            Add to List
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 mt-2 w-64 rounded-2xl z-50 p-4 space-y-3 origin-top-left"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.55)",
            }}
          >
            <p className="eyebrow">Status</p>
            <div className="grid grid-cols-1 gap-1">
              {(Object.keys(STATUS_LABELS) as ListStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => save(s)}
                  disabled={saving}
                  className="text-left px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer hover:bg-[var(--surface)]"
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
              <label className="eyebrow block mb-1.5">Rating (1–10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={rating ?? ""}
                onChange={(e) => setRating(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-2.5 py-1.5 text-sm font-mono-nums"
                style={{ backgroundColor: "var(--surface)" }}
              />
            </div>

            {episodes && (
              <div>
                <label className="eyebrow block mb-1.5">
                  Progress ({progress}/{episodes} {unitWord})
                </label>
                <input
                  type="range"
                  min={0}
                  max={episodes}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: "var(--accent)" }}
                />
              </div>
            )}

            {current && (
              <button
                onClick={remove}
                disabled={saving}
                className="w-full text-center text-xs py-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--surface)]"
                style={{ color: "var(--destructive)" }}
              >
                Remove from list
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
