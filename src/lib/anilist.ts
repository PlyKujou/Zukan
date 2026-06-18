const ENDPOINT = "https://graphql.anilist.co";

export interface Anime {
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

// Backwards-compat alias — files that still say JikanAnime will work without changes
export type JikanAnime = Anime;

interface AnilistMedia {
  id: number;
  idMal: number | null;
  title: { romaji: string; english: string | null };
  coverImage: { large: string; extraLarge: string };
  description: string | null;
  episodes: number | null;
  averageScore: number | null;
  genres: string[];
  status: string;
  startDate: { year: number | null; month: number | null; day: number | null };
  seasonYear: number | null;
  nextAiringEpisode: { episode: number; airingAt: number } | null;
}

const STATUS_MAP: Record<string, string> = {
  FINISHED: "Finished Airing",
  RELEASING: "Currently Airing",
  NOT_YET_RELEASED: "Not yet aired",
  CANCELLED: "Cancelled",
  HIATUS: "On Hiatus",
};

const DAY_NAMES = ["sundays", "mondays", "tuesdays", "wednesdays", "thursdays", "fridays", "saturdays"];

// Demographics and niche categories that AniList treats as tags, not genres
const TAG_GENRES = new Set(["Shounen", "Shoujo", "Seinen", "Josei", "Isekai"]);

const MEDIA_FIELDS = `
  id idMal
  title { romaji english }
  coverImage { large extraLarge }
  description(asHtml: false)
  episodes averageScore genres status
  startDate { year month day }
  seasonYear
  nextAiringEpisode { episode airingAt }
`;

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function mapMedia(m: AnilistMedia): Anime | null {
  if (m.idMal == null) return null;

  let broadcast: Anime["broadcast"] = null;
  if (m.nextAiringEpisode) {
    // Convert Unix timestamp to JST (UTC+9) to get correct broadcast day/time
    const jstMs = m.nextAiringEpisode.airingAt * 1000 + 9 * 3600 * 1000;
    const jst = new Date(jstMs);
    broadcast = {
      day: DAY_NAMES[jst.getUTCDay()],
      time: `${String(jst.getUTCHours()).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}`,
      timezone: "Asia/Tokyo",
    };
  }

  const sd = m.startDate;
  const airedFrom = sd.year
    ? `${sd.year}-${String(sd.month ?? 1).padStart(2, "0")}-${String(sd.day ?? 1).padStart(2, "0")}`
    : null;

  return {
    mal_id: m.idMal,
    title: m.title.romaji,
    title_english: m.title.english,
    images: {
      jpg: {
        image_url: m.coverImage.large,
        large_image_url: m.coverImage.extraLarge || m.coverImage.large,
      },
    },
    synopsis: m.description ? stripHtml(m.description) : null,
    episodes: m.episodes,
    score: m.averageScore != null ? m.averageScore / 10 : null,
    genres: m.genres.map((name, i) => ({ mal_id: i + 1, name })),
    status: STATUS_MAP[m.status] ?? m.status,
    aired: { string: airedFrom ?? "", from: airedFrom },
    year: m.seasonYear,
    broadcast,
  };
}

async function gql<T>(
  queryStr: string,
  variables: Record<string, unknown> = {},
  revalidate = 3600
): Promise<T | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: queryStr, variables }),
      next: { revalidate },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.errors) return null;
    return json.data ?? null;
  } catch {
    return null;
  }
}

