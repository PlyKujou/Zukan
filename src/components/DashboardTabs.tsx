"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { QuickStatusButton } from "@/components/QuickStatusButton";
import type { MediaType } from "@/lib/anilist";
import { type ListStatus, STATUS_ORDER, getStatusLabels } from "@/lib/listStatus";

const PAGE_SIZE = 30;

interface Entry {
  id: string;
  mal_id: number;
  title: string;
  image_url: string;
  episodes: number | null;
  status: ListStatus;
  rating: number | null;
  progress: number;
}

export function DashboardTabs({ grouped, userId, mediaType = "anime" }: { grouped: Record<ListStatus, Entry[]>; userId: string; mediaType?: MediaType }) {
  const isManga = mediaType === "manga";
  const unitWord = isManga ? "ch" : "eps";
  const STATUS_LABELS = getStatusLabels(mediaType);
  const href = (malId: number) => `/${isManga ? "manga" : "anime"}/${malId}`;
  const [active, setActive] = useState<ListStatus>("watching");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "title" | "rating">("updated");
  const [progressOverrides, setProgressOverrides] = useState<Record<string, number>>({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const supabase = createClient();

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [active, search, sortBy]);

  async function incrementEpisode(entry: Entry, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const current = progressOverrides[entry.id] ?? entry.progress;
    const next = current + 1;
    setProgressOverrides((p) => ({ ...p, [entry.id]: next }));
    await supabase.from("list_entries").update({ progress: next, updated_at: new Date().toISOString() }).eq("id", entry.id);
  }

  const filtered = useMemo(() => {
    let list = grouped[active];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q));
    }
    if (sortBy === "title") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "rating") list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return list;
  }, [grouped, active, search, sortBy]);

  return (
    <div>
      {/* Tabs */}
      <div
        className="inline-flex max-w-full gap-1 mb-5 p-1 rounded-xl overflow-x-auto"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", scrollbarWidth: "none" }}
      >
        {STATUS_ORDER.map((s) => {
          const count = grouped[s].length;
          const isActive = s === active;
          return (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`relative shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                isActive ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="dash-tab"
                  className="absolute inset-0 rounded-lg"
                  style={{ backgroundColor: "var(--accent)" }}
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative">{STATUS_LABELS[s]}</span>
              <span
                className="relative ml-2 text-xs px-1.5 py-0.5 rounded font-mono-nums"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "var(--surface-2)",
                  color: isActive ? "#fff" : "var(--text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + sort */}
      <div className="flex gap-2 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search this list…"
          className="flex-1 px-3.5 py-2 text-sm"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 text-sm cursor-pointer"
        >
          <option value="updated">Recently updated</option>
          <option value="title">Title A–Z</option>
          <option value="rating">Rating ↓</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Nothing here yet.
          </p>
          <Link href={`/search?type=${mediaType}`} className="btn btn-primary">
            Find {isManga ? "manga" : "anime"} to add
          </Link>
        </div>
      ) : (
        <div key={active} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.slice(0, visibleCount).map((entry, i) => {
            const rawProgress = progressOverrides[entry.id] ?? entry.progress;
            const progress = entry.status === "completed" && entry.episodes ? entry.episodes : rawProgress;
            const pct = entry.episodes && entry.episodes > 0
              ? Math.min(100, (progress / entry.episodes) * 100)
              : 0;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.4), ease: [0.22, 1, 0.36, 1] }}
                className="group relative"
              >
                <Link href={href(entry.mal_id)}>
                  <div
                    className="relative aspect-[2/3] rounded-xl overflow-hidden"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <Image
                      src={entry.image_url}
                      alt={entry.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    />
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }}
                    />
                    {entry.rating && (
                      <div
                        className="absolute top-2 right-2 flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-md font-mono-nums"
                        style={{ backgroundColor: "rgba(11,9,8,0.8)", color: "var(--accent-2)", backdropFilter: "blur(4px)" }}
                      >
                        <Star size={10} fill="currentColor" strokeWidth={0} />
                        {entry.rating}
                      </div>
                    )}
                    {entry.episodes && entry.episodes > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                        <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: "var(--accent)" }} />
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: "var(--text)" }}>{entry.title}</p>
                    {entry.episodes ? (
                      <p className="text-xs mt-0.5 font-mono-nums" style={{ color: "var(--text-muted)" }}>{progress}/{entry.episodes} {unitWord}</p>
                    ) : progress > 0 ? (
                      <p className="text-xs mt-0.5 font-mono-nums" style={{ color: "var(--text-muted)" }}>{progress} {unitWord}</p>
                    ) : null}
                  </div>
                </Link>

                {/* Controls below card */}
                <div className="mt-2 flex items-center justify-between gap-1">
                  <div className={active === "completed" ? "opacity-0 group-hover:opacity-100 transition-opacity duration-150" : ""}>
                    <QuickStatusButton malId={entry.mal_id} userId={userId} currentStatus={entry.status} episodes={entry.episodes} mediaType={mediaType} variant="dot" />
                  </div>
                  {active === "watching" && (
                    <motion.button
                      onClick={(e) => incrementEpisode(entry, e)}
                      whileTap={{ scale: 0.92 }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer font-mono-nums transition-colors hover:bg-[var(--accent-dim)]"
                      style={{ color: "var(--accent)", border: "1px solid var(--accent-dim-border)" }}
                    >
                      <Plus size={11} strokeWidth={3} />1 {isManga ? "ch" : "ep"}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {filtered.length > visibleCount && (
        <div className="flex justify-center mt-8">
          <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="btn btn-ghost">
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
