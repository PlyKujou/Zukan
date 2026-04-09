"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ListStatus = "watching" | "completed" | "plan_to_watch" | "on_hold" | "dropped";

const STATUS_LABELS: Record<ListStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  plan_to_watch: "Plan to Watch",
  on_hold: "On Hold",
  dropped: "Dropped",
};

const STATUS_COLORS: Record<ListStatus, string> = {
  watching: "#f43f5e",
  completed: "#22c55e",
  plan_to_watch: "#60a5fa",
  on_hold: "#facc15",
  dropped: "#f87171",
};

interface Props {
  malId: number;
  userId: string;
  currentStatus: ListStatus;
  /** "dot" = small colored circle button (for card overlays), "badge" = pill with label (for list rows) */
  variant?: "dot" | "badge";
}

export function QuickStatusButton({ malId, userId, currentStatus: initial, variant = "badge" }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [status, setStatus] = useState<ListStatus>(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  async function pick(s: ListStatus) {
    setSaving(true);
    await supabase.from("list_entries").update({ status: s }).eq("user_id", userId).eq("mal_id", malId);
    setStatus(s);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    setSaving(true);
    await supabase.from("list_entries").delete().eq("user_id", userId).eq("mal_id", malId);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative shrink-0" onClick={(e) => e.preventDefault()}>
      {variant === "dot" ? (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-transform hover:scale-110"
          style={{ backgroundColor: STATUS_COLORS[status], color: "#fff", boxShadow: `0 2px 8px rgba(0,0,0,0.4)` }}
          title={STATUS_LABELS[status]}
        >
          ✓
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
          style={{ backgroundColor: `${STATUS_COLORS[status]}22`, color: STATUS_COLORS[status], border: `1px solid ${STATUS_COLORS[status]}44` }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[status] }} />
          {STATUS_LABELS[status]}
          <span style={{ opacity: 0.7 }}>▾</span>
        </button>
      )}

      {open && (
        <div
          className="modal-enter absolute right-0 top-full mt-1.5 z-50 rounded-xl p-2 min-w-[160px]"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {saving ? (
            <p className="text-xs px-2 py-1" style={{ color: "var(--text-muted)" }}>Saving…</p>
          ) : (
            <>
              {(Object.keys(STATUS_LABELS) as ListStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => pick(s)}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: status === s ? "var(--surface-2)" : "transparent",
                    color: status === s ? STATUS_COLORS[s] : "var(--text)",
                    fontWeight: status === s ? 700 : 400,
                  }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[s] }} />
                  {STATUS_LABELS[s]}
                  {status === s && <span className="ml-auto">✓</span>}
                </button>
              ))}
              <div className="my-1.5 h-px" style={{ backgroundColor: "var(--border)" }} />
              <button
                onClick={remove}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                style={{ color: "#f87171" }}
              >
                Remove from list
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
