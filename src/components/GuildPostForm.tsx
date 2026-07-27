"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
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
        className="card w-full py-3 text-sm mb-6 cursor-pointer transition-colors text-left px-4 flex items-center gap-2 hover:border-[var(--accent-dim-border)]"
        style={{ color: "var(--text-muted)" }}
      >
        <Plus size={14} strokeWidth={2.5} />
        Write a post…
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.form
        initial={{ opacity: 0, y: -8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onSubmit={submit}
        className="card p-5 mb-6 space-y-3"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          maxLength={100}
          className="w-full px-3.5 py-2 text-sm font-semibold"
          style={{ backgroundColor: "var(--surface-2)" }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          className="w-full px-3.5 py-2.5 text-sm resize-none"
          style={{ backgroundColor: "var(--surface-2)" }}
        />
        {error && <p className="text-sm" style={{ color: "var(--destructive)" }}>{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "Posting…" : "Post"}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setError(null); }}
            className="btn btn-ghost"
          >
            Cancel
          </button>
        </div>
      </motion.form>
    </AnimatePresence>
  );
}
