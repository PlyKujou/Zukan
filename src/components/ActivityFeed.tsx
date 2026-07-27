"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

type ListStatus = "watching" | "completed" | "plan_to_watch" | "on_hold" | "dropped";

const STATUS_ACTIONS: Record<ListStatus, string> = {
  watching:      "started watching",
  completed:     "completed",
  plan_to_watch: "added to plan to watch",
  on_hold:       "put on hold",
  dropped:       "dropped",
};

const STATUS_COLORS: Record<ListStatus, string> = {
  watching:      "#ff4e2a",
  completed:     "#46d69a",
  plan_to_watch: "#5eb0ff",
  on_hold:       "#ffb257",
  dropped:       "#8a7d6e",
};

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface FeedItem {
  key: string;
  type: "list" | "review";
  profile: Profile;
  mal_id: number;
  animeTitle: string;
  imageUrl: string | null;
  status?: ListStatus;
  rating?: number | null;
  reviewBody?: string;
  timestamp: string;
}

const PAGE_SIZE = 20;

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ profile }: { profile: Profile }) {
  return (
    <Link href={`/profile/${profile.username}`}>
      <div
        className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm"
        style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
      >
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.username}
            width={36}
            height={36}
            className="object-cover w-full h-full"
          />
        ) : (
          <span style={{ color: "var(--accent)" }}>
            {(profile.display_name || profile.username)[0]?.toUpperCase()}
          </span>
        )}
      </div>
    </Link>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const displayName = item.profile.display_name || item.profile.username;

  return (
    <div className="card card-hover flex gap-3 p-4">
      <Avatar profile={item.profile} />

      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <Link
            href={`/profile/${item.profile.username}`}
            className="font-semibold hover:underline"
            style={{ color: "var(--text)" }}
          >
            {displayName}
          </Link>{" "}
          {item.type === "list" && item.status && (
            <span style={{ color: STATUS_COLORS[item.status] }}>
              {STATUS_ACTIONS[item.status]}
            </span>
          )}
          {item.type === "review" && (
            <span style={{ color: "var(--text-muted)" }}>reviewed</span>
          )}{" "}
          <Link
            href={`/anime/${item.mal_id}`}
            className="font-semibold hover:underline"
            style={{ color: "var(--text)" }}
          >
            {item.animeTitle}
          </Link>
          {item.rating != null && (
            <span
              className="ml-2 inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded font-mono-nums align-middle"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--accent-2)" }}
            >
              <Star size={10} fill="currentColor" strokeWidth={0} />
              {item.rating}
            </span>
          )}
        </p>

        {item.reviewBody && (
          <p
            className="text-xs mt-1.5 line-clamp-2 leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            &ldquo;{item.reviewBody}&rdquo;
          </p>
        )}

        <p className="text-xs mt-1.5 font-mono-nums" style={{ color: "var(--text-muted)" }}>
          {timeAgo(item.timestamp)}
        </p>
      </div>

      {item.imageUrl && (
        <Link href={`/anime/${item.mal_id}`} className="shrink-0">
          <div className="relative w-10 h-14 rounded-lg overflow-hidden">
            <Image
              src={item.imageUrl}
              alt={item.animeTitle}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
        </Link>
      )}
    </div>
  );
}

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  return (
    <>
      <div className="space-y-2">
        {items.slice(0, visibleCount).map((item, i) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.035, 0.35), ease: [0.22, 1, 0.36, 1] }}
          >
            <FeedCard item={item} />
          </motion.div>
        ))}
      </div>

      {items.length > visibleCount && (
        <div className="flex justify-center mt-6">
          <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="btn btn-ghost">
            Load more ({items.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </>
  );
}
