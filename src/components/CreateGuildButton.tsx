"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
        style={{ backgroundColor: "var(--accent)" }}
      >
        + Create Guild
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div
            className="modal-enter w-full max-w-md rounded-2xl p-6 space-y-5"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-bold">Create a Guild</h2>

            {/* Icon picker */}
            <div>
              <p className="text-xs mb-2 uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Icon</p>
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
              <label className="text-xs mb-1 block uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shonen Warriors"
                maxLength={40}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              {name && (
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  slug: /guilds/{toSlug(name)}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs mb-1 block uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this guild about?"
                rows={3}
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={create}
                disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {saving ? "Creating…" : "Create Guild"}
              </button>
              <button
                onClick={() => { setOpen(false); setError(null); }}
                className="px-4 py-2 rounded-xl text-sm cursor-pointer"
                style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
