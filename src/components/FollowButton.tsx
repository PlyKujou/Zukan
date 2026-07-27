"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  targetUserId: string;
  isFollowing: boolean;
  currentUserId: string | null;
}

export function FollowButton({ targetUserId, isFollowing: initial, currentUserId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [following, setFollowing] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!currentUserId) { window.location.href = "/login"; return; }
    setLoading(true);
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", targetUserId);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: targetUserId });
    }
    setFollowing(!following);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={following ? "btn btn-ghost" : "btn btn-primary"}
    >
      {loading ? "…" : following ? "Following" : "Follow"}
    </button>
  );
}
