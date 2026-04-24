"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Download } from "lucide-react";

type Format = "mal" | "anilist";

const TO_MAL_STATUS: Record<string, string> = {
  watching:      "Watching",
  completed:     "Completed",
  on_hold:       "On-Hold",
  dropped:       "Dropped",
  plan_to_watch: "Plan to Watch",
};

const TO_ANILIST_STATUS: Record<string, string> = {
  watching:      "CURRENT",
  completed:     "COMPLETED",
  on_hold:       "PAUSED",
  dropped:       "DROPPED",
  plan_to_watch: "PLANNING",
};

interface Entry {
  mal_id: number;
  title: string;
  episodes: number | null;
  status: string;
  rating: number | null;
  progress: number;
}

function buildMALXML(entries: Entry[], username: string): string {
  const counts = {
    watching:      entries.filter((e) => e.status === "watching").length,
    completed:     entries.filter((e) => e.status === "completed").length,
    on_hold:       entries.filter((e) => e.status === "on_hold").length,
    dropped:       entries.filter((e) => e.status === "dropped").length,
    plan_to_watch: entries.filter((e) => e.status === "plan_to_watch").length,
  };

  const animeXML = entries.map((e) => `  <anime>
    <series_animedb_id>${e.mal_id}</series_animedb_id>
    <series_title><![CDATA[${e.title}]]></series_title>
    <series_episodes>${e.episodes ?? 0}</series_episodes>
    <my_watched_episodes>${e.progress}</my_watched_episodes>
    <my_start_date>0000-00-00</my_start_date>
    <my_finish_date>0000-00-00</my_finish_date>
    <my_score>${e.rating ?? 0}</my_score>
    <my_status>${TO_MAL_STATUS[e.status] ?? "Plan to Watch"}</my_status>
    <my_rewatching>0</my_rewatching>
    <my_rewatching_ep>0</my_rewatching_ep>
    <my_comments><![CDATA[]]></my_comments>
    <my_tags><![CDATA[]]></my_tags>
    <update_on_import>1</update_on_import>
  </anime>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<myanimelist>
  <myinfo>
    <user_name>${username}</user_name>
    <user_export_type>1</user_export_type>
    <user_total_anime>${entries.length}</user_total_anime>
    <user_total_watching>${counts.watching}</user_total_watching>
    <user_total_completed>${counts.completed}</user_total_completed>
    <user_total_onhold>${counts.on_hold}</user_total_onhold>
    <user_total_dropped>${counts.dropped}</user_total_dropped>
    <user_total_plantowatch>${counts.plan_to_watch}</user_total_plantowatch>
  </myinfo>
${animeXML}
</myanimelist>`;
}

function buildAniListJSON(entries: Entry[]): string {
  const grouped: Record<string, object[]> = {
    CURRENT: [], COMPLETED: [], PAUSED: [], DROPPED: [], PLANNING: [],
  };

  for (const e of entries) {
    const key = TO_ANILIST_STATUS[e.status] ?? "PLANNING";
    grouped[key].push({
      media: {
        idMal: e.mal_id,
        title: { romaji: e.title, english: e.title },
        episodes: e.episodes,
      },
      score: e.rating ?? 0,
      progress: e.progress,
      status: key,
    });
  }

  return JSON.stringify({ lists: grouped }, null, 2);
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  userId: string;
  username: string;
}

export function ExportPanel({ userId, username }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState<Format | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Format | null>(null);

  async function exportAs(format: Format) {
    setLoading(format);
    setError(null);
    setDone(null);

    const { data: entries, error: err } = await supabase
      .from("list_entries")
      .select("mal_id, title, episodes, status, rating, progress")
      .eq("user_id", userId);

    if (err || !entries) {
      setError(err?.message ?? "Failed to load your list.");
      setLoading(null);
      return;
    }

    if (entries.length === 0) {
      setError("Your list is empty — nothing to export.");
      setLoading(null);
      return;
    }

    if (format === "mal") {
      const xml = buildMALXML(entries, username);
      download(xml, `zukan-export-mal.xml`, "text/xml");
    } else {
      const json = buildAniListJSON(entries);
      download(json, `zukan-export-anilist.json`, "application/json");
    }

    setLoading(null);
    setDone(format);
  }

  return (
    <div className="space-y-3">
      <ExportCard
        label="MyAnimeList"
        sublabel="Downloads a .xml file"
        hint="Import at myanimelist.net → Profile → Import"
        loading={loading === "mal"}
        done={done === "mal"}
        onClick={() => exportAs("mal")}
      />
      <ExportCard
        label="AniList"
        sublabel="Downloads a .json file"
        hint="Import at anilist.co → Settings → Import/Export"
        loading={loading === "anilist"}
        done={done === "anilist"}
        onClick={() => exportAs("anilist")}
      />
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
}

function ExportCard({ label, sublabel, hint, loading, done, onClick }: {
  label: string;
  sublabel: string;
  hint: string;
  loading: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sublabel}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", opacity: 0.7 }}>{hint}</p>
      </div>
      <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer transition-opacity disabled:opacity-50 shrink-0 ml-4"
        style={{ backgroundColor: done ? "var(--success)" : "var(--accent)" }}
      >
        <Download size={14} strokeWidth={2} />
        {loading ? "Exporting…" : done ? "Downloaded" : "Export"}
      </button>
    </div>
  );
}
