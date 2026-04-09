"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  body: string;
  created_at: string;
  profiles: { username: string } | null;
}

interface Props {
  malId: number;
  animeTitle: string;
}

export function ReviewSection({ malId, animeTitle }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [myReview, setMyReview] = useState<Review | null>(null);

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [malId]);

  useEffect(() => {
    if (userId) {
      const mine = reviews.find((r) => r.user_id === userId) ?? null;
      setMyReview(mine);
      if (mine) {
        setRating(mine.rating);
        setBody(mine.body);
      }
    }
  }, [reviews, userId]);

  async function loadReviews() {
    const { data } = await supabase
      .from("reviews")
      .select("*, profiles(username)")
      .eq("mal_id", malId)
      .order("created_at", { ascending: false });
    setReviews((data as Review[]) ?? []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Please select a rating."); return; }
    if (body.trim().length < 10) { setError("Review must be at least 10 characters."); return; }
    if (!userId) return;
    setSaving(true);
    setError(null);

    const { error: err } = await supabase.from("reviews").upsert({
      user_id: userId,
      mal_id: malId,
      anime_title: animeTitle,
      rating,
      body: body.trim(),
    }, { onConflict: "user_id,mal_id" });

    if (err) { setError(err.message); } else { await loadReviews(); setEditing(false); router.refresh(); }
    setSaving(false);
  }

  async function deleteReview() {
    if (!userId) return;
    setSaving(true);
    await supabase.from("reviews").delete().eq("user_id", userId).eq("mal_id", malId);
    setMyReview(null);
    setRating(0);
    setBody("");
    await loadReviews();
    router.refresh();
    setSaving(false);
  }

  const avg = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const showForm = userId && (!myReview || editing);

  return (
    <div className="mt-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-bold">Zukan Reviews</h2>
        {avg && (
          <span
            className="text-sm font-bold px-2 py-0.5 rounded-lg"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            ★ {avg} / 10
          </span>
        )}
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
        </span>
      </div>

      {/* My existing review (not editing) */}
      {myReview && !editing && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{ backgroundColor: "var(--accent-dim)", border: "1px solid var(--accent)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Your review</span>
              <RatingBadge rating={myReview.rating} />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(true)}
                className="text-xs cursor-pointer hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                Edit
              </button>
              <button
                onClick={deleteReview}
                disabled={saving}
                className="text-xs cursor-pointer hover:underline"
                style={{ color: "#f87171" }}
              >
                Delete
              </button>
            </div>
          </div>
          <p className="text-sm leading-relaxed">{myReview.body}</p>
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="rounded-xl p-5 mb-8"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm font-semibold mb-4">
            {editing ? "Edit your review" : "Write a review"}
          </p>

          {/* Rating picker */}
          <div className="mb-4">
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Rating</p>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="w-8 h-8 rounded-lg text-sm font-bold transition-colors cursor-pointer"
                  style={{
                    backgroundColor: rating === n ? "var(--accent)" : "var(--surface-2)",
                    color: rating === n ? "#fff" : "var(--text-muted)",
                    border: `1px solid ${rating === n ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="mb-4">
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Review</p>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your thoughts on this anime…"
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>

          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {saving ? "Saving…" : editing ? "Update review" : "Submit review"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(false); setRating(myReview!.rating); setBody(myReview!.body); }}
                className="px-4 py-2 rounded-lg text-sm cursor-pointer"
                style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* Not logged in prompt */}
      {!userId && (
        <div
          className="rounded-xl p-4 mb-8 text-sm"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <Link href="/login" style={{ color: "var(--accent)" }}>Log in</Link> to write a review.
        </div>
      )}

      {/* Review list */}
      {reviews.filter((r) => r.user_id !== userId).length === 0 && !myReview && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No reviews yet. Be the first!
        </p>
      )}

      <div className="space-y-4">
        {reviews
          .filter((r) => r.user_id !== userId)
          .map((review) => (
            <div
              key={review.id}
              className="rounded-xl p-4"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href={`/profile/${review.profiles?.username ?? ""}`}
                  className="text-sm font-semibold hover:underline"
                  style={{ color: "var(--text)" }}
                >
                  {review.profiles?.username ?? "Unknown"}
                </Link>
                <RatingBadge rating={review.rating} />
                <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
                  {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {review.body}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  return (
    <span
      className="text-xs font-bold px-1.5 py-0.5 rounded"
      style={{ backgroundColor: "var(--surface-2)", color: "var(--accent)" }}
    >
      ★ {rating}/10
    </span>
  );
}
