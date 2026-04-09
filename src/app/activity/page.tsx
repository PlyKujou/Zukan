export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Users } from "lucide-react";

type ListStatus = "watching" | "completed" | "plan_to_watch" | "on_hold" | "dropped";

const STATUS_ACTIONS: Record<ListStatus, string> = {
  watching:      "started watching",
  completed:     "completed",
  plan_to_watch: "added to plan to watch",
  on_hold:       "put on hold",
  dropped:       "dropped",
};

const STATUS_COLORS: Record<ListStatus, string> = {
  watching:      "#818cf8",
  completed:     "#34d399",
  plan_to_watch: "#60a5fa",
  on_hold:       "#fbbf24",
  dropped:       "#f87171",
};

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface FeedItem {
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
    <div
      className="flex gap-3 p-4 rounded-xl transition-opacity hover:opacity-90"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
    >
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
            <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
              ★ {item.rating}
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

        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
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

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get followed user IDs
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followedIds = follows?.map((f) => f.following_id) ?? [];

  if (followedIds.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="mb-8 relative">
          <div
            className="absolute -top-6 -left-4 w-48 h-24 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", filter: "blur(30px)" }}
          />
          <h1 className="text-2xl font-bold relative">Activity</h1>
          <p className="text-sm mt-1 relative" style={{ color: "var(--text-muted)" }}>
            See what people you follow are watching.
          </p>
        </div>

        <div
          className="rounded-2xl py-20 text-center"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <Users size={24} style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="font-semibold mb-1">No one to follow yet</p>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Find people with similar taste and follow them.
          </p>
          <Link
            href="/search?type=users"
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white inline-block"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Find people
          </Link>
        </div>
      </div>
    );
  }

  // Get profiles for followed users
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", followedIds);

  const profileMap = new Map<string, Profile>(
    (profiles ?? []).map((p) => [p.id, p])
  );

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch recent list entries and reviews in parallel
  const [{ data: entries }, { data: reviews }] = await Promise.all([
    supabase
      .from("list_entries")
      .select("user_id, mal_id, title, image_url, status, rating, updated_at")
      .in("user_id", followedIds)
      .gte("updated_at", cutoff)
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("reviews")
      .select("id, user_id, mal_id, anime_title, rating, body, created_at")
      .in("user_id", followedIds)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const feed: FeedItem[] = [];

  for (const entry of entries ?? []) {
    const profile = profileMap.get(entry.user_id);
    if (!profile) continue;
    feed.push({
      key: `list-${entry.user_id}-${entry.mal_id}`,
      type: "list",
      profile,
      mal_id: entry.mal_id,
      animeTitle: entry.title,
      imageUrl: entry.image_url,
      status: entry.status as ListStatus,
      rating: entry.status === "completed" ? entry.rating : null,
      timestamp: entry.updated_at,
    });
  }

  for (const review of reviews ?? []) {
    const profile = profileMap.get(review.user_id);
    if (!profile) continue;
    feed.push({
      key: `review-${review.id}`,
      type: "review",
      profile,
      mal_id: review.mal_id,
      animeTitle: review.anime_title,
      imageUrl: null,
      rating: review.rating,
      reviewBody: review.body,
      timestamp: review.created_at,
    });
  }

  // Sort by timestamp desc, deduplicate list entries per user+anime (keep most recent)
  const seen = new Set<string>();
  const deduped = feed
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .filter((item) => {
      if (item.type === "review") return true;
      const key = `${item.profile.id}-${item.mal_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Page header */}
      <div className="mb-8 relative">
        <div
          className="absolute -top-6 -left-4 w-48 h-24 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", filter: "blur(30px)" }}
        />
        <h1 className="text-2xl font-bold relative">Activity</h1>
        <p className="text-sm mt-1 relative" style={{ color: "var(--text-muted)" }}>
          {followedIds.length} {followedIds.length === 1 ? "person" : "people"} you follow · last 30 days
        </p>
      </div>

      {deduped.length === 0 ? (
        <div
          className="rounded-2xl py-16 text-center"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm mb-2 font-semibold">All quiet</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No one you follow has been active in the last 30 days.
          </p>
        </div>
      ) : (
        <div className="space-y-2 stagger">
          {deduped.map((item) => (
            <FeedCard key={item.key} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
