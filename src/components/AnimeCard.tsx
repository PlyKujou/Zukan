"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { JikanAnime } from "@/lib/jikan";
import { Plus, Check } from "lucide-react";

type ListStatus = "watching" | "completed" | "plan_to_watch" | "on_hold" | "dropped";

const STATUS_LABELS: Record<ListStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  plan_to_watch: "Plan to Watch",
  on_hold: "On Hold",
  dropped: "Dropped",
};

const STATUS_COLORS: Record<ListStatus, string> = {
  watching: "#f43f5e",
  completed: "#22c55e",
  plan_to_watch: "#60a5fa",
  on_hold: "#facc15",
  dropped: "#f87171",
};

interface Props {
  anime: JikanAnime;
  showGenres?: boolean;
  zukanRating?: string | null;
}

export function AnimeCard({ anime, showGenres = false, zukanRating }: Props) {
  const title = anime.title_english || anime.title;
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ListStatus | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  async function openMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!loaded) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from("list_entries")
          .select("status")
          .eq("user_id", user.id)
          .eq("mal_id", anime.mal_id)
          .maybeSingle();
        setStatus((data?.status as ListStatus) ?? null);
      }
      setLoaded(true);
    }
    setOpen((o) => !o);
  }

  async function pick(s: ListStatus) {
    if (!userId) { window.location.href = "/login"; return; }
    setSaving(true);
    await supabase.from("list_entries").upsert({
      user_id: userId,
      mal_id: anime.mal_id,
      title,
      image_url: anime.images.jpg.image_url,
      episodes: anime.episodes,
      status: s,
      progress: 0,
    }, { onConflict: "user_id,mal_id" });
    setStatus(s);
    setSaving(false);
    setOpen(false);
  }

  async function remove() {
    if (!userId) return;
    setSaving(true);
    await supabase.from("list_entries").delete().eq("user_id", userId).eq("mal_id", anime.mal_id);
    setStatus(null);
    setSaving(false);
    setOpen(false);
  }

  return (
    <div ref={ref} className="group relative block">
      <Link href={`/anime/${anime.mal_id}`}>
        <div
          className="rounded-lg overflow-hidden transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <div className="relative w-full aspect-[2/3]">
            <Image
              src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />

            {/* Score badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
              {anime.score && (
                <div className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                  ★ {anime.score}
                </div>
              )}
              <div className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(0,0,0,0.65)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}>
                Z {zukanRating ?? "—"}
              </div>
            </div>

            {/* Status dot (always visible if in list) */}
            {status && (
              <div
                className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status], boxShadow: `0 0 6px ${STATUS_COLORS[status]}` }}
              />
            )}

            {/* Quick-add button — visible on hover */}
            <button
              onClick={openMenu}
              className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center rounded-full text-white text-sm font-bold cursor-pointer"
              style={{
                width: 28, height: 28,
                backgroundColor: status ? STATUS_COLORS[status] : "var(--accent)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                transform: open ? "scale(1.1)" : "scale(1)",
              }}
            >
              {status ? <Check size={13} strokeWidth={3} /> : <Plus size={13} strokeWidth={3} />}
            </button>
          </div>

          <div className="p-2">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{title}</p>
            {status ? (
              <p className="text-xs mt-0.5 font-medium" style={{ color: STATUS_COLORS[status] }}>
                {STATUS_LABELS[status]}
              </p>
            ) : anime.episodes ? (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{anime.episodes} eps</p>
            ) : null}
            {showGenres && anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {anime.genres.slice(0, 2).map((g) => (
                  <span key={g.mal_id} className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}>
                    {g.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Quick-add dropdown */}
      {open && (
        <div
          className="modal-enter absolute bottom-12 left-0 z-50 rounded-xl p-2 min-w-[160px]"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {!loaded || saving ? (
            <p className="text-xs px-2 py-1" style={{ color: "var(--text-muted)" }}>Loading…</p>
          ) : (
            <>
              {(Object.keys(STATUS_LABELS) as ListStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={(e) => { e.stopPropagation(); pick(s); }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 cursor-pointer transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: status === s ? "var(--surface-2)" : "transparent",
                    color: status === s ? STATUS_COLORS[s] : "var(--text)",
                    fontWeight: status === s ? 700 : 400,
                  }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[s] }} />
                  {STATUS_LABELS[s]}
                  {status === s && <Check size={12} strokeWidth={3} className="ml-auto" />}
                </button>
              ))}
              {status && (
                <>
                  <div className="my-1.5 h-px" style={{ backgroundColor: "var(--border)" }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                    style={{ color: "#f87171" }}
                  >
                    Remove from list
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
