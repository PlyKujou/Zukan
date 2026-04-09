export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CopyLinkButton } from "@/components/CopyLinkButton";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function WatchlistPage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const { data: entries } = await supabase
    .from("list_entries")
    .select("mal_id, title, image_url, episodes, progress")
    .eq("user_id", profile.id)
    .eq("status", "plan_to_watch")
    .order("updated_at", { ascending: false });

  const list = entries ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
            <Link href={`/profile/${username}`} className="hover:underline" style={{ color: "var(--accent)" }}>
              {profile.display_name || profile.username}
            </Link>
            's Plan to Watch
          </p>
          <h1 className="text-2xl font-bold">Watchlist</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{list.length} anime queued up</p>
        </div>
        <CopyLinkButton />
      </div>

      {list.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nothing on the watchlist yet.</p>
      ) : (
        <div className="space-y-3">
          {list.map((entry, idx) => (
            <Link
              key={entry.mal_id}
              href={`/anime/${entry.mal_id}`}
              className="flex items-center gap-4 p-3 rounded-xl hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <span className="text-sm font-bold w-6 text-right shrink-0" style={{ color: "var(--text-muted)" }}>{idx + 1}</span>
              <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden">
                <Image src={entry.image_url} alt={entry.title} fill className="object-cover" sizes="40px" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{entry.title}</p>
                {entry.episodes && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{entry.episodes} episodes</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
