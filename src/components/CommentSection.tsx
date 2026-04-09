"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Comment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
}

export function CommentSection({ malId }: { malId: number }) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [malId]);

  async function load() {
    const { data } = await supabase
      .from("anime_comments")
      .select("id, user_id, body, created_at, profiles(username, display_name)")
      .eq("mal_id", malId)
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
    const { error: err } = await supabase.from("anime_comments").insert({ mal_id: malId, user_id: userId, body: body.trim() });
    if (err) { setError(err.message); } else { setBody(""); await load(); }
    setSaving(false);
  }

  async function remove(id: string) {
    await supabase.from("anime_comments").delete().eq("id", id);
    setComments((c) => c.filter((x) => x.id !== id));
  }

  return (
    <div className="mt-10">
      <h2 className="text-base font-bold mb-4">Comments <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>({comments.length})</span></h2>

      {userId ? (
        <form onSubmit={submit} className="flex gap-2 mb-6">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Leave a comment…"
            maxLength={500}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {saving ? "…" : "Post"}
          </button>
        </form>
      ) : (
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          <Link href="/login" style={{ color: "var(--accent)" }}>Log in</Link> to comment.
        </p>
      )}
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}>
              {c.profiles?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Link href={`/profile/${c.profiles?.username ?? ""}`} className="text-xs font-semibold hover:underline">
                  {c.profiles?.display_name || c.profiles?.username || "Unknown"}
                </Link>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                {c.user_id === userId && (
                  <button onClick={() => remove(c.id)} className="text-xs cursor-pointer hover:underline ml-auto" style={{ color: "#f87171" }}>delete</button>
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
    </div>
  );
}
