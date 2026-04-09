export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FavoriteAnimeSlots } from "@/components/FavoriteAnimeSlots";
import { FollowButton } from "@/components/FollowButton";
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

interface Achievement {
  id: string;
  icon: string;
  label: string;
  desc: string;
  earned: boolean;
}

function computeAchievements(data: {
  totalEntries: number;
  completed: number;
  reviewCount: number;
  recCount: number;
  avgRating: number | null;
  statusCount: number;
  genreCount: number;
}): Achievement[] {
  const { totalEntries, completed, reviewCount, recCount, avgRating, statusCount, genreCount } = data;
  return [
    { id: "first",       icon: "📺", label: "First Watch",     desc: "Added your first anime.",              earned: totalEntries >= 1 },
    { id: "binge10",     icon: "🎬", label: "Binge Watcher",   desc: "Completed 10 anime.",                  earned: completed >= 10 },
    { id: "century",     icon: "💯", label: "Centurion",        desc: "Completed 100 anime.",                 earned: completed >= 100 },
    { id: "critic",      icon: "✍️", label: "Critic",           desc: "Wrote your first review.",             earned: reviewCount >= 1 },
    { id: "topcritic",   icon: "🏆", label: "Top Critic",       desc: "Wrote 10 or more reviews.",            earned: reviewCount >= 10 },
    { id: "recommender", icon: "🎯", label: "Recommender",      desc: "Wrote your first recommendation.",     earned: recCount >= 1 },
    { id: "variety",     icon: "🎭", label: "Variety Pack",     desc: "Used 4 or more list statuses.",        earned: statusCount >= 4 },
    { id: "picky",       icon: "⭐", label: "High Standards",   desc: "Average rating of 8 or above.",        earned: (avgRating ?? 0) >= 8 },
    { id: "explorer",    icon: "🗺️", label: "Genre Explorer",   desc: "Selected 5 or more favourite genres.", earned: genreCount >= 5 },
  ];
}

interface Props {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, favorite_genres")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  // favorite_anime is a newer column — fetch separately so a missing column doesn't 404 the page
  const { data: profileExtended } = await supabase
    .from("profiles")
    .select("favorite_anime")
    .eq("id", profile.id)
    .maybeSingle();

  const isOwner = currentUser?.id === profile.id;
  const favoriteAnime = ((profileExtended?.favorite_anime ?? []) as { mal_id: number; title: string; image_url: string }[]);

