export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { AnimeCard } from "@/components/AnimeCard";
import {
  searchAnime, getSeasonNow, getTopAnime, getAnimeByGenre, getTopMovies, type MediaType,
} from "@/lib/anilist";
import type { JikanAnime } from "@/lib/anilist";
import { createClient } from "@/lib/supabase/server";
import { getZukanRatings } from "@/lib/supabase/ratings";

interface Props {
  searchParams: Promise<{ q?: string; page?: string; type?: string }>;
}

interface UserResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  entryCount: number;
  completedCount: number;
}

async function searchUsers(q: string): Promise<UserResult[]> {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .ilike("username", `%${q}%`)
    .limit(20);

  if (!profiles || profiles.length === 0) return [];

  const results = await Promise.all(
    profiles.map(async (p) => {
      const { count: entryCount } = await supabase
        .from("list_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", p.id)
        .eq("media_type", "anime");
      const { count: completedCount } = await supabase
        .from("list_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", p.id)
        .eq("media_type", "anime")
        .eq("status", "completed");
      return { ...p, entryCount: entryCount ?? 0, completedCount: completedCount ?? 0 };
    })
  );

  return results;
}

const TYPE_TABS: { label: string; value: string }[] = [
  { label: "Anime", value: "anime" },
  { label: "Manga", value: "manga" },
  { label: "People", value: "users" },
];

