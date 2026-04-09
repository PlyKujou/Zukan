"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  guildId: string;
  userId: string;
}

export function GuildPostForm({ guildId, userId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 5) { setError("Post must be at least 5 characters."); return; }
    setSaving(true);
    setError(null);

    const { error: err } = await supabase.from("guild_posts").insert({
      guild_id: guildId,
      user_id: userId,
      title: title.trim() || null,
      body: body.trim(),
    });

    if (err) { setError(err.message); } else {
      setTitle("");
      setBody("");
      setOpen(false);
      router.refresh();
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl py-3 text-sm mb-6 cursor-pointer transition-colors text-left px-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        + Write a post…
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl p-5 mb-6 space-y-3"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        maxLength={100}
        className="w-full px-3 py-2 rounded-lg text-sm font-semibold"
        style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's on your mind?"
        rows={4}
        className="w-full px-3 py-2 rounded-lg text-sm resize-none"
        style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {saving ? "Posting…" : "Post"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="px-4 py-2 rounded-lg text-sm cursor-pointer"
          style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
