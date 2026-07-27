import { getAnime, type MediaType } from "@/lib/anilist";
import Image from "next/image";
import { Star } from "lucide-react";
import { AddToListButton } from "@/components/AddToListButton";
import { ReviewSection } from "@/components/ReviewSection";
import { CommentSection } from "@/components/CommentSection";
import { createPublicClient } from "@/lib/supabase/public";
import { notFound } from "next/navigation";

interface Props {
  id: string;
  mediaType: MediaType;
}

export async function MediaDetail({ id, mediaType }: Props) {
  const isManga = mediaType === "manga";
  const supabase = createPublicClient();

  const [mediaResult, { data: reviews }] = await Promise.all([
    getAnime(parseInt(id, 10), mediaType),
    supabase
      .from("reviews")
      .select("rating")
      .eq("mal_id", parseInt(id, 10))
      .eq("media_type", mediaType),
  ]);

  if (!mediaResult) notFound();
  const media = mediaResult.data;
  const title = media.title_english || media.title;
  const totalUnits = isManga ? media.chapters : media.episodes;
  const zukanRating = reviews && reviews.length > 0
    ? (reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row gap-8">
        <div className="shrink-0 w-full sm:w-48">
          <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", boxShadow: "0 16px 48px rgba(0,0,0,0.4)" }}>
            <Image
              src={media.images.jpg.large_image_url}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 192px"
            />
          </div>
          <div className="mt-4">
            <AddToListButton
              malId={media.mal_id}
              title={title}
              imageUrl={media.images.jpg.image_url}
              episodes={totalUnits}
              mediaType={mediaType}
            />
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">{title}</h1>
          {media.title_english && media.title_english !== media.title && (
            <p className="mb-3 text-sm" style={{ color: "var(--text-muted)" }}>{media.title}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-4 text-sm">
            {media.score && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg font-mono-nums" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--accent-2)" }}>
                <Star size={12} fill="currentColor" strokeWidth={0} />
                {media.score}
              </span>
            )}
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg font-semibold font-mono-nums" style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-dim-border)" }}>
              Z {zukanRating ?? "—"}
            </span>
            {isManga ? (
              <>
                {media.chapters && (
                  <span className="px-2 py-1 rounded-lg font-mono-nums" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    {media.chapters} chapters
                  </span>
                )}
                {media.volumes && (
                  <span className="px-2 py-1 rounded-lg font-mono-nums" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    {media.volumes} volumes
                  </span>
                )}
              </>
            ) : (
              media.episodes && (
                <span className="px-2 py-1 rounded-lg font-mono-nums" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  {media.episodes} episodes
                </span>
              )
            )}
            <span className="px-2 py-1 rounded-lg" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
              {media.status}
            </span>
            {media.year && (
              <span className="px-2 py-1 rounded-lg font-mono-nums" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
                {media.year}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {media.genres.map((g) => (
              <span
                key={g.mal_id}
                className="text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-semibold"
                style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-dim-border)" }}
              >
                {g.name}
              </span>
            ))}
          </div>

          {media.synopsis && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {media.synopsis}
            </p>
          )}
        </div>
      </div>

      <ReviewSection malId={media.mal_id} animeTitle={title} mediaType={mediaType} />
      <CommentSection malId={media.mal_id} mediaType={mediaType} />
    </div>
  );
}
