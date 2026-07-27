"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { GENRES } from "@/lib/genres";
import { ImportPanel } from "@/components/ImportPanel";
import { ExportPanel } from "@/components/ExportPanel";

type Tab = "profile" | "preferences" | "import" | "export";

interface Profile {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  favorite_genres: string[];
}

export default function EditProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile>({
    username: "", display_name: "", bio: "", avatar_url: null, favorite_genres: [],
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUserId(data.user.id);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      if (p) setProfile({ ...p, favorite_genres: p.favorite_genres ?? [] });
      else setProfile((prev) => ({ ...prev, username: data.user!.user_metadata?.username ?? "" }));
    });
  }, []);

  async function uploadAvatar(file: File) {
    if (!userId) return;
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { setMessage("Upload failed: " + error.message); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setProfile((p) => ({ ...p, avatar_url: data.publicUrl }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from("profiles").upsert({ id: userId, ...profile });
    setSaving(false);
    setMessage(error ? error.message : "Saved!");
  }

  function toggleGenre(g: string) {
    setProfile((p) => {
      const genres = p.favorite_genres.includes(g)
        ? p.favorite_genres.filter((x) => x !== g)
        : [...p.favorite_genres, g];
      return { ...p, favorite_genres: genres };
    });
  }

  async function savePreferences() {
    if (!userId) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from("profiles")
      .update({ favorite_genres: profile.favorite_genres })
      .eq("id", userId);
    setSaving(false);
    setMessage(error ? error.message : "Saved!");
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "preferences", label: "Preferences" },
    { key: "import", label: "Import" },
    { key: "export", label: "Export" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <p className="eyebrow mb-1.5">Settings</p>
      <h1 className="text-3xl font-bold mb-6">Edit Profile</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setMessage(null); }}
            className={`relative px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              tab === key ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {tab === key && (
              <motion.span
                layoutId="edit-tab"
                className="absolute inset-0 rounded-lg"
                style={{ backgroundColor: "var(--accent)" }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === "profile" && (
        <form onSubmit={save} className="space-y-6">
          <div className="flex items-center gap-5">
            <div
              className="w-20 h-20 rounded-full overflow-hidden shrink-0 cursor-pointer"
              style={{ backgroundColor: "var(--surface-2)", border: "2px solid var(--border)" }}
              onClick={() => fileRef.current?.click()}
            >
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt="avatar" width={80} height={80} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: "var(--text-muted)" }}>?</div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn btn-ghost text-sm px-3 py-1.5"
              >
                Change photo
              </button>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>JPG or PNG, max 2MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) uploadAvatar(e.target.files[0]); }}
            />
          </div>

          {[
            { label: "Username", key: "username" },
            { label: "Display Name", key: "display_name" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="eyebrow block mb-1.5">{label}</label>
              <input
                type="text"
                value={profile[key as keyof Profile] as string ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm"
              />
            </div>
          ))}

          <div>
            <label className="eyebrow block mb-1.5">Bio</label>
            <textarea
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              maxLength={300}
              className="w-full px-3.5 py-2.5 text-sm resize-none"
            />
            <p className="text-xs mt-1 text-right font-mono-nums" style={{ color: "var(--text-muted)" }}>{profile.bio.length}/300</p>
          </div>

          {message && <p className="text-sm" style={{ color: message === "Saved!" ? "var(--success)" : "var(--destructive)" }}>{message}</p>}

          <button type="submit" disabled={saving} className="btn btn-primary w-full">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}

      {/* Preferences tab */}
      {tab === "preferences" && (
        <div>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Select the genres you enjoy. These show on your public profile.
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {GENRES.map((g) => {
              const on = profile.favorite_genres.includes(g);
              return (
                <motion.button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  whileTap={{ scale: 0.94 }}
                  animate={{ scale: on ? 1.05 : 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors"
                  style={{
                    backgroundColor: on ? "var(--accent)" : "var(--surface)",
                    color: on ? "#fff" : "var(--text-muted)",
                    border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  {g}
                </motion.button>
              );
            })}
          </div>

          <p className="text-xs mb-4 font-mono-nums" style={{ color: "var(--text-muted)" }}>
            {profile.favorite_genres.length} genre{profile.favorite_genres.length !== 1 ? "s" : ""} selected
          </p>

          {message && <p className="text-sm mb-4" style={{ color: message === "Saved!" ? "var(--success)" : "var(--destructive)" }}>{message}</p>}

          <button onClick={savePreferences} disabled={saving} className="btn btn-primary w-full">
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      )}

      {/* Import tab */}
      {tab === "import" && userId && (
        <div>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Import your watch history from MyAnimeList or AniList. Existing entries won&apos;t be overwritten.
          </p>
          <ImportPanel
            userId={userId}
            onDone={(count) => setMessage(`Imported ${count} anime successfully.`)}
          />
          {message && (
            <p className="text-sm mt-4" style={{ color: message.startsWith("Imported") ? "var(--success)" : "var(--destructive)" }}>
              {message}
            </p>
          )}
        </div>
      )}

      {/* Export tab */}
      {tab === "export" && userId && (
        <div>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Download your Zukan list in a format compatible with MyAnimeList or AniList.
          </p>
          <ExportPanel userId={userId} username={profile.username} />
        </div>
      )}
    </div>
  );
}
