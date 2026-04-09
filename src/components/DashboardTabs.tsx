"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { QuickStatusButton } from "@/components/QuickStatusButton";

type ListStatus = "watching" | "completed" | "plan_to_watch" | "on_hold" | "dropped";

const STATUS_LABELS: Record<ListStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  plan_to_watch: "Plan to Watch",
  on_hold: "On Hold",
  dropped: "Dropped",
};

const STATUS_ORDER: ListStatus[] = ["watching", "completed", "plan_to_watch", "on_hold", "dropped"];

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

export function DashboardTabs({ grouped, userId }: { grouped: Record<ListStatus, Entry[]>; userId: string }) {
  const [active, setActive] = useState<ListStatus>("watching");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "title" | "rating">("updated");
  const [progressOverrides, setProgressOverrides] = useState<Record<string, number>>({});
  const supabase = createClient();

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
      <div className="flex gap-1 mb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {STATUS_ORDER.map((s) => {
          const count = grouped[s].length;
          const isActive = s === active;
          return (
            <button
              key={s}
              onClick={() => setActive(s)}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: isActive ? "var(--accent)" : "var(--surface)",
                color: isActive ? "#fff" : "var(--text-muted)",
                border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {STATUS_LABELS[s]}
              <span
                className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
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
          className="flex-1 px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 rounded-lg text-sm cursor-pointer"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <option value="updated">Recently updated</option>
          <option value="title">Title A–Z</option>
          <option value="rating">Rating ↓</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl py-16 text-center"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Nothing here yet.
          </p>
          <Link
            href="/search"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Find anime to add
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((entry) => {
            const progress = progressOverrides[entry.id] ?? entry.progress;
            const pct = entry.episodes && entry.episodes > 0
              ? Math.min(100, (progress / entry.episodes) * 100)
              : 0;
            return (
              <div key={entry.id} className="group relative">
                <Link href={`/anime/${entry.mal_id}`}>
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden">
                    <Image
                      src={entry.image_url}
                      alt={entry.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    />
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }}
                    />
                    {entry.rating && (
                      <div className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                        ★ {entry.rating}
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
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{progress}/{entry.episodes} eps</p>
                    ) : progress > 0 ? (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{progress} eps</p>
                    ) : null}
                  </div>
                </Link>

                {/* Hover controls — outside Link so clicks don't navigate */}
                <div className="absolute bottom-9 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <QuickStatusButton malId={entry.mal_id} userId={userId} currentStatus={entry.status} variant="dot" />
                  {active === "watching" && (
                    <button
                      onClick={(e) => incrementEpisode(entry, e)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95"
                      style={{
                        backgroundColor: "rgba(99,102,241,0.9)",
                        color: "#fff",
                        backdropFilter: "blur(4px)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                      }}
                    >
                      <Plus size={11} strokeWidth={3} />1 ep
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
