export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { getTopAnime, getSeasonNow, getAnimeByGenre } from "@/lib/jikan";
import type { JikanAnime } from "@/lib/jikan";
import { createClient } from "@/lib/supabase/server";
import { getZukanRatings } from "@/lib/supabase/ratings";
import { GENRE_ID_MAP } from "@/lib/genres";

interface Review {
  id: string;
  mal_id: number;
  anime_title: string;
  rating: number;
  body: string;
  created_at: string;
  profiles: { username: string } | null;
}

function AnimeCardSmall({ anime, zukanRating }: { anime: JikanAnime; zukanRating?: string }) {
  const title = anime.title_english || anime.title;
  return (
    <Link href={`/anime/${anime.mal_id}`} className="group shrink-0 w-32">
      <div className="relative w-32 h-48 rounded-xl overflow-hidden">
        <Image
          src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="128px"
        />
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {anime.score && (
            <div className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
              ★ {anime.score}
            </div>
          )}
          <div className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "rgba(0,0,0,0.65)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}>
            Z {zukanRating ?? "—"}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium leading-snug line-clamp-2" style={{ color: "var(--text-muted)" }}>{title}</p>
    </Link>
  );
}

function ScrollRow({ items, ratings }: { items: JikanAnime[]; ratings: Record<number, string> }) {
  const unique = items.filter((a, i, arr) => arr.findIndex((x) => x.mal_id === a.mal_id) === i);
  return (
    <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "thin" }}>
      {unique.map((a) => <AnimeCardSmall key={a.mal_id} anime={a} zukanRating={ratings[a.mal_id]} />)}
    </div>
  );
}

const FEATURES = [
  { icon: "◎", title: "Track Everything", desc: "Watching, completed, on hold, dropped — every show has a place." },
  { icon: "★", title: "Rate & Review",    desc: "Score each anime out of 10 and write your thoughts." },
  { icon: "⬡", title: "Your Profile",     desc: "Share your list publicly. Stats update automatically." },
  { icon: "⟳", title: "Always Current",   desc: "Powered by MyAnimeList — thousands of shows, always fresh." },
];

// ── LOGGED-IN HOME ──────────────────────────────────────────────────────────

