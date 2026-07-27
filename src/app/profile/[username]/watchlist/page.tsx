export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CopyLinkButton } from "@/components/CopyLinkButton";

const PAGE_SIZE = 50;

interface Props {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function WatchlistPage({ params, searchParams }: Props) {
  const { username } = await params;
  const { page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const { data: entries, count } = await supabase
    .from("list_entries")
    .select("mal_id, title, image_url, episodes, progress", { count: "exact" })
    .eq("user_id", profile.id)
    .eq("status", "plan_to_watch")
    .eq("media_type", "anime")
    .order("updated_at", { ascending: false })
    .range(from, to);

  const list = entries ?? [];
  const total = count ?? list.length;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
          <h1 className="text-3xl font-bold">Watchlist</h1>
          <p className="text-sm mt-2 font-mono-nums" style={{ color: "var(--text-muted)" }}>{total} anime queued up</p>
        </div>
        <CopyLinkButton />
      </div>

      {list.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nothing on the watchlist yet.</p>
      ) : (
        <div className="space-y-3 stagger">
          {list.map((entry, idx) => (
            <Link
              key={entry.mal_id}
              href={`/anime/${entry.mal_id}`}
              className="card card-hover flex items-center gap-4 p-3"
            >
              <span className="text-sm font-bold w-6 text-right shrink-0 font-mono-nums" style={{ color: "var(--text-muted)" }}>{from + idx + 1}</span>
              <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden">
                <Image src={entry.image_url} alt={entry.title} fill className="object-cover" sizes="40px" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{entry.title}</p>
                {entry.episodes && (
                  <p className="text-xs mt-0.5 font-mono-nums" style={{ color: "var(--text-muted)" }}>{entry.episodes} episodes</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          {currentPage > 1 && (
            <Link
              href={`/profile/${username}/watchlist?page=${currentPage - 1}`}
              className="btn btn-ghost text-sm px-4 py-2"
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
              Prev
            </Link>
          )}
          <span style={{ color: "var(--text-muted)" }} className="text-sm font-mono-nums">
            Page {currentPage} / {lastPage}
          </span>
          {currentPage < lastPage && (
            <Link
              href={`/profile/${username}/watchlist?page=${currentPage + 1}`}
              className="btn btn-ghost text-sm px-4 py-2"
            >
              Next
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
