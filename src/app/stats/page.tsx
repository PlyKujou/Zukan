export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart2, Check, Clapperboard, Clock, Flame, FolderKanban, Gauge, PenLine, Star, Tv,
} from "lucide-react";

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: entries }, { data: reviews }] = await Promise.all([
    supabase.from("list_entries").select("*").eq("user_id", user.id).eq("media_type", "anime"),
    supabase.from("reviews").select("rating").eq("user_id", user.id).eq("media_type", "anime"),
  ]);

  const all = entries ?? [];
  const completed = all.filter((e) => e.status === "completed");
  const total = completed.length;
  const watching = all.filter((e) => e.status === "watching");
  const planToWatch = all.filter((e) => e.status === "plan_to_watch");
  const onHold = all.filter((e) => e.status === "on_hold");
  const dropped = all.filter((e) => e.status === "dropped");

  const totalEpisodes = completed.reduce((s, e) => s + (e.episodes ?? e.progress ?? 0), 0);
  const hoursWatched = Math.round((totalEpisodes * 24) / 60);

  const rated = all.filter((e) => e.rating);
  const avgRating = rated.length > 0
    ? (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(2)
    : null;

  // Rating distribution
  const ratingDist: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) ratingDist[i] = 0;
  rated.forEach((e) => { ratingDist[e.rating] = (ratingDist[e.rating] ?? 0) + 1; });
  const maxRatingCount = Math.max(...Object.values(ratingDist), 1);

  // Genre breakdown
  const genreMap: Record<string, number> = {};
  // We don't store genres on entries, so use anime titles as proxy — skip for now
  // Instead show status breakdown as pie-style bars

  const statusBreakdown = [
    { label: "Completed",     count: completed.length,   color: "#46d69a" },
    { label: "Watching",      count: watching.length,    color: "var(--accent)" },
    { label: "Plan to Watch", count: planToWatch.length, color: "#5eb0ff" },
    { label: "On Hold",       count: onHold.length,      color: "#ffb257" },
    { label: "Dropped",       count: dropped.length,     color: "#8a7d6e" },
  ];

  const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  const dropRate = total > 0 ? Math.round((dropped.length / total) * 100) : 0;

  // Score distribution from reviews
  const reviewDist: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) reviewDist[i] = 0;
  (reviews ?? []).forEach((r) => { reviewDist[r.rating] = (reviewDist[r.rating] ?? 0) + 1; });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="eyebrow mb-1.5">By the numbers</p>
        <h1 className="text-3xl font-bold">Your Stats</h1>
      </div>

      {total === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
          <BarChart2 size={36} strokeWidth={1.5} className="mx-auto mb-4" />
          <p className="font-semibold mb-2">No data yet</p>
          <p className="text-sm mb-6">Add some anime to your list to see your stats.</p>
          <Link href="/search" className="btn btn-primary px-5 py-2.5">
            Browse Anime
          </Link>
        </div>
      ) : (
        <div className="space-y-8">

          {/* Top stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger">
            {[
              { label: "Total Anime",      value: total },
              { label: "Episodes Watched", value: totalEpisodes.toLocaleString() },
              { label: "Hours Watched",    value: `~${hoursWatched.toLocaleString()}h` },
              { label: "Avg Rating",       value: avgRating ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="card p-5 text-center">
                <p className="text-2xl font-extrabold mb-1 font-mono-nums" style={{ color: "var(--accent)" }}>{value}</p>
                <p className="eyebrow" style={{ fontSize: "0.5625rem" }}>{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Status breakdown */}
            <div className="card p-6">
              <h2 className="eyebrow mb-5">List Breakdown</h2>
              <div className="space-y-3">
                {statusBreakdown.map(({ label, count, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{label}</span>
                      <span className="font-mono-nums" style={{ color: "var(--text-muted)" }}>{count} ({total > 0 ? Math.round((count / total) * 100) : 0}%)</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 flex gap-6 text-sm" style={{ borderTop: "1px solid var(--border)" }}>
                <div>
                  <p className="font-bold text-lg font-mono-nums" style={{ color: "var(--success)" }}>{completionRate}%</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Completion rate</p>
                </div>
                <div>
                  <p className="font-bold text-lg font-mono-nums" style={{ color: "var(--destructive)" }}>{dropRate}%</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Drop rate</p>
                </div>
                <div>
                  <p className="font-bold text-lg font-mono-nums">{(reviews ?? []).length}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Reviews written</p>
                </div>
              </div>
            </div>

            {/* Rating distribution */}
            <div className="card p-6">
              <h2 className="eyebrow mb-5">
                Rating Distribution <span style={{ textTransform: "none", letterSpacing: 0 }}>({rated.length} rated)</span>
              </h2>
              {rated.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No ratings yet.</p>
              ) : (
                <div className="flex items-end gap-1.5 h-36">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                    const count = ratingDist[n] ?? 0;
                    const pct = (count / maxRatingCount) * 100;
                    return (
                      <div key={n} className="flex-1 flex flex-col items-center gap-1">
                        {count > 0 && (
                          <span className="text-xs font-bold font-mono-nums" style={{ color: "var(--text-muted)" }}>{count}</span>
                        )}
                        <div className="w-full rounded-t-md transition-all" style={{
                          height: `${Math.max(pct, 4)}%`,
                          backgroundColor: n >= 8 ? "#46d69a" : n >= 5 ? "var(--accent)" : "#8a7d6e",
                          minHeight: count > 0 ? 8 : 2,
                          opacity: count === 0 ? 0.2 : 1,
                        }} />
                        <span className="text-xs font-mono-nums" style={{ color: "var(--text-muted)" }}>{n}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Milestones */}
          <div className="card p-6">
            <h2 className="eyebrow mb-5">Milestones</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "10 completed",  reached: completed.length >= 10,  icon: Clapperboard },
                { label: "50 completed",  reached: completed.length >= 50,  icon: Flame },
                { label: "100 completed", reached: completed.length >= 100, icon: Gauge },
                { label: "1000 episodes", reached: totalEpisodes >= 1000,   icon: Tv },
                { label: "500 hours",     reached: hoursWatched >= 500,     icon: Clock },
                { label: "10 reviews",    reached: (reviews?.length ?? 0) >= 10, icon: PenLine },
                { label: "Avg 7+",        reached: parseFloat(avgRating ?? "0") >= 7, icon: Star },
                { label: "All statuses",  reached: statusBreakdown.every((s) => s.count > 0), icon: FolderKanban },
              ].map(({ label, reached, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{
                    backgroundColor: reached ? "var(--accent-dim)" : "var(--surface-2)",
                    border: `1px solid ${reached ? "var(--accent-dim-border)" : "var(--border)"}`,
                    opacity: reached ? 1 : 0.45,
                  }}
                >
                  <Icon size={15} strokeWidth={2} style={{ color: reached ? "var(--accent)" : "var(--text-muted)" }} />
                  <span className="text-xs font-medium">{label}</span>
                  {reached && <Check size={12} strokeWidth={3} className="ml-auto shrink-0" style={{ color: "var(--accent)" }} />}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
