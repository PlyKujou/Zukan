import { searchAnime } from "@/lib/jikan";
import { AnimeCard } from "@/components/AnimeCard";

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1" } = await searchParams;
  const currentPage = parseInt(page, 10) || 1;

  let results = null;
  let lastPage = 1;
  if (q.trim()) {
    const data = await searchAnime(q.trim(), currentPage);
    results = data.data;
    lastPage = data.pagination.last_visible_page;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Search Anime</h1>

      <form method="GET" className="flex gap-2 mb-8">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by title…"
          className="flex-1 px-3 py-2 rounded-md text-sm"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-md text-sm font-semibold text-white cursor-pointer"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Search
        </button>
      </form>

      {results === null && (
        <p style={{ color: "var(--text-muted)" }}>Enter a title to search.</p>
      )}

      {results !== null && results.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No results for &quot;{q}&quot;.</p>
      )}

      {results && results.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {results.map((anime) => (
              <AnimeCard key={anime.mal_id} anime={anime} />
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 mt-10">
            {currentPage > 1 && (
              <a
                href={`/search?q=${encodeURIComponent(q)}&page=${currentPage - 1}`}
                className="px-4 py-2 rounded-md text-sm"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                ← Prev
              </a>
            )}
            <span style={{ color: "var(--text-muted)" }} className="text-sm">
              Page {currentPage} / {lastPage}
            </span>
            {currentPage < lastPage && (
              <a
                href={`/search?q=${encodeURIComponent(q)}&page=${currentPage + 1}`}
                className="px-4 py-2 rounded-md text-sm"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                Next →
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