  const [
    { data: entries },
    { data: reviews },
    { data: recs },
    { count: followerCount },
    { count: followingCount },
    { data: followRow },
  ] = await Promise.all([
    supabase.from("list_entries").select("*").eq("user_id", profile.id).order("updated_at", { ascending: false }),
    supabase.from("reviews").select("id, mal_id, anime_title, rating, body, created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("recommendations").select("id, source_mal_id, source_title, source_image_url, target_mal_id, target_title, target_image_url, body, created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    currentUser && !isOwner
      ? supabase.from("follows").select("follower_id").eq("follower_id", currentUser.id).eq("following_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isFollowing = !!followRow;

  const allEntries = entries ?? [];
  const total = allEntries.length;
  const completedCount = allEntries.filter((e) => e.status === "completed").length;
  const rated = allEntries.filter((e) => e.rating);
  const avgRating = rated.length > 0
    ? (rated.reduce((s, e) => s + e.rating, 0) / rated.length)
    : null;
  const avgRatingDisplay = avgRating ? avgRating.toFixed(1) : "—";

  const grouped = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = allEntries.filter((e) => e.status === s);
    return acc;
  }, {} as Record<ListStatus, typeof allEntries>);

  const favorited = [...allEntries]
    .filter((e) => e.rating >= 8)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);

  const usedStatuses = STATUS_ORDER.filter((s) => grouped[s].length > 0).length;
  const achievements = computeAchievements({
    totalEntries: total,
    completed: completedCount,
    reviewCount: reviews?.length ?? 0,
    recCount: recs?.length ?? 0,
    avgRating,
    statusCount: usedStatuses,
    genreCount: (profile.favorite_genres ?? []).length,
  });

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* ── Full-width header ── */}
      <div
        className="rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-6"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-20 h-20 rounded-full overflow-hidden shrink-0"
          style={{ backgroundColor: "var(--surface-2)", border: "2px solid var(--border)" }}
        >
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.username} width={80} height={80} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ color: "var(--text-muted)" }}>
              {profile.username[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            {isOwner && (
              <Link
                href="/profile/edit"
                className="text-xs px-3 py-1 rounded-lg font-medium"
                style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                Edit profile
              </Link>
            )}
            <Link
              href={`/profile/${profile.username}/watchlist`}
              className="text-xs px-3 py-1 rounded-lg font-medium"
              style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              Watchlist →
            </Link>
          </div>
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>@{profile.username}</p>
          {profile.bio && <p className="text-sm mb-3 max-w-lg">{profile.bio}</p>}
          {(profile.favorite_genres ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(profile.favorite_genres as string[]).map((g) => (
                <span key={g} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-dim-border)" }}>
                  {g}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-5 text-sm" style={{ color: "var(--text-muted)" }}>
            <span><strong style={{ color: "var(--text)" }}>{total}</strong> entries</span>
            <span><strong style={{ color: "var(--text)" }}>{completedCount}</strong> completed</span>
            <span>Avg ★ <strong style={{ color: "var(--text)" }}>{avgRatingDisplay}</strong></span>
            <span><strong style={{ color: "var(--text)" }}>{followerCount ?? 0}</strong> followers</span>
            <span><strong style={{ color: "var(--text)" }}>{followingCount ?? 0}</strong> following</span>
          </div>
          {!isOwner && (
            <div className="mt-3">
              <FollowButton targetUserId={profile.id} isFollowing={isFollowing} currentUserId={currentUser?.id ?? null} />
            </div>
          )}
          <FavoriteAnimeSlots favorites={favoriteAnime} isOwner={isOwner} profileId={profile.id} />
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8">

        {/* ── LEFT ── */}
        <div className="space-y-8">

          {/* Favourited Anime */}
          <section>
            <h2 className="text-base font-bold mb-4">Favourited Anime</h2>
            {favorited.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No highly-rated anime yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {favorited.map((entry) => (
                  <Link key={entry.id} href={`/anime/${entry.mal_id}`} className="group">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                      <Image src={entry.image_url} alt={entry.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="100px" />
                      <div className="absolute bottom-1 right-1 text-xs font-bold px-1 py-0.5 rounded" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                        ★ {entry.rating}
                      </div>
                    </div>
                    <p className="text-xs mt-1 line-clamp-1" style={{ color: "var(--text-muted)" }}>{entry.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Reviews */}
          <section>
            <h2 className="text-base font-bold mb-4">Reviews</h2>
            {!reviews || reviews.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <Link
                    key={r.id}
                    href={`/anime/${r.mal_id}`}
                    className="block rounded-xl p-3 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold truncate flex-1 mr-2">{r.anime_title}</p>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                        ★ {r.rating}/10
                      </span>
                    </div>
                    <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>&ldquo;{r.body}&rdquo;</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recommendations */}
          <section>
            <h2 className="text-base font-bold mb-4">Recommendations</h2>
            {!recs || recs.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No recommendations yet.</p>
            ) : (
              <div className="space-y-3">
                {recs.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-xl p-3"
                    style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/anime/${rec.source_mal_id}`} className="flex items-center gap-1.5 group">
                        <div className="relative w-7 h-10 rounded overflow-hidden shrink-0">
                          <Image src={rec.source_image_url} alt={rec.source_title} fill className="object-cover" sizes="28px" />
                        </div>
                        <p className="text-xs line-clamp-1 group-hover:underline" style={{ color: "var(--text-muted)", maxWidth: 70 }}>{rec.source_title}</p>
                      </Link>
                      <span style={{ color: "var(--accent)" }} className="text-sm font-bold shrink-0">→</span>
                      <Link href={`/anime/${rec.target_mal_id}`} className="flex items-center gap-1.5 group flex-1 min-w-0">
                        <div className="relative w-7 h-10 rounded overflow-hidden shrink-0">
                          <Image src={rec.target_image_url} alt={rec.target_title} fill className="object-cover" sizes="28px" />
                        </div>
                        <p className="text-xs font-semibold line-clamp-1 group-hover:underline">{rec.target_title}</p>
                      </Link>
                    </div>
                    <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>&ldquo;{rec.body}&rdquo;</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Achievements */}
          <section>
            <h2 className="text-base font-bold mb-4">
              Achievements
              <span className="text-sm font-normal ml-2" style={{ color: "var(--text-muted)" }}>
                {earnedCount}/{achievements.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: `1px solid ${a.earned ? "var(--accent)" : "var(--border)"}`,
                    opacity: a.earned ? 1 : 0.4,
                  }}
                >
                  <span className="text-xl shrink-0">{a.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{a.label}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.desc}</p>
                  </div>
                  {a.earned && (
                    <span className="ml-auto text-xs font-bold shrink-0" style={{ color: "var(--accent)" }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* ── RIGHT: Anime lists ── */}
        <div>
          {STATUS_ORDER.map((status) => {
            const list = grouped[status] ?? [];
            return (
              <section key={status} className="mb-8">
                <h2 className="text-base font-semibold mb-3" style={{ color: "var(--accent)" }}>
                  {STATUS_LABELS[status]}
                  <span className="ml-2 text-sm font-normal" style={{ color: "var(--text-muted)" }}>({list.length})</span>
                </h2>
                {list.length === 0 ? (
                  <p className="text-sm px-1" style={{ color: "var(--text-muted)" }}>Nothing here yet.</p>
                ) : (
                  <div className="space-y-2">
                    {list.map((entry) => (
                      <div key={entry.id} className="relative flex items-center rounded-xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                        <Link
                          href={`/anime/${entry.mal_id}`}
                          className="flex items-center gap-3 p-3 flex-1 min-w-0 hover:opacity-90 transition-opacity"
                        >
                          <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden">
                            <Image src={entry.image_url} alt={entry.title} fill className="object-cover" sizes="40px" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{entry.title}</p>
                            {entry.episodes && (
                              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                {entry.progress}/{entry.episodes} eps
                              </p>
                            )}
                          </div>
                          {entry.rating && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                              ★ {entry.rating}
                            </span>
                          )}
                        </Link>
                        {isOwner && (
                          <div className="pr-3">
                            <QuickStatusButton malId={entry.mal_id} userId={profile.id} currentStatus={entry.status} variant="dot" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

      </div>
    </div>
  );
}
