"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GENRE_ID_MAP } from "@/lib/genres";
import type { JikanAnime } from "@/lib/jikan";

const SWIPE_THRESHOLD = 90;
const BASE = "https://api.jikan.moe/v4";
const DISMISSED_KEY = "zukan_dismissed";
// Probability a dismissed anime sneaks back into a batch
const DISMISSED_RESHOW_CHANCE = 0.07;

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadDismissed(): Set<number> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch { return new Set(); }
}

function saveDismissed(ids: Set<number>) {
  try {
    // Keep at most 500 entries so localStorage doesn't grow forever
    const arr = [...ids].slice(-500);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
  } catch {}
}

// Picks ONE random genre from the list so results are OR-style across fetches
async function fetchBatch(genreIds: number[], page: number): Promise<JikanAnime[]> {
  try {
    const genreId = genreIds[Math.floor(Math.random() * genreIds.length)];
    const res = await fetch(
      `${BASE}/anime?genres=${genreId}&order_by=score&sort=desc&limit=24&sfw&min_score=6.5&page=${page}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch { return []; }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const supabase = createClient();

  const [queue, setQueue] = useState<JikanAnime[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [listIds, setListIds] = useState<Set<number>>(new Set());
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  // Dismissed persisted to localStorage — use ref so swipe callbacks always see latest value
  const dismissedRef = useRef<Set<number>>(new Set());

  // Drag state
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

    dismissedRef.current = loadDismissed();

    const [{ data: entries }, { data: profile }] = await Promise.all([
      supabase.from("list_entries").select("mal_id").eq("user_id", user.id),
      supabase.from("profiles").select("favorite_genres").eq("id", user.id).maybeSingle(),
    ]);

    const existingIds = new Set<number>((entries ?? []).map((e: { mal_id: number }) => e.mal_id));
    setListIds(existingIds);

    const genres: string[] = profile?.favorite_genres ?? [];
    const gIds = genres.map((g) => GENRE_ID_MAP[g]).filter(Boolean) as number[];
    const finalIds = gIds.length > 0 ? gIds : [1, 22, 4];
    setGenreIds(finalIds);

    // Randomize starting page so refresh never shows the same order
    const startPage = Math.floor(Math.random() * 4) + 1;
    setPage(startPage + 1);

    const raw = await fetchBatch(finalIds, startPage);
    const filtered = filterBatch(raw, existingIds, new Set(), dismissedRef.current);
    setQueue(filtered);
    setLoading(false);
  }

  function filterBatch(
    batch: JikanAnime[],
    listSet: Set<number>,
    seenSet: Set<number>,
    dismissed: Set<number>
  ): JikanAnime[] {
    return shuffle(batch).filter((a) => {
      if (listSet.has(a.mal_id) || seenSet.has(a.mal_id)) return false;
      if (dismissed.has(a.mal_id)) return Math.random() < DISMISSED_RESHOW_CHANCE;
      return true;
    });
  }

  async function loadMore(gIds: number[], pg: number, listSet: Set<number>, seenSet: Set<number>) {
    const raw = await fetchBatch(gIds, pg);
    const filtered = filterBatch(raw, listSet, seenSet, dismissedRef.current);
    setQueue((prev) => [...prev, ...filtered]);
    setPage(pg + 1);
  }

  // ── Pointer handlers ────────────────────────────────────────────────────────

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
    if (offset > SWIPE_THRESHOLD) {
      triggerSwipe("right");
    } else if (offset < -SWIPE_THRESHOLD) {
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

    setTransitioning(true);
    setOffset(dir === "right" ? 600 : -600);

    const newSeen = new Set([...seenIds, current.mal_id]);

    // Persist dismissals so they rarely come back
    if (dir === "left") {
      const newDismissed = new Set([...dismissedRef.current, current.mal_id]);
      dismissedRef.current = newDismissed;
      saveDismissed(newDismissed);
    }

    setTimeout(() => {
      setSeenIds(newSeen);
      setQueue((q) => q.slice(1));
      setOffset(0);
      setTransitioning(false);
      animating.current = false;
      if (queue.length - 1 < 5) {
        loadMore(genreIds, page, listIds, newSeen);
      }
    }, 320);

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

          {third && (
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{ transform: "scale(0.92) translateY(16px)", zIndex: 1, opacity: 0.6 }}
            >
              <CardContent anime={third} />
            </div>
          )}

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

              <div
                className="absolute inset-0 flex items-start justify-start p-6 rounded-2xl transition-opacity"
                style={{
                  opacity: showAdd ? Math.min((offset - 40) / 60, 1) : 0,
                  background: "linear-gradient(135deg, rgba(34,197,94,0.35), transparent)",
                  pointerEvents: "none",
                }}
              >
                <span className="text-2xl font-black border-4 px-3 py-1 rounded-lg rotate-[-12deg]" style={{ color: "#22c55e", borderColor: "#22c55e" }}>
                  ADD
                </span>
              </div>

              <div
                className="absolute inset-0 flex items-start justify-end p-6 rounded-2xl transition-opacity"
                style={{
                  opacity: showSkip ? Math.min((-offset - 40) / 60, 1) : 0,
                  background: "linear-gradient(225deg, rgba(239,68,68,0.3), transparent)",
                  pointerEvents: "none",
                }}
              >
                <span className="text-2xl font-black border-4 px-3 py-1 rounded-lg rotate-[12deg]" style={{ color: "#ef4444", borderColor: "#ef4444" }}>
                  SKIP
                </span>
              </div>
            </div>
          )}
        </div>

        {added && (
          <div className="text-center mt-3 text-sm font-semibold" style={{ color: "#22c55e" }}>
            Added to Plan to Watch ✓
          </div>
        )}

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
          {anime.year && <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{anime.year}</span>}
          {anime.episodes && <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{anime.episodes} eps</span>}
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
