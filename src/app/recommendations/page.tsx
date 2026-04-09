"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Tab = "write" | "for-you" | "newest";

interface AnimeResult {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: { jpg: { image_url: string; large_image_url: string } };
  episodes: number | null;
}

interface Rec {
  id: string;
  user_id: string;
  source_mal_id: number;
  source_title: string;
  source_image_url: string;
  target_mal_id: number;
  target_title: string;
  target_image_url: string;
  body: string;
  created_at: string;
  profiles: { username: string } | null;
}

// ── Anime search picker ──────────────────────────────────────────────────────
function AnimePicker({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: AnimeResult | null;
  onSelect: (a: AnimeResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=6&sfw`
      );
      const json = await res.json();
      setResults(json.data ?? []);
    } catch { setResults([]); }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(query), 450);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (value) {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--accent)" }}
      >
        <div className="relative w-10 h-14 shrink-0 rounded overflow-hidden">
          <Image src={value.images.jpg.image_url} alt={value.title} fill className="object-cover" sizes="40px" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
          <p className="text-sm font-medium truncate">{value.title_english || value.title}</p>
        </div>
        <button
          type="button"
          onClick={() => { onSelect(null as unknown as AnimeResult); setQuery(""); }}
          className="text-xs shrink-0 cursor-pointer hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search anime…"
        className="w-full px-3 py-2 rounded-xl text-sm"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
      {open && (query.trim() || searching) && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-xl"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {searching && (
            <p className="text-xs px-3 py-2" style={{ color: "var(--text-muted)" }}>Searching…</p>
          )}
          {!searching && results.length === 0 && query.trim() && (
            <p className="text-xs px-3 py-2" style={{ color: "var(--text-muted)" }}>No results.</p>
          )}
          {results.map((a) => (
            <button
              key={a.mal_id}
              type="button"
              onClick={() => { onSelect(a); setOpen(false); setQuery(""); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:opacity-80 transition-opacity cursor-pointer"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="relative w-8 h-11 shrink-0 rounded overflow-hidden">
                <Image src={a.images.jpg.image_url} alt={a.title} fill className="object-cover" sizes="32px" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.title_english || a.title}</p>
                {a.episodes && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.episodes} eps</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rec card ─────────────────────────────────────────────────────────────────
function RecCard({ rec, userId, onDelete }: { rec: Rec; userId: string | null; onDelete?: (id: string) => void }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Anime pair */}
      <div className="flex items-center gap-3 mb-3">
        <Link href={`/anime/${rec.source_mal_id}`} className="flex items-center gap-2 group">
          <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0">
            <Image src={rec.source_image_url || "/placeholder.png"} alt={rec.source_title} fill className="object-cover" sizes="40px" />
          </div>
          <p className="text-xs font-medium line-clamp-2 group-hover:underline" style={{ color: "var(--text-muted)", maxWidth: 80 }}>
            {rec.source_title}
          </p>
        </Link>

        <span className="text-lg shrink-0" style={{ color: "var(--accent)" }}>→</span>

        <Link href={`/anime/${rec.target_mal_id}`} className="flex items-center gap-2 group flex-1 min-w-0">
          <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0">
            <Image src={rec.target_image_url || "/placeholder.png"} alt={rec.target_title} fill className="object-cover" sizes="40px" />
          </div>
          <p className="text-sm font-semibold line-clamp-2 group-hover:underline">{rec.target_title}</p>
        </Link>
      </div>

      {/* Body */}
      <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
        &ldquo;{rec.body}&rdquo;
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>by</span>
          <Link href={`/profile/${rec.profiles?.username}`} className="font-semibold hover:underline" style={{ color: "var(--text)" }}>
            {rec.profiles?.username ?? "unknown"}
          </Link>
          <span>·</span>
          <span>{new Date(rec.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
        {userId === rec.user_id && onDelete && (
          <button
            onClick={() => onDelete(rec.id)}
            className="text-xs cursor-pointer hover:underline"
            style={{ color: "#f87171" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RecommendationsPage() {
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("newest");
  const [userId, setUserId] = useState<string | null>(null);

  // Write form
  const [sourceAnime, setSourceAnime] = useState<AnimeResult | null>(null);
  const [targetAnime, setTargetAnime] = useState<AnimeResult | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeSuccess, setWriteSuccess] = useState(false);

  // Lists
  const [newest, setNewest] = useState<Rec[]>([]);
  const [forYou, setForYou] = useState<Rec[]>([]);
  const [loadingNewest, setLoadingNewest] = useState(false);
  const [loadingForYou, setLoadingForYou] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    loadNewest();
  }, []);

  useEffect(() => {
    if (tab === "for-you" && userId && forYou.length === 0) loadForYou();
  }, [tab, userId]);

  async function loadNewest() {
    setLoadingNewest(true);
    const { data } = await supabase
      .from("recommendations")
      .select("*, profiles(username)")
      .order("created_at", { ascending: false })
      .limit(30);
    setNewest((data as Rec[]) ?? []);
    setLoadingNewest(false);
  }

  async function loadForYou() {
    if (!userId) return;
    setLoadingForYou(true);
    const { data: entries } = await supabase
      .from("list_entries")
      .select("mal_id")
      .eq("user_id", userId);
    const malIds = (entries ?? []).map((e: { mal_id: number }) => e.mal_id);
    if (malIds.length === 0) { setLoadingForYou(false); return; }
    const { data } = await supabase
      .from("recommendations")
      .select("*, profiles(username)")
      .in("source_mal_id", malIds)
      .order("created_at", { ascending: false })
      .limit(30);
    setForYou((data as Rec[]) ?? []);
    setLoadingForYou(false);
  }

  async function submitRec(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceAnime || !targetAnime) { setWriteError("Select both anime."); return; }
    if (sourceAnime.mal_id === targetAnime.mal_id) { setWriteError("Source and target must be different anime."); return; }
    if (body.trim().length < 10) { setWriteError("Write at least 10 characters."); return; }
    if (!userId) return;
    setSubmitting(true);
    setWriteError(null);
    const { error } = await supabase.from("recommendations").upsert({
      user_id: userId,
      source_mal_id: sourceAnime.mal_id,
      source_title: sourceAnime.title_english || sourceAnime.title,
      source_image_url: sourceAnime.images.jpg.image_url,
      target_mal_id: targetAnime.mal_id,
      target_title: targetAnime.title_english || targetAnime.title,
      target_image_url: targetAnime.images.jpg.image_url,
      body: body.trim(),
    }, { onConflict: "user_id,source_mal_id,target_mal_id" });
    setSubmitting(false);
    if (error) { setWriteError(error.message); return; }
    setWriteSuccess(true);
    setSourceAnime(null);
    setTargetAnime(null);
    setBody("");
    loadNewest();
    setTimeout(() => setWriteSuccess(false), 3000);
  }

  async function deleteRec(id: string) {
    await supabase.from("recommendations").delete().eq("id", id);
    setNewest((prev) => prev.filter((r) => r.id !== id));
    setForYou((prev) => prev.filter((r) => r.id !== id));
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "newest", label: "Newest" },
    { key: "for-you", label: "For You" },
    { key: "write", label: "Write" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Recommendations</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Liked an anime? Tell others what to watch next.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ backgroundColor: "var(--surface)" }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: tab === key ? "var(--accent)" : "transparent",
              color: tab === key ? "#fff" : "var(--text-muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Newest ── */}
      {tab === "newest" && (
        <div className="space-y-4">
          {loadingNewest && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>}
          {!loadingNewest && newest.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No recommendations yet. Be the first!</p>
          )}
          {newest.map((rec) => (
            <RecCard key={rec.id} rec={rec} userId={userId} onDelete={deleteRec} />
          ))}
        </div>
      )}

      {/* ── For You ── */}
      {tab === "for-you" && (
        <div className="space-y-4">
          {!userId && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              <Link href="/login" style={{ color: "var(--accent)" }}>Log in</Link> to see recommendations based on your list.
            </p>
          )}
          {userId && loadingForYou && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>}
          {userId && !loadingForYou && forYou.length === 0 && (
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>
              <p>No recommendations yet for anime in your list.</p>
              <p className="mt-1">Add more anime to your list or check back later.</p>
            </div>
          )}
          {forYou.map((rec) => (
            <RecCard key={rec.id} rec={rec} userId={userId} onDelete={deleteRec} />
          ))}
        </div>
      )}

      {/* ── Write ── */}
      {tab === "write" && (
        <div>
          {!userId ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              <Link href="/login" style={{ color: "var(--accent)" }}>Log in</Link> to write a recommendation.
            </p>
          ) : writeSuccess ? (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">✓</p>
              <p className="font-semibold">Recommendation posted!</p>
              <button
                onClick={() => setWriteSuccess(false)}
                className="mt-4 text-sm cursor-pointer hover:underline"
                style={{ color: "var(--accent)" }}
              >
                Write another
              </button>
            </div>
          ) : (
            <form onSubmit={submitRec} className="space-y-5">
              <div
                className="rounded-2xl p-5 space-y-5"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <AnimePicker
                  label="If you liked…"
                  value={sourceAnime}
                  onSelect={(a) => setSourceAnime(a)}
                />

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
                  <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>→</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
                </div>

                <AnimePicker
                  label="You should watch…"
                  value={targetAnime}
                  onSelect={(a) => setTargetAnime(a)}
                />
              </div>

              <div>
                <label className="text-sm block mb-1.5 font-medium" style={{ color: "var(--text-muted)" }}>
                  Why should they watch it?
                </label>
                <textarea
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Both have incredible world-building and a similar dark tone…"
                  className="w-full px-3 py-2 rounded-xl text-sm resize-none"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <p className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)" }}>
                  {body.length} chars {body.length < 10 && body.length > 0 ? "(min 10)" : ""}
                </p>
              </div>

              {writeError && <p className="text-sm text-red-400">{writeError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {submitting ? "Posting…" : "Post recommendation"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
