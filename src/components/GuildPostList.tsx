"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

const PAGE_SIZE = 10;

export function GuildPostList({ posts, currentUserId, guildId }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (posts.length === 0) {
    return (
      <p className="text-sm text-center py-10" style={{ color: "var(--text-muted)" }}>
        No posts yet. Be the first to post!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.slice(0, visibleCount).map((post, i) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
        >
          <PostCard post={post} currentUserId={currentUserId} guildId={guildId} />
        </motion.div>
      ))}
      {posts.length > visibleCount && (
        <div className="flex justify-center pt-2">
          <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="btn btn-ghost">
            Load more ({posts.length - visibleCount} remaining)
          </button>
        </div>
      )}
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
    <div className="card card-hover p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${post.profiles?.username ?? ""}`}
            className="text-sm font-semibold hover:underline"
            style={{ color: "var(--text)" }}
          >
            {post.profiles?.display_name || post.profiles?.username || "Unknown"}
          </Link>
          <span className="text-xs font-mono-nums" style={{ color: "var(--text-muted)" }}>
            {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        {currentUserId && (
          <button
            onClick={deletePost}
            disabled={deleting}
            className="text-xs cursor-pointer hover:underline"
            style={{ color: "var(--destructive)" }}
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
