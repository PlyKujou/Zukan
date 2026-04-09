"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Source = "mal" | "anilist" | null;

interface ImportEntry {
  mal_id: number;
  title: string;
  image_url: string;
  episodes: number | null;
  status: string;
  rating: number | null;
  progress: number;
}

const MAL_STATUS: Record<string, string> = {
  "Watching": "watching",
  "Completed": "completed",
  "On-Hold": "on_hold",
  "Dropped": "dropped",
  "Plan to Watch": "plan_to_watch",
};

const ANILIST_STATUS: Record<string, string> = {
  "CURRENT": "watching",
  "COMPLETED": "completed",
  "PAUSED": "on_hold",
  "DROPPED": "dropped",
  "PLANNING": "plan_to_watch",
  "REPEATING": "watching",
};

function parseMAL(xml: string): ImportEntry[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const entries: ImportEntry[] = [];
  doc.querySelectorAll("anime").forEach((node) => {
    const malId = parseInt(node.querySelector("series_animedb_id")?.textContent ?? "0");
    if (!malId) return;
    const score = parseInt(node.querySelector("my_score")?.textContent ?? "0");
    const statusRaw = node.querySelector("my_status")?.textContent ?? "";
    entries.push({
      mal_id: malId,
      title: node.querySelector("series_title")?.textContent ?? "",
      image_url: "",
      episodes: parseInt(node.querySelector("series_episodes")?.textContent ?? "0") || null,
      status: MAL_STATUS[statusRaw] ?? "plan_to_watch",
      rating: score > 0 ? score : null,
      progress: parseInt(node.querySelector("my_watched_episodes")?.textContent ?? "0"),
    });
  });
  return entries;
}

function parseAniList(json: string): ImportEntry[] {
  try {
    const data = JSON.parse(json);
    const entries: ImportEntry[] = [];
    const lists = data.lists ?? data;
    for (const [status, items] of Object.entries(lists)) {
      if (!Array.isArray(items)) continue;
      const mappedStatus = ANILIST_STATUS[status] ?? "plan_to_watch";
      for (const item of items) {
        const malId = item.media?.idMal ?? item.idMal;
        if (!malId) continue;
        const score = item.score ? Math.round(item.score) : null;
        entries.push({
          mal_id: malId,
          title: item.media?.title?.english || item.media?.title?.romaji || "",
          image_url: item.media?.coverImage?.large || item.media?.coverImage?.medium || "",
          episodes: item.media?.episodes ?? null,
          status: mappedStatus,
          rating: score && score > 0 ? Math.min(10, score) : null,
          progress: item.progress ?? 0,
        });
      }
    }
    return entries;
  } catch { return []; }
}

interface Props {
  userId: string;
  onDone?: (count: number) => void;
}

export function ImportPanel({ userId, onDone }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<Source>(null);
  const [parsed, setParsed] = useState<ImportEntry[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function pickSource(s: Source) {
    setSource(s);
    setParsed(null);
    setError(null);
    setDone(false);
    setTimeout(() => fileRef.current?.click(), 50);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const text = await file.text();
    const entries = source === "mal" ? parseMAL(text) : parseAniList(text);
    if (entries.length === 0) {
      setError("Couldn't parse the file. Make sure you uploaded the right export.");
    } else {
      setParsed(entries);
    }
    e.target.value = "";
  }

  async function runImport() {
    if (!parsed || !userId) return;
    setImporting(true);
    setError(null);

    const rows = parsed.map((e) => ({ ...e, user_id: userId }));

    // Batch in chunks of 50 to avoid payload limits
    for (let i = 0; i < rows.length; i += 50) {
      const { error: err } = await supabase
        .from("list_entries")
        .upsert(rows.slice(i, i + 50), { onConflict: "user_id,mal_id" });
      if (err) { setError(err.message); setImporting(false); return; }
    }

    setImporting(false);
    setDone(true);
    onDone?.(parsed.length);
  }

  const statusCounts = parsed
    ? Object.entries(
        parsed.reduce((acc, e) => { acc[e.status] = (acc[e.status] ?? 0) + 1; return acc; }, {} as Record<string, number>)
      )
    : [];

  const STATUS_LABELS: Record<string, string> = {
    watching: "Watching", completed: "Completed", plan_to_watch: "Plan to Watch",
    on_hold: "On Hold", dropped: "Dropped",
  };

  if (done) {
    return (
      <div className="text-center py-8">
        <p className="text-2xl mb-2">✓</p>
        <p className="font-semibold mb-1">Import complete</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {parsed?.length} anime imported from {source === "mal" ? "MyAnimeList" : "AniList"}.
        </p>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept={source === "mal" ? ".xml" : ".json"}
        className="hidden"
        onChange={onFile}
      />

      {/* Source picker */}
      {!parsed && (
        <div className="grid grid-cols-2 gap-3">
          <SourceCard
            label="MyAnimeList"
            sublabel="Upload your XML export"
            hint='myanimelist.net → Profile → Export'
            active={source === "mal"}
            onClick={() => pickSource("mal")}
          />
          <SourceCard
            label="AniList"
            sublabel="Upload your JSON export"
            hint='anilist.co → Settings → Import/Export'
            active={source === "anilist"}
            onClick={() => pickSource("anilist")}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

      {/* Preview */}
      {parsed && !done && (
        <div
          className="rounded-xl p-5 mt-2"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold">
              {parsed.length} anime found
              <span className="text-sm font-normal ml-2" style={{ color: "var(--text-muted)" }}>
                from {source === "mal" ? "MyAnimeList" : "AniList"}
              </span>
            </p>
            <button
              onClick={() => { setParsed(null); setSource(null); }}
              className="text-xs cursor-pointer hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              Change file
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {statusCounts.map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg"
                style={{ backgroundColor: "var(--surface-2)" }}>
                <span style={{ color: "var(--text-muted)" }}>{STATUS_LABELS[status] ?? status}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

          <button
            onClick={runImport}
            disabled={importing}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {importing ? "Importing…" : `Import ${parsed.length} anime`}
          </button>
        </div>
      )}
    </div>
  );
}

function SourceCard({ label, sublabel, hint, active, onClick }: {
  label: string; sublabel: string; hint: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-4 rounded-xl cursor-pointer transition-all"
      style={{
        backgroundColor: active ? "var(--accent-dim)" : "var(--surface)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      }}
    >
      <p className="font-semibold text-sm mb-0.5">{label}</p>
      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{sublabel}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.7 }}>{hint}</p>
    </button>
  );
}
