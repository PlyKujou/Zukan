"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { JikanAnime } from "@/lib/anilist";
import { Plus, Check, Star } from "lucide-react";
import { type ListStatus, STATUS_COLORS, getStatusLabels } from "@/lib/listStatus";

interface Props {
  anime: JikanAnime;
  showGenres?: boolean;
  zukanRating?: string | null;
}

export function AnimeCard({ anime, showGenres = false, zukanRating }: Props) {
  const title = anime.title_english || anime.title;
  const mediaType = anime.mediaType ?? "anime";
  const isManga = mediaType === "manga";
  const href = `/${isManga ? "manga" : "anime"}/${anime.mal_id}`;
  const totalUnits = isManga ? anime.chapters : anime.episodes;
  const STATUS_LABELS = getStatusLabels(mediaType);
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ListStatus | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
          .eq("media_type", mediaType)
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
      media_type: mediaType,
      title,
      image_url: anime.images.jpg.image_url,
      episodes: totalUnits,
      status: s,
      progress: 0,
    }, { onConflict: "user_id,mal_id,media_type" });
    setStatus(s);
    setSaving(false);
    setOpen(false);
  }

  async function remove() {
    if (!userId) return;
    setSaving(true);
    await supabase.from("list_entries").delete().eq("user_id", userId).eq("mal_id", anime.mal_id).eq("media_type", mediaType);
    setStatus(null);
    setSaving(false);
    setOpen(false);
  }

  return (
    <div ref={ref} className="group relative block">
      <Link href={href}>
        <div
          className="rounded-xl overflow-hidden transition-transform duration-200 ease-out group-hover:-translate-y-1"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="relative w-full aspect-[2/3]">
            <Image
              src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />

            {/* Score badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
              {anime.score && (
                <div
                  className="flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-md font-mono-nums"
                  style={{ backgroundColor: "rgba(11,9,8,0.8)", color: "var(--accent-2)", backdropFilter: "blur(4px)" }}
                >
                  <Star size={10} fill="currentColor" strokeWidth={0} />
                  {anime.score}
                </div>
              )}
              <div
                className="text-xs font-bold px-1.5 py-0.5 rounded-md font-mono-nums"
                style={{ backgroundColor: "rgba(11,9,8,0.8)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(4px)" }}
              >
                Z {zukanRating ?? "—"}
              </div>
            </div>

            {/* Status dot (always visible if in list) */}
            {status && (
              <div
                className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status], boxShadow: `0 0 8px ${STATUS_COLORS[status]}` }}
              />
            )}

            {/* Quick-add button — visible on hover */}
            <button
              onClick={openMenu}
              className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-[0.85] flex items-center justify-center rounded-full text-white cursor-pointer"
              style={{
                width: 28, height: 28,
                backgroundColor: status ? STATUS_COLORS[status] : "var(--accent)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              {status ? <Check size={13} strokeWidth={3} /> : <Plus size={13} strokeWidth={3} />}
            </button>
          </div>

          <div className="p-2.5">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{title}</p>
            {status ? (
              <p className="text-xs mt-0.5 font-semibold" style={{ color: STATUS_COLORS[status] }}>
                {STATUS_LABELS[status]}
              </p>
            ) : totalUnits ? (
              <p className="text-xs mt-0.5 font-mono-nums" style={{ color: "var(--text-muted)" }}>{totalUnits} {isManga ? "ch" : "eps"}</p>
            ) : null}
            {showGenres && anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {anime.genres.slice(0, 2).map((g) => (
                  <span
                    key={g.mal_id}
                    className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-medium"
                    style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Quick-add dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-12 left-0 z-50 rounded-2xl p-2 min-w-[168px] origin-bottom-left"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
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
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 cursor-pointer transition-colors hover:bg-[var(--surface)]"
                    style={{
                      backgroundColor: status === s ? "var(--surface)" : "transparent",
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
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors hover:bg-[var(--surface)]"
                      style={{ color: "var(--destructive)" }}
                    >
                      Remove from list
                    </button>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
