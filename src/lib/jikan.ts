const BASE = "https://api.jikan.moe/v4";

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: { jpg: { image_url: string; large_image_url: string } };
  synopsis: string | null;
  episodes: number | null;
  score: number | null;
  genres: { mal_id: number; name: string }[];
  status: string;
  aired: { string: string; from: string | null };
  year: number | null;
  broadcast: { day: string | null; time: string | null; timezone: string | null } | null;
}

export async function searchAnime(query: string, page = 1): Promise<{ data: JikanAnime[]; pagination: { last_visible_page: number } }> {
  const res = await fetch(`${BASE}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=20&sfw`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("Jikan search failed");
  return res.json();
}

export async function getAnime(id: number): Promise<{ data: JikanAnime }> {
  const res = await fetch(`${BASE}/anime/${id}`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error("Jikan fetch failed");
  return res.json();
}

export async function getTopAnime(filter: "airing" | "bypopularity" | "favorite" = "bypopularity", limit = 12): Promise<JikanAnime[]> {
  const res = await fetch(`${BASE}/top/anime?filter=${filter}&limit=${limit}&sfw`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export async function getSeasonNow(limit = 12): Promise<JikanAnime[]> {
  const res = await fetch(`${BASE}/seasons/now?limit=${limit}&sfw`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []).sort((a: JikanAnime, b: JikanAnime) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
}

export async function getAnimeByGenre(genreId: number, limit = 14): Promise<JikanAnime[]> {
  const res = await fetch(
    `${BASE}/anime?genres=${genreId}&order_by=score&sort=desc&limit=${limit}&sfw&min_score=7`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export async function getTopMovies(limit = 14): Promise<JikanAnime[]> {
  const res = await fetch(`${BASE}/top/anime?type=movie&limit=${limit}&sfw`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export async function getSeason(year: number, season: string): Promise<JikanAnime[]> {
  const res = await fetch(`${BASE}/seasons/${year}/${season}?limit=25&sfw`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []).sort((a: JikanAnime, b: JikanAnime) => (b.score ?? 0) - (a.score ?? 0));
}

export async function getSchedule(): Promise<JikanAnime[]> {
  // Fetch currently airing anime with broadcast day info — up to 3 pages
  const pages = await Promise.allSettled([
    fetch(`${BASE}/seasons/now?limit=25&sfw&page=1`, { next: { revalidate: 3600 } }).then((r) => r.json()),
    fetch(`${BASE}/seasons/now?limit=25&sfw&page=2`, { next: { revalidate: 3600 } }).then((r) => r.json()),
    fetch(`${BASE}/seasons/now?limit=25&sfw&page=3`, { next: { revalidate: 3600 } }).then((r) => r.json()),
  ]);
  const all: JikanAnime[] = [];
  for (const p of pages) {
    if (p.status === "fulfilled") all.push(...(p.value.data ?? []));
  }
  return all.filter((a) => a.status === "Currently Airing");
}
