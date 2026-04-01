import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

type ListStatus = "watching" | "completed" | "plan_to_watch" | "on_hold" | "dropped";

const STATUS_LABELS: Record<ListStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  plan_to_watch: "Plan to Watch",
  on_hold: "On Hold",
  dropped: "Dropped",
};

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

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entries } = await supabase
    .from("list_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const grouped = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = (entries ?? []).filter((e: Entry) => e.status === s);
    return acc;
  }, {} as Record<ListStatus, Entry[]>);

  const total = entries?.length ?? 0;
  const rated = entries?.filter((e: Entry) => e.rating) ?? [];
  const avgRating = rated.length > 0
    ? (rated.reduce((s: number, e: Entry) => s + (e.rating ?? 0), 0) / rated.length).toFixed(1)
    : "—";

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">My Lists</h1>
      <div className="flex gap-6 mb-10 text-sm" style={{ color: "var(--text-muted)" }}>
        <span>{total} total</span>
        <span>Avg rating: {avgRating}</span>
        <span>{grouped.completed.length} completed</span>
      </div>

      {STATUS_ORDER.map((status) => {
        const list = grouped[status];
        if (list.length === 0) return null;
        return (
          <section key={status} className="mb-10">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--accent)" }}>
              {STATUS_LABELS[status]} ({list.length})
            </h2>
            <div className="space-y-2">
              {list.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/anime/${entry.mal_id}`}
                  className="flex items-center gap-4 p-3 rounded-lg transition-colors hover:opacity-90"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="relative w-10 h-14 shrink-0 rounded overflow-hidden">
                    <Image src={entry.image_url} alt={entry.title} fill className="object-cover" sizes="40px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{entry.title}</p>
                    {entry.episodes && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {entry.progress}/{entry.episodes} eps
                      </p>
                    )}
                  </div>
                  {entry.rating && (
                    <div className="text-sm font-semibold shrink-0" style={{ color: "var(--accent)" }}>
                      ★ {entry.rating}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {total === 0 && (
        <div className="text-center py-20">
          <p className="text-lg mb-4" style={{ color: "var(--text-muted)" }}>Your list is empty.</p>
          <Link
            href="/search"
            className="px-4 py-2 rounded-md text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Find anime to add
          </Link>
        </div>
      )}
    </div>
  );
}
