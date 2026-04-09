export const dynamic = "force-dynamic";

import Link from "next/link";
import { AnimeCard } from "@/components/AnimeCard";
import { searchAnime, getSeasonNow, getTopAnime, getAnimeByGenre, getTopMovies } from "@/lib/jikan";
import type { JikanAnime } from "@/lib/jikan";
import { createClient } from "@/lib/supabase/server";
import { GENRE_ID_MAP } from "@/lib/genres";
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
        .eq("user_id", p.id);
      const { count: completedCount } = await supabase
        .from("list_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", p.id)
        .eq("status", "completed");
      return { ...p, entryCount: entryCount ?? 0, completedCount: completedCount ?? 0 };
    })
  );

  return results;
}

const SECTIONS = [
  { title: "Airing This Season",   key: "airing" },
  { title: "Top Rated All Time",   key: "topRated" },
  { title: "Most Popular",         key: "popular" },
  { title: "Best Romance",         key: "romance" },
  { title: "Best Action",          key: "action" },
  { title: "Best Comedy",          key: "comedy" },
  { title: "Best Fantasy",         key: "fantasy" },
  { title: "Best Sci-Fi",          key: "scifi" },
  { title: "Best Mystery",         key: "mystery" },
  { title: "Best Slice of Life",   key: "sol" },
  { title: "Best Horror",          key: "horror" },
  { title: "Best Supernatural",    key: "supernatural" },
  { title: "Top Movies",           key: "movies" },
  { title: "Best Shounen",         key: "shounen" },
  { title: "Best Seinen",          key: "seinen" },
] as const;

function ScrollRow({ items, ratings }: { items: JikanAnime[]; ratings: Record<number, string> }) {
  if (items.length === 0) return null;
  const unique = items.filter((a, i, arr) => arr.findIndex((x) => x.mal_id === a.mal_id) === i);
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
  if (items.length === 0) return null;
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
    picks.map((g) => getAnimeByGenre(GENRE_ID_MAP[g] ?? 1, 14))
  );
  return picks.map((g, i) => ({
    title: `Top ${g}`,
    items: results[i].status === "fulfilled" ? results[i].value : [],
  }));
}

async function fetchDiscovery() {
  const results = await Promise.allSettled([
    getSeasonNow(14),
    getTopAnime("favorite", 14),
    getTopAnime("bypopularity", 14),
    getAnimeByGenre(22, 14),   // Romance
    getAnimeByGenre(1, 14),    // Action
    getAnimeByGenre(4, 14),    // Comedy
    getAnimeByGenre(10, 14),   // Fantasy
    getAnimeByGenre(24, 14),   // Sci-Fi
    getAnimeByGenre(7, 14),    // Mystery
    getAnimeByGenre(36, 14),   // Slice of Life
    getAnimeByGenre(14, 14),   // Horror
    getAnimeByGenre(37, 14),   // Supernatural
    getTopMovies(14),
    getAnimeByGenre(27, 14),   // Shounen
    getAnimeByGenre(42, 14),   // Seinen
  ]);

  return results.map((r) => (r.status === "fulfilled" ? r.value : []));
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1", type = "anime" } = await searchParams;
  const currentPage = parseInt(page, 10) || 1;
  const hasQuery = q.trim().length > 0;
  const isPeople = type === "users";

  // User search path
  if (isPeople) {
    const userResults = hasQuery ? await searchUsers(q.trim()) : [];
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Search bar + type tabs */}
        <form method="GET" className="flex gap-2 mb-6">
          <input name="q" defaultValue={q} placeholder="Search by username…" autoComplete="off"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <input type="hidden" name="type" value="users" />
          <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ backgroundColor: "var(--accent)" }}>
            Search
          </button>
        </form>
        <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ backgroundColor: "var(--surface)" }}>
          {[
            { label: "Anime", href: q ? `/search?q=${encodeURIComponent(q)}` : "/search" },
            { label: "People", href: q ? `/search?q=${encodeURIComponent(q)}&type=users` : "/search?type=users" },
          ].map(({ label, href }) => (
            <Link key={label} href={href}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: label === "People" ? "var(--accent)" : "transparent",
                color: label === "People" ? "#fff" : "var(--text-muted)",
              }}
            >
              {label}
            </Link>
          ))}
        </div>

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
                className="flex items-center gap-4 p-4 rounded-xl hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
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
                  <p className="text-sm font-semibold">{u.completedCount}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>completed</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Get logged-in user's genre preferences
  let forYou: { title: string; items: JikanAnime[] }[] = [];
  if (!hasQuery) {
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
    hasQuery ? searchAnime(q.trim(), currentPage) : Promise.resolve(null),
    hasQuery ? Promise.resolve(null) : fetchDiscovery(),
  ]);

  const allMalIds = results
    ? results.data.map((a) => a.mal_id)
    : [...(discovery ?? []).flat(), ...forYou.flatMap((s) => s.items)].map((a) => a.mal_id);
  const zukanRatings = await getZukanRatings(allMalIds);

  const lastPage = results?.pagination.last_visible_page ?? 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* Search bar */}
      <form method="GET" className="flex gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search anime by title…"
          autoComplete="off"
          className="flex-1 px-4 py-2.5 rounded-xl text-sm"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Search
        </button>
      </form>

      {/* Anime / People tab */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ backgroundColor: "var(--surface)" }}>
        {[
          { label: "Anime", href: q ? `/search?q=${encodeURIComponent(q)}` : "/search" },
          { label: "People", href: q ? `/search?q=${encodeURIComponent(q)}&type=users` : "/search?type=users" },
        ].map(({ label, href }) => (
          <Link key={label} href={href}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: label === "Anime" ? "var(--accent)" : "transparent",
              color: label === "Anime" ? "#fff" : "var(--text-muted)",
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Search results */}
      {hasQuery && results && results.data.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No results for &quot;{q}&quot;.</p>
      )}

      {hasQuery && results && results.data.length > 0 && (
        <>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Results for &quot;<span style={{ color: "var(--text)" }}>{q}</span>&quot;
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {results.data.map((anime) => (
              <AnimeCard key={anime.mal_id} anime={anime} showGenres zukanRating={zukanRatings[anime.mal_id]} />
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 mt-10">
            {currentPage > 1 && (
              <Link
                href={`/search?q=${encodeURIComponent(q)}&page=${currentPage - 1}`}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                ← Prev
              </Link>
            )}
            <span style={{ color: "var(--text-muted)" }} className="text-sm">
              Page {currentPage} / {lastPage}
            </span>
            {currentPage < lastPage && (
              <Link
                href={`/search?q=${encodeURIComponent(q)}&page=${currentPage + 1}`}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                Next →
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
                <span className="text-xs font-semibold uppercase tracking-widest px-2 py-1 rounded-full" style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)" }}>
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

          {discovery && SECTIONS.map(({ title, key }, i) => (
            <Section key={key} title={title} items={discovery[i] ?? []} ratings={zukanRatings} />
          ))}
        </>
      )}
    </div>
  );
}
