"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { MediaType } from "@/lib/anilist";

interface Comment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
}

const PAGE_SIZE = 15;

export function CommentSection({ malId, mediaType = "anime" }: { malId: number; mediaType?: MediaType }) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [malId, mediaType]);

  async function load() {
    const { data } = await supabase
      .from("anime_comments")
      .select("id, user_id, body, created_at, profiles(username, display_name)")
      .eq("mal_id", malId)
      .eq("media_type", mediaType)
      .order("created_at", { ascending: false })
      .limit(50);
    setComments((data as unknown as Comment[]) ?? []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (body.trim().length < 2) { setError("Too short."); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("anime_comments").insert({ mal_id: malId, media_type: mediaType, user_id: userId, body: body.trim() });
    if (err) { setError(err.message); } else { setBody(""); await load(); }
    setSaving(false);
  }

  async function remove(id: string) {
    await supabase.from("anime_comments").delete().eq("id", id);
    setComments((c) => c.filter((x) => x.id !== id));
  }

  return (
    <div className="mt-10">
      <h2 className="text-base font-bold mb-4">Comments <span className="text-sm font-normal font-mono-nums" style={{ color: "var(--text-muted)" }}>({comments.length})</span></h2>

      {userId ? (
        <form onSubmit={submit} className="flex gap-2 mb-6">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Leave a comment…"
            maxLength={500}
            className="flex-1 px-3.5 py-2 text-sm"
          />
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "…" : "Post"}
          </button>
        </form>
      ) : (
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          <Link href="/login" style={{ color: "var(--accent)" }}>Log in</Link> to comment.
        </p>
      )}
      {error && <p className="text-sm mb-3" style={{ color: "var(--destructive)" }}>{error}</p>}

      <div className="space-y-3">
        {comments.slice(0, visibleCount).map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}>
              {c.profiles?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Link href={`/profile/${c.profiles?.username ?? ""}`} className="text-xs font-semibold hover:underline">
                  {c.profiles?.display_name || c.profiles?.username || "Unknown"}
                </Link>
                <span className="text-xs font-mono-nums" style={{ color: "var(--text-muted)" }}>
                  {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                {c.user_id === userId && (
                  <button onClick={() => remove(c.id)} className="text-xs cursor-pointer hover:underline ml-auto" style={{ color: "var(--destructive)" }}>delete</button>
                )}
              </div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{c.body}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No comments yet.</p>
        )}
      </div>

      {comments.length > visibleCount && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="btn btn-ghost text-xs px-4 py-1.5"
          >
            Load more comments
          </button>
        </div>
      )}
    </div>
  );
}