function typeHref(value: string, q: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (value !== "anime") params.set("type", value);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

function TypeTabs({ active, q }: { active: string; q: string }) {
  return (
    <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
      {TYPE_TABS.map(({ label, value }) => (
        <Link key={value} href={typeHref(value, q)}
          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: value === active ? "var(--accent)" : "transparent",
            color: value === active ? "#fff" : "var(--text-muted)",
          }}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

interface DiscoveryTask {
  key: string;
  title: string;
  fetch: () => Promise<JikanAnime[]>;
}

function discoveryTasks(mediaType: MediaType): DiscoveryTask[] {
  const tasks: DiscoveryTask[] = [
    { key: "topRated",    title: "Top Rated All Time", fetch: () => getTopAnime("favorite", 14, mediaType) },
    { key: "popular",     title: "Most Popular",       fetch: () => getTopAnime("bypopularity", 14, mediaType) },
    { key: "romance",     title: "Best Romance",       fetch: () => getAnimeByGenre("Romance", 14, mediaType) },
    { key: "action",      title: "Best Action",        fetch: () => getAnimeByGenre("Action", 14, mediaType) },
    { key: "comedy",      title: "Best Comedy",        fetch: () => getAnimeByGenre("Comedy", 14, mediaType) },
    { key: "fantasy",     title: "Best Fantasy",       fetch: () => getAnimeByGenre("Fantasy", 14, mediaType) },
    { key: "scifi",       title: "Best Sci-Fi",        fetch: () => getAnimeByGenre("Sci-Fi", 14, mediaType) },
    { key: "mystery",     title: "Best Mystery",       fetch: () => getAnimeByGenre("Mystery", 14, mediaType) },
    { key: "sol",         title: "Best Slice of Life", fetch: () => getAnimeByGenre("Slice of Life", 14, mediaType) },
    { key: "horror",      title: "Best Horror",        fetch: () => getAnimeByGenre("Horror", 14, mediaType) },
    { key: "supernatural",title: "Best Supernatural",  fetch: () => getAnimeByGenre("Supernatural", 14, mediaType) },
    { key: "shounen",     title: "Best Shounen",       fetch: () => getAnimeByGenre("Shounen", 14, mediaType) },
    { key: "seinen",      title: "Best Seinen",        fetch: () => getAnimeByGenre("Seinen", 14, mediaType) },
  ];
  if (mediaType === "anime") {
    tasks.unshift({ key: "airing", title: "Airing This Season", fetch: () => getSeasonNow(14) });
    tasks.splice(12, 0, { key: "movies", title: "Top Movies", fetch: () => getTopMovies(14) });
  }
  return tasks;
}

function ScrollRow({ items, ratings }: { items: JikanAnime[]; ratings: Record<number, string> }) {
  const unique = items.filter((a, i, arr) => arr.findIndex((x) => x.mal_id === a.mal_id) === i);
  if (unique.length === 0) {
    return (
      <p className="text-xs py-1" style={{ color: "var(--text-muted)" }}>
        Unavailable right now — try again in a moment.
      </p>
    );
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-3" style={{ scrollbarWidth: "thin" }}>
      {unique.map((anime) => (
        <div key={anime.mal_id} className="shrink-0 w-32">
          <AnimeCard anime={anime} zukanRating={ratings[anime.mal_id]} />
        </div>
      ))}
    </div>
  );
}

function Section({ title, items, ratings }: { title: string; items: JikanAnime[]; ratings: Record<number, string> }) {
  return (
    <section className="mb-10">
      <h2 className="text-base font-bold mb-3">{title}</h2>
      <ScrollRow items={items} ratings={ratings} />
    </section>
  );
}

async function fetchForYou(genres: string[]): Promise<{ title: string; items: JikanAnime[] }[]> {
  const picks = genres.slice(0, 4); // show up to 4 personalised sections
  const results = await Promise.allSettled(
    picks.map((g) => getAnimeByGenre(g, 14))
  );
  return picks.map((g, i) => ({
    title: `Top ${g}`,
    items: results[i].status === "fulfilled" ? results[i].value : [],
  }));
}

async function fetchDiscovery(mediaType: MediaType): Promise<{ title: string; items: JikanAnime[] }[]> {
  const tasks = discoveryTasks(mediaType);
  const results = await Promise.allSettled(tasks.map((t) => t.fetch()));
  return tasks.map((t, i) => ({
    title: t.title,
    items: results[i].status === "fulfilled" ? results[i].value : [],
  }));
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1", type = "anime" } = await searchParams;
  const currentPage = parseInt(page, 10) || 1;
  const hasQuery = q.trim().length > 0;
  const isPeople = type === "users";
  const mediaType: MediaType = type === "manga" ? "manga" : "anime";
  const isManga = mediaType === "manga";

  // User search path
  if (isPeople) {
    const userResults = hasQuery ? await searchUsers(q.trim()) : [];
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Search bar + type tabs */}
        <form method="GET" className="flex gap-2 mb-6">
          <input name="q" defaultValue={q} placeholder="Search by username…" autoComplete="off"
            className="flex-1 px-4 py-2.5 text-sm"
          />
          <input type="hidden" name="type" value="users" />
          <button type="submit" className="btn btn-primary px-5">
            <Search size={14} strokeWidth={2.5} />
            Search
          </button>
        </form>
        <TypeTabs active="users" q={q} />

        {!hasQuery && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Type a username to search for people.</p>
        )}
        {hasQuery && userResults.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No users found for &quot;{q}&quot;.</p>
        )}
        {userResults.length > 0 && (
          <div className="space-y-2">
            {userResults.map((u) => (
              <Link key={u.id} href={`/profile/${u.username}`}
                className="card card-hover flex items-center gap-4 p-4"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold"
                  style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--accent)" }}
                >
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                    : (u.display_name || u.username)[0]?.toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{u.display_name || u.username}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>@{u.username}</p>
                  {u.bio && <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{u.bio}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold font-mono-nums">{u.completedCount}</p>
                  <p className="eyebrow" style={{ fontSize: "0.5625rem" }}>completed</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Get logged-in user's genre preferences (anime only — favorite_genres isn't split by media type)
  let forYou: { title: string; items: JikanAnime[] }[] = [];
  if (!hasQuery && !isManga) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("favorite_genres")
        .eq("id", user.id)
        .maybeSingle();
      const genres: string[] = profile?.favorite_genres ?? [];
      if (genres.length > 0) forYou = await fetchForYou(genres);
    }
  }

  const [results, discovery] = await Promise.all([
    hasQuery ? searchAnime(q.trim(), currentPage, mediaType) : Promise.resolve(null),
    hasQuery ? Promise.resolve(null) : fetchDiscovery(mediaType),
  ]);

  const allMalIds = (results?.data ?? [...(discovery ?? []).flatMap((s) => s.items), ...forYou.flatMap((s) => s.items)]).map((a) => a.mal_id);
  const zukanRatings = await getZukanRatings(allMalIds, mediaType);

  const lastPage = results?.pagination.last_visible_page ?? 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* Search bar */}
      <form method="GET" className="flex gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder={`Search ${isManga ? "manga" : "anime"} by title…`}
          autoComplete="off"
          className="flex-1 px-4 py-2.5 text-sm"
        />
        {isManga && <input type="hidden" name="type" value="manga" />}
        <button type="submit" className="btn btn-primary px-5">
          <Search size={14} strokeWidth={2.5} />
          Search
        </button>
      </form>

      <TypeTabs active={mediaType} q={q} />

      {/* Search results */}
      {hasQuery && results === null && (
        <p style={{ color: "var(--text-muted)" }}>Search is unavailable right now — the {isManga ? "manga" : "anime"} database may be rate-limiting requests. Try again in a moment.</p>
      )}
      {hasQuery && results && results.data.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No results for &quot;{q}&quot;.</p>
      )}

      {hasQuery && results && results.data.length > 0 && (
        <>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Results for &quot;<span style={{ color: "var(--text)" }}>{q}</span>&quot;
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 stagger">
            {results.data.map((anime) => (
              <AnimeCard key={anime.mal_id} anime={anime} showGenres zukanRating={zukanRatings[anime.mal_id]} />
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 mt-10">
            {currentPage > 1 && (
              <Link
                href={`/search?q=${encodeURIComponent(q)}${isManga ? "&type=manga" : ""}&page=${currentPage - 1}`}
                className="btn btn-ghost text-sm px-4 py-2"
              >
                <ArrowLeft size={14} strokeWidth={2.5} />
                Prev
              </Link>
            )}
            <span style={{ color: "var(--text-muted)" }} className="text-sm font-mono-nums">
              Page {currentPage} / {lastPage}
            </span>
            {currentPage < lastPage && (
              <Link
                href={`/search?q=${encodeURIComponent(q)}${isManga ? "&type=manga" : ""}&page=${currentPage + 1}`}
                className="btn btn-ghost text-sm px-4 py-2"
              >
                Next
                <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            )}
          </div>
        </>
      )}

      {/* Discovery sections */}
      {!hasQuery && (
        <>
          {/* Personalised sections at the top */}
          {forYou.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <span className="eyebrow px-2.5 py-1 rounded-full" style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)" }}>
                  For You
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>based on your preferences</span>
              </div>
              {forYou.map(({ title, items }) => (
                <Section key={title} title={title} items={items} ratings={zukanRatings} />
              ))}
              <div className="my-8 h-px" style={{ backgroundColor: "var(--border)" }} />
            </>
          )}

          {discovery && discovery.map(({ title, items }) => (
            <Section key={title} title={title} items={items} ratings={zukanRatings} />
          ))}
        </>
      )}
    </div>
  );
}
