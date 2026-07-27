export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DashboardTabs } from "@/components/DashboardTabs";
import type { MediaType } from "@/lib/anilist";
import { STATUS_ORDER, type ListStatus } from "@/lib/listStatus";

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
  { key: "total",     label: "Completed" },
  { key: "watching",  label: "Watching" },
  { key: "plan",      label: "Plan to Watch" },
  { key: "avg",       label: "Avg Rating" },
] as const;

interface Props {
  searchParams: Promise<{ type?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { type = "anime" } = await searchParams;
  const mediaType: MediaType = type === "manga" ? "manga" : "anime";
  const isManga = mediaType === "manga";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entries } = await supabase
    .from("list_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("media_type", mediaType)
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
    total:    grouped.completed.length,
    watching: grouped.watching.length,
    plan:     grouped.plan_to_watch.length,
    avg:      avgRating,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="eyebrow mb-1.5">Library</p>
          <h1 className="text-3xl font-bold">My Lists</h1>
        </div>
        <Link href={`/search?type=${mediaType}`} className="btn btn-primary">
          <Plus size={14} strokeWidth={2.5} />
          Add {isManga ? "Manga" : "Anime"}
        </Link>
      </div>

      {/* Anime / Manga toggle */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
        {[{ label: "Anime", value: "anime" }, { label: "Manga", value: "manga" }].map(({ label, value }) => (
          <Link key={value} href={value === "anime" ? "/dashboard" : "/dashboard?type=manga"}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: value === mediaType ? "var(--accent)" : "transparent",
              color: value === mediaType ? "#fff" : "var(--text-muted)",
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 stagger">
        {STATS.map(({ key, label }) => (
          <div key={key} className="card p-4 text-center">
            <p className="text-2xl font-bold font-mono-nums" style={{ color: "var(--accent)" }}>
              {statValues[key]}
            </p>
            <p className="eyebrow mt-1.5" style={{ fontSize: "0.5625rem" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + grid */}
      <DashboardTabs grouped={grouped} userId={user.id} mediaType={mediaType} />

    </div>
  );
}
