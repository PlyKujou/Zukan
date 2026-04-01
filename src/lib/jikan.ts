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
  aired: { string: string };
  year: number | null;
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
