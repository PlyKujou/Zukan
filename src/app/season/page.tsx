export const dynamic = "force-dynamic";

import { getSchedule, getSeason } from "@/lib/jikan";
import type { JikanAnime } from "@/lib/jikan";
import { createClient } from "@/lib/supabase/server";
import { getZukanRatings } from "@/lib/supabase/ratings";
import Image from "next/image";
import Link from "next/link";

// Map Jikan broadcast day strings to JS day index (0=Sun)
const DAY_MAP: Record<string, number> = {
  sundays: 0, mondays: 1, tuesdays: 2, wednesdays: 3,
  thursdays: 4, fridays: 5, saturdays: 6,
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getWeekDates(): Date[] {
  const today = new Date();
  // Start from the most recent Saturday (or today if Saturday)
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const startOffset = dayOfWeek === 6 ? 0 : -(dayOfWeek + 1); // go back to last Sat
  // Actually let's show Mon–Sun with today in context
  // Start from Monday of current week
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function estimateEpisode(anime: JikanAnime): number | null {
  if (!anime.aired?.from) return null;
  const start = new Date(anime.aired.from);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return null;
  const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  const ep = weeks + 1;
  if (anime.episodes && ep > anime.episodes) return anime.episodes;
  return ep;
}

// Convert JST time to local approximate display (just show JST label)
function formatTime(time: string | null): string | null {
  if (!time) return null;
  return `${time} JST`;
}

const SEASONS = ["winter", "spring", "summer", "fall"] as const;
type Season = typeof SEASONS[number];

function currentSeason(): { year: number; season: Season } {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const season: Season = month <= 3 ? "winter" : month <= 6 ? "spring" : month <= 9 ? "summer" : "fall";
  return { year, season };
}

interface Props {
  searchParams: Promise<{ view?: string; year?: string; season?: string }>;
}

export default async function SeasonPage({ searchParams }: Props) {
  const { view = "schedule", year: qYear, season: qSeason } = await searchParams;
  const def = currentSeason();
  const year = parseInt(qYear ?? String(def.year), 10);
  const season = (SEASONS.includes(qSeason as Season) ? qSeason : def.season) as Season;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const anime = view === "schedule"
    ? await getSchedule()
    : await getSeason(year, season);

  const malIds = anime.map((a) => a.mal_id);
  const zukanRatings = await getZukanRatings(malIds);

  const myEntries: Record<number, string> = {};
  if (user && malIds.length > 0) {
    const { data: entries } = await supabase
      .from("list_entries").select("mal_id, status").eq("user_id", user.id).in("mal_id", malIds);
    entries?.forEach((e) => { myEntries[e.mal_id] = e.status; });
  }

  const STATUS_COLORS: Record<string, string> = {
    watching: "var(--accent)", completed: "#22c55e",
    plan_to_watch: "#60a5fa", on_hold: "#facc15", dropped: "#f87171",
  };
  const STATUS_SHORT: Record<string, string> = {
    watching: "Watching", completed: "Done",
    plan_to_watch: "PTW", on_hold: "Hold", dropped: "Dropped",
  };

  // Group by broadcast day
  const byDay: Record<number, JikanAnime[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  const unknown: JikanAnime[] = [];
  for (const a of anime) {
    const dayStr = a.broadcast?.day?.toLowerCase();
    const dayIdx = dayStr ? DAY_MAP[dayStr] : undefined;
    if (dayIdx !== undefined) byDay[dayIdx].push(a);
    else unknown.push(a);
  }
  // Sort each day by air time
  for (const day of Object.values(byDay)) {
    day.sort((a, b) => (a.broadcast?.time ?? "99:99").localeCompare(b.broadcast?.time ?? "99:99"));
  }

  const weekDates = getWeekDates(); // Mon–Sun
  const todayIdx = new Date().getDay(); // 0=Sun
  // weekDates[0]=Mon(1), weekDates[6]=Sun(0) — map to JS day index
  const weekDayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon…Sun

  const seasonIdx = SEASONS.indexOf(season);
  const prevSeason = seasonIdx === 0 ? { year: year - 1, season: SEASONS[3] } : { year, season: SEASONS[seasonIdx - 1] };
  const nextSeason = seasonIdx === 3 ? { year: year + 1, season: SEASONS[0] } : { year, season: SEASONS[seasonIdx + 1] };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {view === "schedule" ? "This Week's Schedule" : <span className="capitalize">{season} {year}</span>}
          </h1>
          {view === "schedule" && (
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {anime.length} airing
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <Link
              href="/season?view=schedule"
              className="px-3 py-1.5 text-sm font-medium"
              style={{ backgroundColor: view === "schedule" ? "var(--accent)" : "var(--surface)", color: view === "schedule" ? "#fff" : "var(--text-muted)" }}
            >
              Schedule
            </Link>
            <Link
              href={`/season?view=grid&year=${year}&season=${season}`}
              className="px-3 py-1.5 text-sm font-medium"
              style={{ backgroundColor: view === "grid" ? "var(--accent)" : "var(--surface)", color: view === "grid" ? "#fff" : "var(--text-muted)" }}
            >
              Grid
            </Link>
          </div>

          {/* Season nav (grid view only) */}
          {view === "grid" && (
            <>
              <Link href={`/season?view=grid&year=${prevSeason.year}&season=${prevSeason.season}`} className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                ← {prevSeason.season}
              </Link>
              <Link href={`/season?view=grid&year=${def.year}&season=${def.season}`} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--accent)" }}>
                Now
              </Link>
              <Link href={`/season?view=grid&year=${nextSeason.year}&season=${nextSeason.season}`} className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                {nextSeason.season} →
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── SCHEDULE VIEW ── */}
      {view === "schedule" && (
        <div className="stagger grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: "repeat(7, minmax(130px, 1fr))" }}>
          {weekDayOrder.map((jsDay, colIdx) => {
            const date = weekDates[colIdx];
            const isToday = jsDay === todayIdx;
            const shows = byDay[jsDay] ?? [];
            return (
              <div key={jsDay}>
                {/* Day header */}
                <div
                  className="rounded-xl px-3 py-2 mb-2 text-center"
                  style={{
                    backgroundColor: isToday ? "var(--accent)" : "var(--surface)",
                    border: `1px solid ${isToday ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  <p className="text-sm font-bold" style={{ color: isToday ? "#fff" : "var(--text)" }}>{DAYS[jsDay]}</p>
                  <p className="text-xs" style={{ color: isToday ? "rgba(255,255,255,0.75)" : "var(--text-muted)" }}>
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>

                {/* Anime cards */}
                <div className="space-y-2">
                  {shows.length === 0 && (
                    <p className="text-xs text-center py-3" style={{ color: "var(--border)" }}>—</p>
                  )}
                  {shows.map((a) => {
                    const title = a.title_english || a.title;
                    const ep = estimateEpisode(a);
                    const status = myEntries[a.mal_id];
                    const time = formatTime(a.broadcast?.time ?? null);
                    return (
                      <Link
                        key={a.mal_id}
                        href={`/anime/${a.mal_id}`}
                        className="group flex gap-2 p-2 rounded-xl hover:opacity-90 transition-opacity"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: `1px solid ${isToday ? "var(--accent-dim-border)" : "var(--border)"}`,
                        }}
                      >
                        <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden">
                          <Image
                            src={a.images.jpg.image_url}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="40px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold line-clamp-2 leading-snug mb-1">{title}</p>
                          {time && (
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{time}</p>
                          )}
                          {ep && (
                            <p className="text-xs" style={{ color: "var(--accent)" }}>
                              ep {ep}{a.episodes ? `/${a.episodes}` : ""}
                            </p>
                          )}
                          {status && (
                            <span
                              className="text-xs font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block"
                              style={{ backgroundColor: STATUS_COLORS[status], color: "#fff", fontSize: "0.6rem" }}
                            >
                              {STATUS_SHORT[status]}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unknown broadcast day */}
      {view === "schedule" && unknown.length > 0 && (
        <div className="mt-8">
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>No fixed schedule</p>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
            {unknown.map((a) => {
              const title = a.title_english || a.title;
              return (
                <Link key={a.mal_id} href={`/anime/${a.mal_id}`} className="shrink-0 group" style={{ width: 80 }}>
                  <div className="relative rounded-xl overflow-hidden" style={{ width: 80, height: 112 }}>
                    <Image src={a.images.jpg.image_url} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="80px" />
                  </div>
                  <p className="text-xs mt-1 line-clamp-2 leading-snug" style={{ color: "var(--text-muted)" }}>{title}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {anime.map((a) => {
            const title = a.title_english || a.title;
            const status = myEntries[a.mal_id];
            const dayStr = a.broadcast?.day?.toLowerCase();
            const dayLabel = dayStr ? DAYS_FULL.find((d) => dayStr.startsWith(d.toLowerCase().slice(0, 3))) ?? null : null;
            return (
              <Link key={a.mal_id} href={`/anime/${a.mal_id}`} className="group">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden">
                  <Image
                    src={a.images.jpg.large_image_url || a.images.jpg.image_url}
                    alt={title} fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, 20vw"
                  />
                  {status && (
                    <div className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status], color: "#fff" }}>
                      {STATUS_SHORT[status]}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {a.score && (
                      <div className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>★ {a.score}</div>
                    )}
                    <div className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "rgba(0,0,0,0.65)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}>Z {zukanRatings[a.mal_id] ?? "—"}</div>
                  </div>
                  {dayLabel && (
                    <div className="absolute bottom-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.65)", color: "#fff" }}>
                      {dayLabel}s
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs font-medium line-clamp-2 leading-snug">{title}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
