import Image from "next/image";
import Link from "next/link";
import type { JikanAnime } from "@/lib/jikan";

interface Props {
  anime: JikanAnime;
}

export function AnimeCard({ anime }: Props) {
  const title = anime.title_english || anime.title;

  return (
    <Link href={`/anime/${anime.mal_id}`} className="group block">
      <div
        className="rounded-lg overflow-hidden transition-transform group-hover:scale-105"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <div className="relative w-full aspect-[2/3]">
          <Image
            src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
          {anime.score && (
            <div
              className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              ★ {anime.score}
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
            {title}
          </p>
          {anime.episodes && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {anime.episodes} eps
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
