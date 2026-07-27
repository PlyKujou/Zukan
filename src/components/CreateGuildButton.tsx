"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ICONS = ["⚔️","🌸","🔥","🐉","👾","🎌","🌙","⭐","🎭","🦊","🏯","💫","🎋","🌊","🎴"];

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function CreateGuildButton() {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("⚔️");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }

    const slug = toSlug(name.trim());

    const { data: guild, error: guildErr } = await supabase
      .from("guilds")
      .insert({ name: name.trim(), slug, description: description.trim() || null, icon, created_by: user.id })
      .select("id, slug")
      .single();

    if (guildErr) { setError(guildErr.message); setSaving(false); return; }

    await supabase.from("guild_members").insert({ guild_id: guild.id, user_id: user.id, role: "owner" });

    router.push(`/guilds/${guild.slug}`);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">
        <Plus size={14} strokeWidth={2.5} />
        Create Guild
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-3xl p-6 space-y-5"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
          >
            <h2 className="text-lg font-bold">Create a Guild</h2>

            {/* Icon picker */}
            <div>
              <p className="eyebrow mb-2">Icon</p>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className="w-10 h-10 rounded-lg text-xl cursor-pointer transition-colors"
                    style={{
                      backgroundColor: icon === ic ? "var(--accent)" : "var(--surface-2)",
                      border: `1px solid ${icon === ic ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="eyebrow mb-1.5 block">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shonen Warriors"
                maxLength={40}
                className="w-full px-3.5 py-2 text-sm"
                style={{ backgroundColor: "var(--surface-2)" }}
              />
              {name && (
                <p className="text-xs mt-1 font-mono-nums" style={{ color: "var(--text-muted)" }}>
                  slug: /guilds/{toSlug(name)}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="eyebrow mb-1.5 block">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this guild about?"
                rows={3}
                maxLength={200}
                className="w-full px-3.5 py-2.5 text-sm resize-none"
                style={{ backgroundColor: "var(--surface-2)" }}
              />
            </div>

            {error && <p className="text-sm" style={{ color: "var(--destructive)" }}>{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={create} disabled={saving} className="btn btn-primary flex-1">
                {saving ? "Creating…" : "Create Guild"}
              </button>
              <button onClick={() => { setOpen(false); setError(null); }} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
