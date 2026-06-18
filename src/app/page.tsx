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
  if (unique.length === 0) {
    return (
      <p className="text-sm py-2" style={{ color: "var(--text-muted)" }}>
        Couldn&apos;t load right now — the anime database may be temporarily unavailable. Try refreshing in a bit.
      </p>
    );
  }
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

const PROOF_ITEMS = [
  { label: "Anime in database", value: "30,000+" },
  { label: "Free forever", value: "Always" },
  { label: "No ads ever", value: "Zero" },
  { label: "Your data", value: "Yours" },
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

  const mosaicAnime = [...airing, ...topRated].slice(0, 24);

  return (
    <div style={{ backgroundColor: "var(--bg)" }}>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ minHeight: "92vh", display: "flex", alignItems: "center" }}>
        {/* Mosaic background */}
        <div className="absolute inset-0 flex flex-wrap gap-0 pointer-events-none select-none" style={{ opacity: 0.12 }}>
          {mosaicAnime.map((a) => (
            <div key={a.mal_id} className="relative" style={{ width: "8.33%", height: "100%" }}>
              <Image src={a.images.jpg.large_image_url || a.images.jpg.image_url} alt="" fill className="object-cover" sizes="8vw" />
            </div>
          ))}
        </div>
        {/* Dark gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,15,0.92) 0%, rgba(8,8,15,0.7) 35%, rgba(8,8,15,0.95) 85%, rgba(8,8,15,1) 100%)" }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{
          width: 800, height: 400,
          background: "radial-gradient(ellipse, rgba(99,102,241,0.22) 0%, transparent 65%)",
          filter: "blur(60px)",
        }} />

        <div className="relative w-full max-w-6xl mx-auto px-4 py-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-8" style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-dim-border)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--accent)", display: "inline-block" }} />
            Free · No ads · Always open
          </div>

          {/* Headline */}
          <h1 className="font-black leading-none mb-6 tracking-tight" style={{ fontSize: "clamp(3rem, 9vw, 6.5rem)" }}>
            Your anime.<br />
            <span style={{
              color: "var(--accent)",
              textShadow: "0 0 80px rgba(99,102,241,0.45)",
            }}>Your list.</span>
          </h1>

          {/* Subheading */}
          <p className="max-w-lg mx-auto mb-10 text-lg leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Track every show, rate it, log your progress — then share a profile that&apos;s actually yours.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-12">
            <Link
              href="/signup"
              className="px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ backgroundColor: "var(--accent)", boxShadow: "0 0 32px rgba(99,102,241,0.35)" }}
            >
              Start tracking — it&apos;s free
            </Link>
            <Link
              href="/search"
              className="px-8 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              Browse anime →
            </Link>
          </div>

          {/* Proof chips */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
            {["No credit card", "5 list types", "Episode tracking", "Public profiles"].map((chip) => (
              <span key={chip} className="flex items-center gap-1.5">
                <span style={{ color: "var(--success)" }}>✓</span> {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF STRIP ── */}
      <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
        <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {PROOF_ITEMS.map(({ label, value }) => (
            <div key={label}>
              <p className="text-lg font-extrabold tracking-tight" style={{ color: "var(--accent)" }}>{value}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 tracking-tight">Everything you need. Nothing you don&apos;t.</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Simple by design, powerful when you need it.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl p-6 flex flex-col gap-3 hover:border-opacity-60 transition-all" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xl w-12 h-12 flex items-center justify-center rounded-2xl font-bold" style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)", fontSize: 22 }}>
                {f.icon}
              </div>
              <h3 className="font-bold text-sm">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MOCK UI PREVIEW ── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-3xl overflow-hidden relative" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
          {/* Glow top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 500, height: 2, background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)" }} />
          <div className="p-8 sm:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block" style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)" }}>Your dashboard</span>
              <h2 className="text-2xl font-extrabold mb-3 tracking-tight">Track progress, not just titles.</h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
                Every show you add gets its own progress bar, rating, and notes. Pause it, resume it, drop it — your list, your rules.
              </p>
              <Link href="/signup" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--accent)" }}>
                Build your list
              </Link>
            </div>
            {/* Stylized UI mock */}
            <div className="space-y-3">
              {[
                { title: "Attack on Titan", eps: 87, total: 87, rating: 10, status: "Completed" },
                { title: "Frieren: Beyond Journey's End", eps: 16, total: 28, rating: 9, status: "Watching" },
                { title: "Solo Leveling", eps: 0, total: 12, rating: null, status: "Plan to Watch" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="w-9 h-12 rounded-lg shrink-0" style={{ backgroundColor: "var(--border)", background: `linear-gradient(135deg, var(--accent-dim), var(--border))` }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold truncate">{item.title}</p>
                      {item.rating && (
                        <span className="text-xs font-bold shrink-0" style={{ color: "var(--accent)" }}>★ {item.rating}</span>
                      )}
                    </div>
                    {item.status === "Watching" ? (
                      <>
                        <div className="h-1 rounded-full overflow-hidden mb-1" style={{ backgroundColor: "var(--border)" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.round((item.eps / item.total) * 100)}%`, backgroundColor: "var(--accent)" }} />
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.eps}/{item.total} eps</p>
                      </>
                    ) : (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.status} · {item.total} eps</p>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-center pt-1" style={{ color: "var(--text-muted)" }}>+ your entire backlog, ratings, and notes</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AIRING NOW ── */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold">Airing This Season</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Add them to your list as they air</p>
          </div>
          <Link href="/search" className="text-sm font-medium hover:underline" style={{ color: "var(--accent)" }}>Browse all →</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "thin" }}>
          {airing.map((a) => <AnimeCardSmall key={a.mal_id} anime={a} zukanRating={zukanRatings[a.mal_id]} />)}
        </div>
      </section>

      {/* ── TOP RATED ── */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold">Top Rated All Time</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>The best of the best</p>
          </div>
          <Link href="/search" className="text-sm font-medium hover:underline" style={{ color: "var(--accent)" }}>Browse all →</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "thin" }}>
          {topRated.map((a) => <AnimeCardSmall key={a.mal_id} anime={a} zukanRating={zukanRatings[a.mal_id]} />)}
        </div>
      </section>

      {/* ── RECENT REVIEWS ── */}
      {recentReviews.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-lg font-bold mb-1">Recent Reviews</h2>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>What the community is saying</p>
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

      {/* ── FINAL CTA ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="rounded-3xl relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--surface) 0%, #0d0d22 100%)", border: "1px solid var(--border)" }}>
          {/* Top glow line */}
          <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.6) 30%, rgba(99,102,241,0.6) 70%, transparent 100%)" }} />
          {/* Background radial */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)" }} />

          <div className="relative px-8 sm:px-16 py-14 sm:py-20">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--accent)" }}>Get started in 30 seconds</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                Track your first anime<br />today. It&apos;s free.
              </h2>
              <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                No credit card. No trial period. Just sign up and start building your list.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold text-white text-center transition-all hover:opacity-90 hover:scale-105"
                  style={{ backgroundColor: "var(--accent)", boxShadow: "0 0 40px rgba(99,102,241,0.3)" }}
                >
                  Create your free account →
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-semibold text-center transition-all hover:opacity-80"
                  style={{ backgroundColor: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                >
                  Already have an account
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 text-xs" style={{ color: "var(--text-muted)" }}>
                {[
                  { icon: "◎", text: "5 list types" },
                  { icon: "★", text: "1–10 ratings" },
                  { icon: "⬡", text: "Public profile" },
                  { icon: "⟳", text: "30,000+ titles" },
                ].map(({ icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <span style={{ color: "var(--accent)" }}>{icon}</span> {text}
                  </span>
                ))}
              </div>
            </div>
          </div>
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