async function PersonalisedHome({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [
    { data: profile },
    { data: entries },
    { data: rawReviews },
    { data: guildPosts },
  ] = await Promise.all([
    supabase.from("profiles").select("username, display_name, favorite_genres").eq("id", userId).maybeSingle(),
    supabase.from("list_entries").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    supabase.from("reviews").select("id, mal_id, anime_title, rating, body, created_at, profiles(username)").order("created_at", { ascending: false }).limit(6),
    supabase
      .from("guild_posts")
      .select("id, body, title, created_at, guild_id, profiles(username), guilds(name, slug, icon)")
      .in(
        "guild_id",
        (await supabase.from("guild_members").select("guild_id").eq("user_id", userId)).data?.map((m) => m.guild_id) ?? []
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const allEntries = entries ?? [];
  const watching = allEntries.filter((e) => e.status === "watching").slice(0, 8);
  const planToWatch = allEntries.filter((e) => e.status === "plan_to_watch").slice(0, 8);
  const completed = allEntries.filter((e) => e.status === "completed").length;
  const rated = allEntries.filter((e) => e.rating);
  const avgRating = rated.length > 0 ? (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(1) : null;

  const genres: string[] = profile?.favorite_genres ?? [];
  const forYouGenre = genres[0];
  const forYouAnime = forYouGenre
    ? await getAnimeByGenre(GENRE_ID_MAP[forYouGenre] ?? 1, 14).catch(() => [])
    : [];

  const airing = await getSeasonNow(14).catch(() => []);

  const allMalIds = [...forYouAnime, ...airing].map((a) => a.mal_id);
  const zukanRatings = await getZukanRatings(allMalIds);

  const recentReviews: Review[] = (rawReviews ?? []) as unknown as Review[];
  const displayName = profile?.display_name || profile?.username || "there";

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">

      {/* Greeting */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hey, {displayName} 👋</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Here's what's going on.</p>
        </div>
        <div className="flex gap-4 text-center stagger">
          {[
            { label: "Total", value: allEntries.length },
            { label: "Completed", value: completed },
            { label: "Avg ★", value: avgRating ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl px-4 py-3 min-w-[72px]" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-lg font-bold">{value}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Continue Watching */}
      {watching.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Continue Watching</h2>
            <Link href="/dashboard" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>View all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {watching.map((entry) => (
              <Link
                key={entry.id}
                href={`/anime/${entry.mal_id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden">
                  <Image src={entry.image_url} alt={entry.title} fill className="object-cover" sizes="40px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{entry.title}</p>
                  {entry.episodes ? (
                    <div className="mt-1.5">
                      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.round((entry.progress / entry.episodes) * 100)}%`, backgroundColor: "var(--accent)" }}
                        />
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{entry.progress}/{entry.episodes} eps</p>
                    </div>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Watching</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Up Next */}
      {planToWatch.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Up Next</h2>
            <Link href="/dashboard" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>View all →</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
            {planToWatch.map((entry) => (
              <Link
                key={entry.id}
                href={`/anime/${entry.mal_id}`}
                className="shrink-0 group"
                style={{ width: 96 }}
              >
                <div className="relative rounded-xl overflow-hidden" style={{ width: 96, height: 136 }}>
                  <Image src={entry.image_url} alt={entry.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="96px" />
                </div>
                <p className="text-xs mt-1.5 line-clamp-2 leading-snug" style={{ color: "var(--text-muted)" }}>{entry.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* For You */}
      {forYouAnime.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-bold">Top {forYouGenre}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)" }}>
              For You
            </span>
          </div>
          <ScrollRow items={forYouAnime} ratings={zukanRatings} />
        </section>
      )}

      {/* Airing now */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">Airing This Season</h2>
          <Link href="/search" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>Browse all →</Link>
        </div>
        <ScrollRow items={airing} ratings={zukanRatings} />
      </section>

      {/* Guild activity */}
      {guildPosts && guildPosts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Guild Activity</h2>
            <Link href="/guilds" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>Your guilds →</Link>
          </div>
          <div className="space-y-3">
            {guildPosts.map((post) => {
              const guild = post.guilds as unknown as { name: string; slug: string; icon: string } | null;
              const poster = post.profiles as unknown as { username: string } | null;
              return (
                <Link
                  key={post.id}
                  href={`/guilds/${guild?.slug ?? ""}`}
                  className="block rounded-xl p-4 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{guild?.icon ?? "⚔️"}</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>{guild?.name}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {poster?.username}</span>
                    <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
                      {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {post.title && <p className="text-sm font-semibold mb-0.5">{post.title}</p>}
                  <p className="text-sm line-clamp-2" style={{ color: "var(--text-muted)" }}>{post.body}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent reviews */}
      {recentReviews.length > 0 && (
        <section>
          <h2 className="text-base font-bold mb-4">Recent Reviews</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentReviews.map((review) => (
              <Link
                key={review.id}
                href={`/anime/${review.mal_id}`}
                className="rounded-2xl p-4 flex flex-col gap-2 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold truncate flex-1 mr-2">{review.anime_title}</p>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                    ★ {review.rating}/10
                  </span>
                </div>
                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--text-muted)" }}>&ldquo;{review.body}&rdquo;</p>
                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>{review.profiles?.username ?? "unknown"}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick links */}
      <section>
        <h2 className="text-base font-bold mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/dashboard",       label: "My Lists",      icon: "📋" },
            { href: "/discover",        label: "Match",         icon: "🔥" },
            { href: "/recommendations", label: "Recs",          icon: "🎯" },
            { href: "/guilds",          label: "Guilds",        icon: "⚔️" },
          ].map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl p-4 flex items-center gap-3 hover:opacity-80 transition-opacity"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-sm font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}

// ── LANDING PAGE ────────────────────────────────────────────────────────────

async function LandingPage() {
  const [airing, topRated] = await Promise.all([
    getSeasonNow(18).catch(() => []),
    getTopAnime("favorite", 18).catch(() => []),
  ]);

  const supabase = await createClient();
  const { data: rawReviews } = await supabase
    .from("reviews")
    .select("id, mal_id, anime_title, rating, body, created_at, profiles(username)")
    .order("created_at", { ascending: false })
    .limit(6);
  const recentReviews: Review[] = (rawReviews ?? []) as unknown as Review[];

  const allMalIds = [...airing, ...topRated].map((a) => a.mal_id);
  const zukanRatings = await getZukanRatings(allMalIds);

  return (
    <div style={{ backgroundColor: "var(--bg)" }}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 flex flex-wrap gap-0 opacity-15 pointer-events-none select-none">
          {[...airing, ...topRated].slice(0, 24).map((a) => (
            <div key={a.mal_id} className="relative" style={{ width: "8.33%", height: "100%" }}>
              <Image src={a.images.jpg.large_image_url || a.images.jpg.image_url} alt="" fill className="object-cover" sizes="8vw" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,15,0.88) 0%, rgba(8,8,15,0.65) 40%, rgba(8,8,15,1) 100%)" }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        {/* Central glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none" style={{
          background: "radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 65%)",
          filter: "blur(40px)",
        }} />
        <div className="relative max-w-6xl mx-auto px-4 pt-28 pb-24 text-center">
          <div className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6" style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-dim-border)" }}>
            Free · No ads · Always open
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-5 tracking-tight">
            Your anime.<br /><span style={{ color: "var(--accent)" }}>Your list.</span>
          </h1>
          <p className="text-base sm:text-lg max-w-xl mx-auto mb-10" style={{ color: "var(--text-muted)" }}>
            Track every show you've watched, rate them, log your progress, and build a profile that's actually yours.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup" className="px-6 py-3 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--accent)" }}>
              Get started free
            </Link>
            <Link href="/search" className="px-6 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
              Browse anime
            </Link>
          </div>
        </div>
      </section>

      {/* Accent divider under hero */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.4) 30%, rgba(99,102,241,0.4) 70%, transparent 100%)" }} />

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl p-6" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-2xl mb-4 w-11 h-11 flex items-center justify-center rounded-xl" style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)" }}>
                {f.icon}
              </div>
              <h3 className="font-bold mb-1">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Airing now */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Airing This Season</h2>
          <Link href="/search" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>Browse all →</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "thin" }}>
          {airing.map((a) => <AnimeCardSmall key={a.mal_id} anime={a} zukanRating={zukanRatings[a.mal_id]} />)}
        </div>
      </section>

      {/* Top rated */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Top Rated All Time</h2>
          <Link href="/search" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>Browse all →</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "thin" }}>
          {topRated.map((a) => <AnimeCardSmall key={a.mal_id} anime={a} zukanRating={zukanRatings[a.mal_id]} />)}
        </div>
      </section>

      {/* Recent reviews */}
      {recentReviews.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-lg font-bold mb-5">Recent Reviews</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentReviews.map((review) => (
              <Link key={review.id} href={`/anime/${review.mal_id}`} className="rounded-2xl p-4 flex flex-col gap-2 hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold truncate flex-1 mr-2">{review.anime_title}</p>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>★ {review.rating}/10</span>
                </div>
                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--text-muted)" }}>&ldquo;{review.body}&rdquo;</p>
                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>{review.profiles?.username ?? "unknown"}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center top, var(--accent-dim) 0%, transparent 70%)" }} />
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 relative">Ready to start tracking?</h2>
          <p className="text-sm mb-8 relative" style={{ color: "var(--text-muted)" }}>Join and build your list in seconds. It's completely free.</p>
          <Link href="/signup" className="px-8 py-3 rounded-xl text-sm font-semibold text-white inline-block relative" style={{ backgroundColor: "var(--accent)" }}>
            Create your free account
          </Link>
        </div>
      </section>
    </div>
  );
}

// ── ROOT ────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) return <PersonalisedHome userId={user.id} />;
  return <LandingPage />;
}
