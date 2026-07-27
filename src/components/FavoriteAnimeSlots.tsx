"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface FavoriteAnime {
  mal_id: number;
  title: string;
  image_url: string;
}

interface Props {
  favorites: FavoriteAnime[];
  isOwner: boolean;
  profileId: string;
}

export function FavoriteAnimeSlots({ favorites, isOwner, profileId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [slots, setSlots] = useState<(FavoriteAnime | null)[]>(() => {
    const s: (FavoriteAnime | null)[] = [null, null, null];
    favorites.forEach((f, i) => { if (i < 3) s[i] = f; });
    return s;
  });
  const [pickerOpen, setPickerOpen] = useState<number | null>(null);
  const [entries, setEntries] = useState<FavoriteAnime[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pickerOpen === null) return;
    setEntriesLoading(true);
    supabase
      .from("list_entries")
      .select("mal_id, title, image_url")
      .eq("user_id", profileId)
      .eq("media_type", "anime")
      .in("status", ["watching", "completed"])
      .order("title", { ascending: true })
      .then(({ data }) => {
        setEntries((data as FavoriteAnime[]) ?? []);
        setEntriesLoading(false);
      });
  }, [pickerOpen]);

  async function save(updated: (FavoriteAnime | null)[]) {
    setSaving(true);
    const toStore = updated.filter(Boolean) as FavoriteAnime[];
    await supabase.from("profiles").update({ favorite_anime: toStore }).eq("id", profileId);
    setSaving(false);
    router.refresh();
  }

  async function pick(idx: number, anime: FavoriteAnime) {
    const updated = [...slots];
    updated[idx] = anime;
    setSlots(updated);
    setPickerOpen(null);
    setSearch("");
    await save(updated);
  }

  async function remove(idx: number) {
    const updated = [...slots];
    updated[idx] = null;
    setSlots(updated);
    await save(updated);
  }

  const filtered = entries.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex gap-4 mt-6">
        {slots.map((slot, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5" style={{ width: 80 }}>
            {slot ? (
              <Link href={`/anime/${slot.mal_id}`} className="group relative block w-full">
                <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: "2/3" }}>
                  <Image src={slot.image_url} alt={slot.title} fill className="object-cover" sizes="80px" />
                  {isOwner && (
                    <button
                      onClick={(e) => { e.preventDefault(); remove(idx); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "var(--destructive)" }}
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
                <p className="text-xs line-clamp-1 text-center" style={{ color: "var(--text-muted)" }}>{slot.title}</p>
              </Link>
            ) : (
              <div className="w-full flex flex-col items-center gap-1">
                <button
                  onClick={() => isOwner && setPickerOpen(idx)}
                  className="w-full rounded-xl flex items-center justify-center transition-colors hover:border-[var(--accent-dim-border)]"
                  style={{
                    aspectRatio: "2/3",
                    backgroundColor: "var(--surface-2)",
                    border: "2px dashed var(--border)",
                    cursor: isOwner ? "pointer" : "default",
                    color: "var(--text-muted)",
                  }}
                >
                  {isOwner ? <Plus size={20} strokeWidth={2} /> : null}
                </button>
                <p className="text-xs" style={{ color: "var(--border)" }}>—</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Picker modal */}
      <AnimatePresence>
      {pickerOpen !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm rounded-3xl p-5 flex flex-col gap-4"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", maxHeight: "80vh", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Pick a favourite</h3>
              <button
                onClick={() => { setPickerOpen(null); setSearch(""); }}
                className="p-1 rounded-lg cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your list…"
              className="px-3.5 py-2 text-sm"
              style={{ backgroundColor: "var(--surface-2)" }}
            />
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {entriesLoading ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>Loading…</p>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 px-2 text-center">
                  <Inbox size={28} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm font-medium">Nothing in your list yet</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Add anime to your watching or completed list first, then come back to set your favourites.
                  </p>
                  <div className="flex gap-2 mt-1">
                    <Link
                      href="/search"
                      className="btn btn-primary text-xs px-4 py-2"
                      onClick={() => { setPickerOpen(null); setSearch(""); }}
                    >
                      Browse anime
                    </Link>
                    <button
                      onClick={() => { setPickerOpen(null); setSearch(""); }}
                      className="btn btn-ghost text-xs px-4 py-2"
                    >
                      Go back
                    </button>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>No matches for &ldquo;{search}&rdquo;</p>
              ) : null}
              {filtered.map((entry) => (
                <button
                  key={entry.mal_id}
                  onClick={() => pick(pickerOpen, entry)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left cursor-pointer transition-colors hover:bg-[var(--surface)]"
                  style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  <div className="relative w-8 h-12 rounded overflow-hidden shrink-0">
                    <Image src={entry.image_url} alt={entry.title} fill className="object-cover" sizes="32px" />
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{entry.title}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
