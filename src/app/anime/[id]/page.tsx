import { getAnime } from "@/lib/jikan";
import Image from "next/image";
import { AddToListButton } from "@/components/AddToListButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AnimePage({ params }: Props) {
  const { id } = await params;
  const { data: anime } = await getAnime(parseInt(id, 10));
  const title = anime.title_english || anime.title;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row gap-8">
        <div className="shrink-0 w-full sm:w-48">
          <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden">
            <Image
              src={anime.images.jpg.large_image_url}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 192px"
            />
          </div>
          <div className="mt-4">
            <AddToListButton
              malId={anime.mal_id}
              title={title}
              imageUrl={anime.images.jpg.image_url}
              episodes={anime.episodes}
            />
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">{title}</h1>
          {anime.title_english && anime.title_english !== anime.title && (
            <p className="mb-3 text-sm" style={{ color: "var(--text-muted)" }}>{anime.title}</p>
          )}

          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            {anime.score && (
              <span className="px-2 py-1 rounded" style={{ backgroundColor: "var(--surface-2)" }}>
                ★ {anime.score}
              </span>
            )}
            {anime.episodes && (
              <span className="px-2 py-1 rounded" style={{ backgroundColor: "var(--surface-2)" }}>
                {anime.episodes} episodes
              </span>
            )}
            <span className="px-2 py-1 rounded" style={{ backgroundColor: "var(--surface-2)" }}>
              {anime.status}
            </span>
            {anime.year && (
              <span className="px-2 py-1 rounded" style={{ backgroundColor: "var(--surface-2)" }}>
                {anime.year}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {anime.genres.map((g) => (
              <span
                key={g.mal_id}
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              >
                {g.name}
              </span>
            ))}
          </div>

          {anime.synopsis && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {anime.synopsis}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
