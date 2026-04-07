import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardTabs } from "@/components/DashboardTabs";

type ListStatus = "watching" | "completed" | "plan_to_watch" | "on_hold" | "dropped";

const STATUS_ORDER: ListStatus[] = ["watching", "completed", "plan_to_watch", "on_hold", "dropped"];

interface Entry {
  id: string;
  mal_id: number;
  title: string;
  image_url: string;
  episodes: number | null;
  status: ListStatus;
  rating: number | null;
  progress: number;
}

const STATS = [
  { key: "total",     label: "Total Anime" },
  { key: "completed", label: "Completed" },
  { key: "watching",  label: "Watching" },
  { key: "avg",       label: "Avg Rating" },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entries } = await supabase
    .from("list_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const all: Entry[] = entries ?? [];

  const grouped = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = all.filter((e) => e.status === s);
    return acc;
  }, {} as Record<ListStatus, Entry[]>);

  const rated = all.filter((e) => e.rating);
  const avgRating = rated.length > 0
    ? (rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length).toFixed(1)
    : "—";

  const statValues: Record<typeof STATS[number]["key"], string | number> = {
    total:     all.length,
    completed: grouped.completed.length,
    watching:  grouped.watching.length,
    avg:       avgRating,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My List</h1>
        <Link
          href="/search"
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--accent)" }}
        >
          + Add Anime
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {STATS.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-xl p-4 text-center"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
              {statValues[key]}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + grid */}
      <DashboardTabs grouped={grouped} />

    </div>
  );
}
