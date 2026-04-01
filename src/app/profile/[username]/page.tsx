import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
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

interface Props {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const { data: entries } = await supabase
    .from("list_entries")
    .select("*")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false });

  const total = entries?.length ?? 0;
  const completed = entries?.filter((e) => e.status === "completed").length ?? 0;
  const rated = entries?.filter((e) => e.rating) ?? [];
  const avgRating = rated.length > 0
    ? (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(1)
    : "—";

  const grouped = (["watching", "completed", "plan_to_watch", "on_hold", "dropped"] as ListStatus[]).reduce((acc, s) => {
    acc[s] = (entries ?? []).filter((e) => e.status === s);
    return acc;
  }, {} as Record<ListStatus, typeof entries>);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-6 mb-10">
        <div
          className="w-20 h-20 rounded-full overflow-hidden shrink-0"
          style={{ backgroundColor: "var(--surface-2)", border: "2px solid var(--border)" }}
        >
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.username} width={80} height={80} className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: "var(--text-muted)" }}>
              {profile.username[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>@{profile.username}</p>
          {profile.bio && <p className="text-sm mt-2 max-w-md">{profile.bio}</p>}
          <div className="flex gap-5 mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
            <span>{total} entries</span>
            <span>{completed} completed</span>
            <span>Avg ★ {avgRating}</span>
          </div>
        </div>
      </div>

      {(["watching", "completed", "plan_to_watch", "on_hold", "dropped"] as ListStatus[]).map((status) => {
        const list = grouped[status] ?? [];
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
                  className="flex items-center gap-4 p-3 rounded-lg hover:opacity-90 transition-opacity"
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
    </div>
  );
}