function currentSeason(): { season: string; year: number } {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const season = month <= 3 ? "WINTER" : month <= 6 ? "SPRING" : month <= 9 ? "SUMMER" : "FALL";
  return { season, year };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function searchAnime(
  q: string,
  page = 1
): Promise<{ data: Anime[]; pagination: { last_visible_page: number } } | null> {
  const data = await gql<{ Page: { pageInfo: { lastPage: number }; media: AnilistMedia[] } }>(
    `query ($search: String, $page: Int) {
      Page(page: $page, perPage: 20) {
        pageInfo { lastPage }
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} }
      }
    }`,
    { search: q, page },
    60
  );
  if (!data) return null;
  const items = data.Page.media.map(mapMedia).filter((a): a is Anime => a !== null);
  return { data: items, pagination: { last_visible_page: data.Page.pageInfo.lastPage } };
}

export async function getAnime(malId: number): Promise<{ data: Anime } | null> {
  const data = await gql<{ Media: AnilistMedia }>(
    `query ($idMal: Int) {
      Media(idMal: $idMal, type: ANIME) { ${MEDIA_FIELDS} }
    }`,
    { idMal: malId },
    86400
  );
  if (!data) return null;
  const anime = mapMedia(data.Media);
  return anime ? { data: anime } : null;
}

export async function getTopAnime(
  filter: "airing" | "bypopularity" | "favorite" = "bypopularity",
  limit = 12
): Promise<Anime[]> {
  const sortMap = { airing: "TRENDING_DESC", bypopularity: "POPULARITY_DESC", favorite: "FAVOURITES_DESC" };
  const data = await gql<{ Page: { media: AnilistMedia[] } }>(
    `query ($limit: Int) {
      Page(perPage: $limit) {
        media(type: ANIME, sort: ${sortMap[filter]}, status_not: NOT_YET_RELEASED) { ${MEDIA_FIELDS} }
      }
    }`,
    { limit }
  );
  if (!data) return [];
  return data.Page.media.map(mapMedia).filter((a): a is Anime => a !== null);
}

export async function getSeasonNow(limit = 12): Promise<Anime[]> {
  const { season, year } = currentSeason();
  const data = await gql<{ Page: { media: AnilistMedia[] } }>(
    `query ($season: MediaSeason, $year: Int, $limit: Int) {
      Page(perPage: $limit) {
        media(type: ANIME, season: $season, seasonYear: $year, sort: SCORE_DESC, status_not: NOT_YET_RELEASED) { ${MEDIA_FIELDS} }
      }
    }`,
    { season, year, limit }
  );
  if (!data) return [];
  return data.Page.media.map(mapMedia).filter((a): a is Anime => a !== null).slice(0, limit);
}

export async function getAnimeByGenre(genre: string, limit = 14): Promise<Anime[]> {
  const filterKey = TAG_GENRES.has(genre) ? "tag" : "genre";
  const data = await gql<{ Page: { media: AnilistMedia[] } }>(
    `query ($limit: Int) {
      Page(perPage: $limit) {
        media(type: ANIME, ${filterKey}: "${genre}", sort: SCORE_DESC, averageScore_greater: 70, status_not: NOT_YET_RELEASED) { ${MEDIA_FIELDS} }
      }
    }`,
    { limit }
  );
  if (!data) return [];
  return data.Page.media.map(mapMedia).filter((a): a is Anime => a !== null);
}

export async function getTopMovies(limit = 14): Promise<Anime[]> {
  const data = await gql<{ Page: { media: AnilistMedia[] } }>(
    `query ($limit: Int) {
      Page(perPage: $limit) {
        media(type: ANIME, format: MOVIE, sort: SCORE_DESC, averageScore_greater: 70) { ${MEDIA_FIELDS} }
      }
    }`,
    { limit }
  );
  if (!data) return [];
  return data.Page.media.map(mapMedia).filter((a): a is Anime => a !== null);
}

export async function getSeason(year: number, season: string): Promise<Anime[]> {
  const data = await gql<{ Page: { media: AnilistMedia[] } }>(
    `query ($year: Int, $season: MediaSeason) {
      Page(perPage: 50) {
        media(type: ANIME, season: $season, seasonYear: $year, sort: SCORE_DESC) { ${MEDIA_FIELDS} }
      }
    }`,
    { year, season: season.toUpperCase() }
  );
  if (!data) return [];
  return data.Page.media.map(mapMedia).filter((a): a is Anime => a !== null);
}

export async function getSchedule(): Promise<Anime[]> {
  const { season, year } = currentSeason();
  const data = await gql<{ Page: { media: AnilistMedia[] } }>(
    `query ($season: MediaSeason, $year: Int) {
      Page(perPage: 50) {
        media(type: ANIME, season: $season, seasonYear: $year, status: RELEASING, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} }
      }
    }`,
    { season, year }
  );
  if (!data) return [];
  return data.Page.media
    .map(mapMedia)
    .filter((a): a is Anime => a !== null && a.status === "Currently Airing");
}
