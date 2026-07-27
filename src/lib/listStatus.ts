import type { MediaType } from "./anilist";

export type ListStatus = "watching" | "completed" | "plan_to_watch" | "on_hold" | "dropped";

export const STATUS_ORDER: ListStatus[] = ["watching", "completed", "plan_to_watch", "on_hold", "dropped"];

export const STATUS_COLORS: Record<ListStatus, string> = {
  watching: "#ff4e2a",
  completed: "#46d69a",
  plan_to_watch: "#5eb0ff",
  on_hold: "#ffb257",
  dropped: "#8a7d6e",
};

const ANIME_LABELS: Record<ListStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  plan_to_watch: "Plan to Watch",
  on_hold: "On Hold",
  dropped: "Dropped",
};

const MANGA_LABELS: Record<ListStatus, string> = {
  watching: "Reading",
  completed: "Completed",
  plan_to_watch: "Plan to Read",
  on_hold: "On Hold",
  dropped: "Dropped",
};

export function getStatusLabels(mediaType: MediaType = "anime"): Record<ListStatus, string> {
  return mediaType === "manga" ? MANGA_LABELS : ANIME_LABELS;
}
