export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: entries }, { data: reviews }] = await Promise.all([
    supabase.from("list_entries").select("*").eq("user_id", user.id),
    supabase.from("reviews").select("rating").eq("user_id", user.id),
  ]);

  const all = entries ?? [];
  const total = all.length;
  const completed = all.filter((e) => e.status === "completed");
  const watching = all.filter((e) => e.status === "watching");
  const planToWatch = all.filter((e) => e.status === "plan_to_watch");
  const onHold = all.filter((e) => e.status === "on_hold");
  const dropped = all.filter((e) => e.status === "dropped");

  const totalEpisodes = all.reduce((s, e) => s + (e.progress ?? 0), 0);
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
    { label: "Completed",     count: completed.length,  color: "#22c55e" },
    { label: "Watching",      count: watching.length,   color: "var(--accent)" },
    { label: "Plan to Watch", count: planToWatch.length, color: "#60a5fa" },
    { label: "On Hold",       count: onHold.length,     color: "#facc15" },
    { label: "Dropped",       count: dropped.length,    color: "#f87171" },
  ];

  const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  const dropRate = total > 0 ? Math.round((dropped.length / total) * 100) : 0;

  // Score distribution from reviews
  const reviewDist: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) reviewDist[i] = 0;
  (reviews ?? []).forEach((r) => { reviewDist[r.rating] = (reviewDist[r.rating] ?? 0) + 1; });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold">Your Stats</h1>
      </div>

      {total === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
          <p className="text-4xl mb-4">📊</p>
          <p className="font-semibold mb-2">No data yet</p>
          <p className="text-sm mb-6">Add some anime to your list to see your stats.</p>
          <Link href="/search" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--accent)" }}>
            Browse Anime
          </Link>
        </div>
      ) : (
        <div className="space-y-8">

          {/* Top stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Anime",      value: total },
              { label: "Episodes Watched", value: totalEpisodes.toLocaleString() },
              { label: "Hours Watched",    value: `~${hoursWatched.toLocaleString()}h` },
              { label: "Avg Rating",       value: avgRating ? `★ ${avgRating}` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="stagger rounded-2xl p-5 text-center" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-2xl font-extrabold mb-1" style={{ color: "var(--accent)" }}>{value}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Status breakdown */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>List Breakdown</h2>
              <div className="space-y-3">
                {statusBreakdown.map(({ label, count, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{label}</span>
                      <span style={{ color: "var(--text-muted)" }}>{count} ({total > 0 ? Math.round((count / total) * 100) : 0}%)</span>
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
                  <p className="font-bold text-lg" style={{ color: "#22c55e" }}>{completionRate}%</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Completion rate</p>
                </div>
                <div>
                  <p className="font-bold text-lg" style={{ color: "#f87171" }}>{dropRate}%</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Drop rate</p>
                </div>
                <div>
                  <p className="font-bold text-lg">{(reviews ?? []).length}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Reviews written</p>
                </div>
              </div>
            </div>

            {/* Rating distribution */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>
                Rating Distribution <span className="font-normal normal-case">({rated.length} rated)</span>
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
                          <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>{count}</span>
                        )}
                        <div className="w-full rounded-t-md transition-all" style={{
                          height: `${Math.max(pct, 4)}%`,
                          backgroundColor: n >= 8 ? "#22c55e" : n >= 5 ? "var(--accent)" : "#f87171",
                          minHeight: count > 0 ? 8 : 2,
                          opacity: count === 0 ? 0.2 : 1,
                        }} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{n}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Milestones */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>Milestones</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "10 completed",  reached: completed.length >= 10,  icon: "🎬" },
                { label: "50 completed",  reached: completed.length >= 50,  icon: "🔥" },
                { label: "100 completed", reached: completed.length >= 100, icon: "💯" },
                { label: "1000 episodes", reached: totalEpisodes >= 1000,   icon: "📺" },
                { label: "500 hours",     reached: hoursWatched >= 500,     icon: "⏱️" },
                { label: "10 reviews",    reached: (reviews?.length ?? 0) >= 10, icon: "✍️" },
                { label: "Avg ★ 7+",     reached: parseFloat(avgRating ?? "0") >= 7, icon: "⭐" },
                { label: "All statuses",  reached: statusBreakdown.every((s) => s.count > 0), icon: "🗂️" },
              ].map(({ label, reached, icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{
                    backgroundColor: reached ? "var(--accent-dim)" : "var(--surface-2)",
                    border: `1px solid ${reached ? "var(--accent)" : "var(--border)"}`,
                    opacity: reached ? 1 : 0.45,
                  }}
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs font-medium">{label}</span>
                  {reached && <span className="ml-auto text-xs font-bold" style={{ color: "var(--accent)" }}>✓</span>}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
