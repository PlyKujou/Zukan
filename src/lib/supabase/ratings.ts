import { createClient } from "./server";

/** Returns a map of mal_id → average Zukan rating string for the given ids. */
export async function getZukanRatings(malIds: number[]): Promise<Record<number, string>> {
  if (malIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("mal_id, rating")
    .in("mal_id", malIds);
  if (!data || data.length === 0) return {};

  const sums: Record<number, { sum: number; count: number }> = {};
  for (const { mal_id, rating } of data as { mal_id: number; rating: number }[]) {
    if (!sums[mal_id]) sums[mal_id] = { sum: 0, count: 0 };
    sums[mal_id].sum += rating;
    sums[mal_id].count += 1;
  }

  const result: Record<number, string> = {};
  for (const [id, { sum, count }] of Object.entries(sums)) {
    result[Number(id)] = (sum / count).toFixed(1);
  }
  return result;
}
