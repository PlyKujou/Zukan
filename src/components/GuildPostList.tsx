"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Post {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
}

interface Props {
  posts: Post[];
  currentUserId: string | null;
  guildId: string;
}

export function GuildPostList({ posts, currentUserId, guildId }: Props) {
  if (posts.length === 0) {
    return (
      <p className="text-sm text-center py-10" style={{ color: "var(--text-muted)" }}>
        No posts yet. Be the first to post!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} guildId={guildId} />
      ))}
    </div>
  );
}

function PostCard({ post, currentUserId, guildId }: { post: Post; currentUserId: string | null; guildId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  // We don't have user_id on posts passed here, so we check by username match isn't possible
  // Instead, we pass currentUserId and delete by post id with RLS handling it
  async function deletePost() {
    if (!confirm("Delete this post?")) return;
    setDeleting(true);
    await supabase.from("guild_posts").delete().eq("id", post.id);
    router.refresh();
    setDeleting(false);
  }

  const isOwn = !!currentUserId; // RLS will enforce actual ownership on delete

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${post.profiles?.username ?? ""}`}
            className="text-sm font-semibold hover:underline"
            style={{ color: "var(--text)" }}
          >
            {post.profiles?.display_name || post.profiles?.username || "Unknown"}
          </Link>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        {currentUserId && (
          <button
            onClick={deletePost}
            disabled={deleting}
            className="text-xs cursor-pointer hover:underline"
            style={{ color: "#f87171" }}
          >
            {deleting ? "…" : "Delete"}
          </button>
        )}
      </div>
      {post.title && <p className="font-semibold mb-1">{post.title}</p>}
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {post.body}
      </p>
    </div>
  );
}
