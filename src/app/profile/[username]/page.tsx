export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Check, Clapperboard, Drama, Gauge, Map as MapIcon, PenLine, Star, Target, Trophy, Tv,
} from "lucide-react";
import { FavoriteAnimeSlots } from "@/components/FavoriteAnimeSlots";
import { FollowButton } from "@/components/FollowButton";
import { QuickStatusButton } from "@/components/QuickStatusButton";
import { IncrementEpisodeButton } from "@/components/IncrementEpisodeButton";

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
  icon: React.ElementType;
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
    { id: "first",       icon: Tv,           label: "First Watch",    desc: "Added your first anime.",              earned: totalEntries >= 1 },
    { id: "binge10",     icon: Clapperboard, label: "Binge Watcher",  desc: "Completed 10 anime.",                  earned: completed >= 10 },
    { id: "century",     icon: Gauge,        label: "Centurion",      desc: "Completed 100 anime.",                 earned: completed >= 100 },
    { id: "critic",      icon: PenLine,      label: "Critic",         desc: "Wrote your first review.",             earned: reviewCount >= 1 },
    { id: "topcritic",   icon: Trophy,       label: "Top Critic",     desc: "Wrote 10 or more reviews.",            earned: reviewCount >= 10 },
    { id: "recommender", icon: Target,       label: "Recommender",    desc: "Wrote your first recommendation.",     earned: recCount >= 1 },
    { id: "variety",     icon: Drama,        label: "Variety Pack",   desc: "Used 4 or more list statuses.",        earned: statusCount >= 4 },
    { id: "picky",       icon: Star,         label: "High Standards", desc: "Average rating of 8 or above.",        earned: (avgRating ?? 0) >= 8 },
    { id: "explorer",    icon: MapIcon,      label: "Genre Explorer", desc: "Selected 5 or more favourite genres.", earned: genreCount >= 5 },
  ];
}

