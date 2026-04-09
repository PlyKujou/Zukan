"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GENRE_ID_MAP } from "@/lib/genres";
import type { JikanAnime } from "@/lib/jikan";

const SWIPE_THRESHOLD = 90;
const BASE = "https://api.jikan.moe/v4";

async function fetchBatch(genreIds: number[], page: number): Promise<JikanAnime[]> {
  try {
    const res = await fetch(
      `${BASE}/anime?genres=${genreIds.slice(0, 3).join(",")}&order_by=score&sort=desc&limit=24&sfw&min_score=6.5&page=${page}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch { return []; }
}

export default function DiscoverPage() {
  const supabase = createClient();

  const [queue, setQueue] = useState<JikanAnime[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [listIds, setListIds] = useState<Set<number>>(new Set());
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(2);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false); // flash on add

  // Drag state — use refs for values that change during pointermove to avoid rerenders
  const [offset, setOffset] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const animating = useRef(false);

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const [{ data: entries }, { data: profile }] = await Promise.all([
      supabase.from("list_entries").select("mal_id").eq("user_id", user.id),
      supabase.from("profiles").select("favorite_genres").eq("id", user.id).maybeSingle(),
    ]);

    const existingIds = new Set<number>((entries ?? []).map((e: { mal_id: number }) => e.mal_id));
    setListIds(existingIds);

    const genres: string[] = profile?.favorite_genres ?? [];
    const gIds = genres.map((g) => GENRE_ID_MAP[g]).filter(Boolean) as number[];
    const finalIds = gIds.length > 0 ? gIds : [1, 22, 4]; // Action, Romance, Comedy fallback
    setGenreIds(finalIds);

    const batch = await fetchBatch(finalIds, 1);
    const filtered = batch.filter((a) => !existingIds.has(a.mal_id));
    setQueue(filtered);
    setLoading(false);
  }

  async function loadMore(gIds: number[], pg: number, listSet: Set<number>, seenSet: Set<number>) {
    const batch = await fetchBatch(gIds, pg);
    const filtered = batch.filter((a) => !listSet.has(a.mal_id) && !seenSet.has(a.mal_id));
    setQueue((prev) => [...prev, ...filtered]);
    setPage(pg + 1);
  }

  // ── Pointer handlers ──
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (animating.current) return;
    dragging.current = true;
    startX.current = e.clientX;
    setTransitioning(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setOffset(e.clientX - startX.current);
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = offset;
    if (dx > SWIPE_THRESHOLD) {
      triggerSwipe("right");
    } else if (dx < -SWIPE_THRESHOLD) {
      triggerSwipe("left");
    } else {
      setTransitioning(true);
      setOffset(0);
    }
  }

  function triggerSwipe(dir: "left" | "right") {
    if (animating.current || queue.length === 0) return;
    animating.current = true;
    const current = queue[0];

    // Start fly-out animation immediately
    setTransitioning(true);
    setOffset(dir === "right" ? 600 : -600);

    // Advance the queue exactly when the animation ends — don't wait for network
    const newSeen = new Set([...seenIds, current.mal_id]);
    setTimeout(() => {
      setSeenIds(newSeen);
      setQueue((q) => q.slice(1));
      setOffset(0);
      setTransitioning(false);
      animating.current = false;
      // Load more outside the state updater, using known queue length
      if (queue.length - 1 < 5) {
        loadMore(genreIds, page, listIds, newSeen);
      }
    }, 320);

    // Write to Supabase in the background — doesn't block the UI
    if (dir === "right" && userId) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
      supabase.from("list_entries").upsert({
        user_id: userId,
        mal_id: current.mal_id,
        title: current.title_english || current.title,
        image_url: current.images.jpg.image_url,
        episodes: current.episodes,
        status: "plan_to_watch",
        progress: 0,
      }, { onConflict: "user_id,mal_id" }).then(() => {
        setListIds((prev) => new Set([...prev, current.mal_id]));
      });
    }
  }

  const current = queue[0];
  const next = queue[1];
  const third = queue[2];

  const rotation = offset * 0.04;
  const absOffset = Math.abs(offset);
  const showAdd = offset > 40;
  const showSkip = offset < -40;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
        Loading…
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold">Sign in to discover anime</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>We use your genre preferences to find your next watch.</p>
        <Link href="/login" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--accent)" }}>
          Log in
        </Link>
      </div>
    );
  }

  if (!loading && queue.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-2xl font-bold">You&apos;re all caught up!</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No more anime to discover right now.</p>
        <Link href="/dashboard" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--accent)" }}>
          View my list
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 select-none">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold">Match</h1>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Swipe right to add · left to skip
          </span>
        </div>

        {/* Card stack */}
        <div className="relative h-[520px]">

          {/* Third card (bottom) */}
          {third && (
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                transform: "scale(0.92) translateY(16px)",
                zIndex: 1,
                opacity: 0.6,
              }}
            >
              <CardContent anime={third} />
            </div>
          )}

          {/* Second card */}
          {next && (
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                transform: `scale(${0.96 + Math.min(absOffset / 600, 0.04)}) translateY(${8 - Math.min(absOffset / 30, 8)}px)`,
                zIndex: 2,
                transition: "transform 0.15s ease",
              }}
            >
              <CardContent anime={next} />
            </div>
          )}

          {/* Top card (draggable) */}
          {current && (
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
              style={{
                transform: `translateX(${offset}px) rotate(${rotation}deg)`,
                transition: transitioning ? "transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)" : "none",
                zIndex: 3,
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <CardContent anime={current} />

              {/* ADD overlay */}
              <div
                className="absolute inset-0 flex items-start justify-start p-6 rounded-2xl transition-opacity"
                style={{
                  opacity: showAdd ? Math.min((offset - 40) / 60, 1) : 0,
                  background: "linear-gradient(135deg, rgba(34,197,94,0.35), transparent)",
                  pointerEvents: "none",
                }}
              >
                <span
                  className="text-2xl font-black border-4 px-3 py-1 rounded-lg rotate-[-12deg]"
                  style={{ color: "#22c55e", borderColor: "#22c55e" }}
                >
                  ADD
                </span>
              </div>

              {/* SKIP overlay */}
              <div
                className="absolute inset-0 flex items-start justify-end p-6 rounded-2xl transition-opacity"
                style={{
                  opacity: showSkip ? Math.min((-offset - 40) / 60, 1) : 0,
                  background: "linear-gradient(225deg, rgba(239,68,68,0.3), transparent)",
                  pointerEvents: "none",
                }}
              >
                <span
                  className="text-2xl font-black border-4 px-3 py-1 rounded-lg rotate-[12deg]"
                  style={{ color: "#ef4444", borderColor: "#ef4444" }}
                >
                  SKIP
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Added flash */}
        {added && (
          <div className="text-center mt-3 text-sm font-semibold" style={{ color: "#22c55e" }}>
            Added to Plan to Watch ✓
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <button
            onClick={() => triggerSwipe("left")}
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer transition-transform hover:scale-110"
            style={{ backgroundColor: "var(--surface)", border: "2px solid #ef4444", color: "#ef4444" }}
          >
            ✕
          </button>
          <Link
            href={current ? `/anime/${current.mal_id}` : "#"}
            className="px-4 py-2 rounded-full text-xs font-medium"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            Details
          </Link>
          <button
            onClick={() => triggerSwipe("right")}
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl cursor-pointer transition-transform hover:scale-110"
            style={{ backgroundColor: "var(--surface)", border: "2px solid #22c55e", color: "#22c55e" }}
          >
            ♥
          </button>
        </div>

      </div>
    </div>
  );
}

function CardContent({ anime }: { anime: JikanAnime }) {
  const title = anime.title_english || anime.title;
  return (
    <div className="w-full h-full relative" style={{ backgroundColor: "var(--surface)" }}>
      <Image
        src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
        alt={title}
        fill
        className="object-cover"
        sizes="400px"
        draggable={false}
      />
      {/* Bottom gradient info */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 75%)" }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-center gap-2 mb-1.5">
          {anime.score && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
              ★ {anime.score}
            </span>
          )}
          {anime.year && (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{anime.year}</span>
          )}
          {anime.episodes && (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{anime.episodes} eps</span>
          )}
        </div>
        <h2 className="text-lg font-bold text-white leading-tight mb-2">{title}</h2>
        <div className="flex flex-wrap gap-1 mb-3">
          {anime.genres.slice(0, 3).map((g) => (
            <span
              key={g.mal_id}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}
            >
              {g.name}
            </span>
          ))}
        </div>
        {anime.synopsis && (
          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "rgba(255,255,255,0.65)" }}>
            {anime.synopsis}
          </p>
        )}
      </div>
    </div>
  );
}
