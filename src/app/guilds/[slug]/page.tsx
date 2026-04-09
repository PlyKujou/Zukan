export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GuildActions } from "@/components/GuildActions";
import { GuildPostForm } from "@/components/GuildPostForm";
import { GuildPostList } from "@/components/GuildPostList";
import { GuildMemberActions } from "@/components/GuildMemberActions";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function GuildPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: guild } = await supabase
    .from("guilds")
    .select("id, name, slug, description, icon, created_by")
    .eq("slug", slug)
    .maybeSingle();

  if (!guild) notFound();

  const [{ data: members }, { data: posts }] = await Promise.all([
    supabase
      .from("guild_members")
      .select("user_id, role, joined_at, profiles(username, display_name, avatar_url)")
      .eq("guild_id", guild.id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("guild_posts")
      .select("id, title, body, created_at, profiles(username, display_name)")
      .eq("guild_id", guild.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const myMembership = user
    ? members?.find((m) => (m.profiles as unknown as { username: string } | null)?.username && user)
    : null;

  const { data: myMemberRow } = user
    ? await supabase.from("guild_members").select("role").eq("guild_id", guild.id).eq("user_id", user.id).maybeSingle()
    : { data: null };

  const isMember = !!myMemberRow;
  const isOwner = myMemberRow?.role === "owner";

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div
        className="rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <span className="text-5xl">{guild.icon || "⚔️"}</span>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{guild.name}</h1>
          {guild.description && (
            <p className="text-sm mt-1 max-w-xl" style={{ color: "var(--text-muted)" }}>{guild.description}</p>
          )}
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            {members?.length ?? 0} {(members?.length ?? 0) === 1 ? "member" : "members"}
          </p>
        </div>
        {user && (
          <GuildActions
            guildId={guild.id}
            isMember={isMember}
            isOwner={isOwner}
            userId={user.id}
          />
        )}
        {!user && (
          <Link href="/login" className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--accent)" }}>
            Log in to join
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
        {/* Posts */}
        <div>
          {isMember && (
            <GuildPostForm guildId={guild.id} userId={user!.id} />
          )}
          {!isMember && user && (
            <div
              className="rounded-xl p-4 mb-6 text-sm text-center"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              Join this guild to post.
            </div>
          )}
          <GuildPostList
            posts={(posts ?? []) as unknown as {
              id: string;
              title: string | null;
              body: string;
              created_at: string;
              profiles: { username: string; display_name: string | null } | null;
            }[]}
            currentUserId={user?.id ?? null}
            guildId={guild.id}
          />
        </div>

        {/* Members sidebar */}
        <div
          className="rounded-2xl p-5 h-fit"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-bold mb-4 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Members
          </h2>
          <div className="space-y-3">
            {members?.map((m) => {
              const profile = m.profiles as unknown as { username: string; display_name: string | null } | null;
              if (!profile) return null;
              return (
                <div key={profile.username} className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
                  >
                    {profile.username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${profile.username}`} className="text-sm font-medium hover:underline truncate block">
                      {profile.display_name || profile.username}
                    </Link>
                  </div>
                  {m.role === "owner" && (
                    <span className="text-xs font-bold shrink-0" style={{ color: "var(--accent)" }}>Owner</span>
                  )}
                  {m.role === "mod" && (
                    <span className="text-xs font-bold shrink-0" style={{ color: "#60a5fa" }}>Mod</span>
                  )}
                  {user && isOwner && (
                    <GuildMemberActions
                      guildId={guild.id}
                      targetUserId={m.user_id}
                      currentRole={m.role}
                      ownerId={guild.created_by ?? ""}
                      viewerRole={myMemberRow?.role ?? "member"}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
