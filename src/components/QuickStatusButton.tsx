"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MediaType } from "@/lib/anilist";
import { type ListStatus, STATUS_COLORS, getStatusLabels } from "@/lib/listStatus";

interface Props {
  malId: number;
  userId: string;
  currentStatus: ListStatus;
  episodes?: number | null;
  mediaType?: MediaType;
  /** "dot" = small colored circle button (for card overlays), "badge" = pill with label (for list rows) */
  variant?: "dot" | "badge";
}

export function QuickStatusButton({ malId, userId, currentStatus: initial, episodes, mediaType = "anime", variant = "badge" }: Props) {
  const STATUS_LABELS = getStatusLabels(mediaType);
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
    const update: Record<string, unknown> = { status: s };
    if (s === "completed" && episodes) update.progress = episodes;
    await supabase.from("list_entries").update(update).eq("user_id", userId).eq("mal_id", malId).eq("media_type", mediaType);
    setStatus(s);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    setSaving(true);
    await supabase.from("list_entries").delete().eq("user_id", userId).eq("mal_id", malId).eq("media_type", mediaType);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative shrink-0" onClick={(e) => e.preventDefault()}>
      {variant === "dot" ? (
        <motion.button
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: STATUS_COLORS[status], color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
          title={STATUS_LABELS[status]}
        >
          <Check size={13} strokeWidth={3} />
        </motion.button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
          style={{ backgroundColor: `${STATUS_COLORS[status]}22`, color: STATUS_COLORS[status], border: `1px solid ${STATUS_COLORS[status]}44` }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[status] }} />
          {STATUS_LABELS[status]}
          <ChevronDown size={12} strokeWidth={2.5} style={{ opacity: 0.7 }} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -2 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full mt-1.5 z-50 rounded-2xl p-2 min-w-[168px] origin-top-right"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
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
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 cursor-pointer transition-colors hover:bg-[var(--surface)]"
                    style={{
                      backgroundColor: status === s ? "var(--surface)" : "transparent",
                      color: status === s ? STATUS_COLORS[s] : "var(--text)",
                      fontWeight: status === s ? 700 : 400,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[s] }} />
                    {STATUS_LABELS[s]}
                    {status === s && <Check size={12} strokeWidth={3} className="ml-auto" />}
                  </button>
                ))}
                <div className="my-1.5 h-px" style={{ backgroundColor: "var(--border)" }} />
                <button
                  onClick={remove}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors hover:bg-[var(--surface)]"
                  style={{ color: "var(--destructive)" }}
                >
                  Remove from list
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
