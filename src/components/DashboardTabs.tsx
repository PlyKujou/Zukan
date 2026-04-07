"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

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

export function DashboardTabs({ grouped }: { grouped: Record<ListStatus, Entry[]> }) {
  const [active, setActive] = useState<ListStatus>("watching");
  const list = grouped[active];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
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

      {/* Grid */}
      {list.length === 0 ? (
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
          {list.map((entry) => (
            <Link key={entry.id} href={`/anime/${entry.mal_id}`} className="group">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden">
                <Image
                  src={entry.image_url}
                  alt={entry.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                />

                {/* Overlay on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }}
                />

                {/* Rating badge */}
                {entry.rating && (
                  <div
                    className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                  >
                    ★ {entry.rating}
                  </div>
                )}

                {/* Progress bar */}
                {entry.episodes && entry.episodes > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.min(100, (entry.progress / entry.episodes) * 100)}%`,
                        backgroundColor: "var(--accent)",
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-2">
                <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: "var(--text)" }}>
                  {entry.title}
                </p>
                {entry.episodes && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {entry.progress}/{entry.episodes} eps
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