interface Props {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);
  const supabase = await createClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, favorite_genres")
    .eq("username", username)
    .maybeSingle();

  // Retry once for transient DB issues
  if (!profile && !profileError) {
    const retry = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, favorite_genres")
      .eq("username", username)
      .maybeSingle();
    profile = retry.data;
    profileError = retry.error;
  }

  if (profileError) throw new Error(profileError.message);
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
    supabase.from("list_entries").select("*").eq("user_id", profile.id).eq("media_type", "anime").order("updated_at", { ascending: false }),
    supabase.from("reviews").select("id, mal_id, anime_title, rating, body, created_at").eq("user_id", profile.id).eq("media_type", "anime").order("created_at", { ascending: false }).limit(5),
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
      <div className="card p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--accent-dim-border), transparent)" }}
        />
        <div
          className="w-20 h-20 rounded-full overflow-hidden shrink-0"
          style={{ backgroundColor: "var(--surface-2)", border: "2px solid var(--accent-dim-border)" }}
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
            <h1 className="text-3xl font-bold">{profile.display_name || profile.username}</h1>
            {isOwner && (
              <Link href="/profile/edit" className="btn btn-ghost text-xs px-3 py-1">
                Edit profile
              </Link>
            )}
            <Link href={`/profile/${profile.username}/watchlist`} className="btn btn-ghost text-xs px-3 py-1">
              Watchlist
              <ArrowRight size={11} strokeWidth={2.5} />
            </Link>
          </div>
          <p className="text-sm mb-1 font-mono-nums" style={{ color: "var(--text-muted)" }}>@{profile.username}</p>
          {profile.bio && <p className="text-sm mb-3 max-w-lg">{profile.bio}</p>}
          {(profile.favorite_genres ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(profile.favorite_genres as string[]).map((g) => (
                <span key={g} className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold" style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-dim-border)" }}>
                  {g}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-5 text-sm font-mono-nums" style={{ color: "var(--text-muted)" }}>
            <span><strong style={{ color: "var(--text)" }}>{total}</strong> entries</span>
            <span><strong style={{ color: "var(--text)" }}>{completedCount}</strong> completed</span>
            <span>avg <strong style={{ color: "var(--text)" }}>{avgRatingDisplay}</strong></span>
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
            <h2 className="eyebrow mb-4">Favourited Anime</h2>
            {favorited.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No highly-rated anime yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {favorited.map((entry) => (
                  <Link key={entry.id} href={`/anime/${entry.mal_id}`} className="group">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                      <Image src={entry.image_url} alt={entry.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="100px" />
                      <div className="absolute bottom-1 right-1 flex items-center gap-0.5 text-xs font-bold px-1 py-0.5 rounded font-mono-nums" style={{ backgroundColor: "rgba(11,9,8,0.8)", color: "var(--accent-2)" }}>
                        <Star size={9} fill="currentColor" strokeWidth={0} />
                        {entry.rating}
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
            <h2 className="eyebrow mb-4">Reviews</h2>
            {!reviews || reviews.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <Link
                    key={r.id}
                    href={`/anime/${r.mal_id}`}
                    className="card card-hover block p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold truncate flex-1 mr-2">{r.anime_title}</p>
                      <span className="flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded shrink-0 font-mono-nums" style={{ backgroundColor: "var(--surface-2)", color: "var(--accent-2)" }}>
                        <Star size={10} fill="currentColor" strokeWidth={0} />
                        {r.rating}/10
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
            <h2 className="eyebrow mb-4">Recommendations</h2>
            {!recs || recs.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No recommendations yet.</p>
            ) : (
              <div className="space-y-3">
                {recs.map((rec) => (
                  <div key={rec.id} className="card p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/anime/${rec.source_mal_id}`} className="flex items-center gap-1.5 group">
                        <div className="relative w-7 h-10 rounded overflow-hidden shrink-0">
                          <Image src={rec.source_image_url} alt={rec.source_title} fill className="object-cover" sizes="28px" />
                        </div>
                        <p className="text-xs line-clamp-1 group-hover:underline" style={{ color: "var(--text-muted)", maxWidth: 70 }}>{rec.source_title}</p>
                      </Link>
                      <ArrowRight size={14} strokeWidth={2.5} className="shrink-0" style={{ color: "var(--accent)" }} />
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
            <h2 className="eyebrow mb-4">
              Achievements
              <span className="ml-2 font-mono-nums" style={{ letterSpacing: 0 }}>
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
                    border: `1px solid ${a.earned ? "var(--accent-dim-border)" : "var(--border)"}`,
                    opacity: a.earned ? 1 : 0.4,
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: a.earned ? "var(--accent-dim)" : "var(--surface-2)", color: a.earned ? "var(--accent)" : "var(--text-muted)" }}
                  >
                    <a.icon size={15} strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{a.label}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.desc}</p>
                  </div>
                  {a.earned && (
                    <Check size={13} strokeWidth={3} className="ml-auto shrink-0" style={{ color: "var(--accent)" }} />
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
                  <span className="ml-2 text-sm font-normal font-mono-nums" style={{ color: "var(--text-muted)" }}>({list.length})</span>
                </h2>
                {list.length === 0 ? (
                  <p className="text-sm px-1" style={{ color: "var(--text-muted)" }}>Nothing here yet.</p>
                ) : (
                  <div className="space-y-2">
                    {list.map((entry) => (
                      <div key={entry.id} className="card relative flex items-center">
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
                              <p className="text-xs mt-0.5 font-mono-nums" style={{ color: "var(--text-muted)" }}>
                                {entry.progress}/{entry.episodes} eps
                              </p>
                            )}
                          </div>
                          {entry.rating && (
                            <span className="flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded shrink-0 font-mono-nums" style={{ backgroundColor: "var(--surface-2)", color: "var(--accent-2)" }}>
                              <Star size={10} fill="currentColor" strokeWidth={0} />
                              {entry.rating}
                            </span>
                          )}
                        </Link>
                        {isOwner && (
                          <div className="pr-3 flex items-center gap-2">
                            {entry.status === "watching" && (
                              <IncrementEpisodeButton
                                entryId={entry.id}
                                malId={entry.mal_id}
                                userId={profile.id}
                                initialProgress={entry.progress}
                                episodes={entry.episodes}
                              />
                            )}
                            <QuickStatusButton malId={entry.mal_id} userId={profile.id} currentStatus={entry.status} episodes={entry.episodes} variant="dot" />
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
