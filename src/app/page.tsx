import Link from "next/link";
import Image from "next/image";
import { getTopAnime, getSeasonNow } from "@/lib/jikan";
import type { JikanAnime } from "@/lib/jikan";

function AnimeCard({ anime }: { anime: JikanAnime }) {
  const title = anime.title_english || anime.title;
  return (
    <Link href={`/anime/${anime.mal_id}`} className="group shrink-0 w-32">
      <div className="relative w-32 h-48 rounded-xl overflow-hidden">
        <Image
          src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="128px"
        />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
        />
        {anime.score && (
          <div
            className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-md"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            ★ {anime.score}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs font-medium leading-snug line-clamp-2" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
    </Link>
  );
}

const FEATURES = [
  {
    icon: "◎",
    title: "Track Everything",
    desc: "Watching, completed, on hold, dropped — every show has a place on your list.",
  },
  {
    icon: "★",
    title: "Rate & Review",
    desc: "Score each anime out of 10 and add personal notes so you never forget how you felt.",
  },
  {
    icon: "⬡",
    title: "Your Profile",
    desc: "Share your list publicly or keep it private. Your stats update automatically.",
  },
  {
    icon: "⟳",
    title: "Always Current",
    desc: "Powered by MyAnimeList data — thousands of shows, always up to date.",
  },
];

export default async function HomePage() {
  const [airing, topRated] = await Promise.all([
    getSeasonNow(18),
    getTopAnime("favorite", 18),
  ]);

  return (
    <div style={{ backgroundColor: "var(--bg)" }}>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">

        {/* Blurred anime mosaic background */}
        <div className="absolute inset-0 flex flex-wrap gap-0 opacity-15 pointer-events-none select-none">
          {[...airing, ...topRated].slice(0, 24).map((a) => (
            <div key={a.mal_id} className="relative" style={{ width: "8.33%", height: "100%" }}>
              <Image
                src={a.images.jpg.large_image_url || a.images.jpg.image_url}
                alt=""
                fill
                className="object-cover"
                sizes="8vw"
              />
            </div>
          ))}
        </div>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(15,15,21,0.85) 0%, rgba(15,15,21,0.7) 50%, rgba(15,15,21,1) 100%)" }}
        />

        {/* Hero content */}
        <div className="relative max-w-6xl mx-auto px-4 pt-28 pb-24 text-center">
          <div
            className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6"
            style={{ backgroundColor: "rgba(124,106,255,0.15)", color: "var(--accent)", border: "1px solid rgba(124,106,255,0.3)" }}
          >
            Free · No ads · Always open
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-5 tracking-tight">
            Your anime.<br />
            <span style={{ color: "var(--accent)" }}>Your list.</span>
          </h1>

          <p className="text-base sm:text-lg max-w-xl mx-auto mb-10" style={{ color: "var(--text-muted)" }}>
            Track every show you've watched, rate them, log your progress, and build a profile that's actually yours.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/signup"
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "var(--accent)" }}
            >
              Get started free
            </Link>
            <Link
              href="/search"
              className="px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              Browse anime
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-6"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div
                className="text-2xl mb-4 w-11 h-11 flex items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(124,106,255,0.12)", color: "var(--accent)" }}
              >
                {f.icon}
              </div>
              <h3 className="font-bold mb-1">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Airing now ── */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Airing This Season</h2>
          <Link href="/search" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>
            Browse all →
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "thin" }}>
          {airing.map((a) => <AnimeCard key={a.mal_id} anime={a} />)}
        </div>
      </section>

      {/* ── Top rated ── */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Top Rated All Time</h2>
          <Link href="/search" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>
            Browse all →
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "thin" }}>
          {topRated.map((a) => <AnimeCard key={a.mal_id} anime={a} />)}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div
          className="rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center top, rgba(124,106,255,0.12) 0%, transparent 70%)" }}
          />
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 relative">
            Ready to start tracking?
          </h2>
          <p className="text-sm mb-8 relative" style={{ color: "var(--text-muted)" }}>
            Join and build your list in seconds. It's completely free.
          </p>
          <Link
            href="/signup"
            className="px-8 py-3 rounded-xl text-sm font-semibold text-white inline-block relative transition-colors"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Create your free account
          </Link>
        </div>
      </section>

    </div>
  );
}
