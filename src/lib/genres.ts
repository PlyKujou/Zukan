export const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life",
  "Supernatural", "Psychological", "Sports", "Mecha",
  "Historical", "Isekai", "Shounen", "Shoujo", "Seinen", "Josei",
] as const;

export type Genre = typeof GENRES[number];

// Maps our genre labels to Jikan/MAL genre IDs
export const GENRE_ID_MAP: Record<string, number> = {
  "Action": 1,
  "Adventure": 2,
  "Comedy": 4,
  "Drama": 8,
  "Fantasy": 10,
  "Horror": 14,
  "Mystery": 7,
  "Romance": 22,
  "Sci-Fi": 24,
  "Slice of Life": 36,
  "Supernatural": 37,
  "Psychological": 40,
  "Sports": 30,
  "Mecha": 18,
  "Historical": 13,
  "Isekai": 62,
  "Shounen": 27,
  "Shoujo": 25,
  "Seinen": 42,
  "Josei": 43,
};
