export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { ActivityFeed, type FeedItem } from "@/components/ActivityFeed";

type ListStatus = "watching" | "completed" | "plan_to_watch" | "on_hold" | "dropped";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
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
        <div className="mb-8">
          <p className="eyebrow mb-1.5">Following</p>
          <h1 className="text-3xl font-bold">Activity</h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            See what people you follow are watching.
          </p>
        </div>

        <div className="card py-20 text-center">
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
          <Link href="/search?type=users" className="btn btn-primary">
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
      .eq("media_type", "anime")
      .gte("updated_at", cutoff)
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("reviews")
      .select("id, user_id, mal_id, anime_title, rating, body, created_at")
      .in("user_id", followedIds)
      .eq("media_type", "anime")
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
      <div className="mb-8">
        <p className="eyebrow mb-1.5">Following</p>
        <h1 className="text-3xl font-bold">Activity</h1>
        <p className="text-sm mt-2 font-mono-nums" style={{ color: "var(--text-muted)" }}>
          {followedIds.length} {followedIds.length === 1 ? "person" : "people"} you follow · last 30 days
        </p>
      </div>

      {deduped.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm mb-2 font-semibold">All quiet</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No one you follow has been active in the last 30 days.
          </p>
        </div>
      ) : (
        <ActivityFeed items={deduped} />
      )}
    </div>
  );
}
