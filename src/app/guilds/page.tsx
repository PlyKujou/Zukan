export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CreateGuildButton } from "@/components/CreateGuildButton";

export default async function GuildsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: guilds } = await supabase
    .from("guilds")
    .select("id, name, slug, description, icon, created_at, guild_members(count)")
    .order("created_at", { ascending: false });

  const myGuildIds = new Set<string>();
  if (user) {
    const { data: memberships } = await supabase
      .from("guild_members")
      .select("guild_id")
      .eq("user_id", user.id);
    memberships?.forEach((m) => myGuildIds.add(m.guild_id));
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Guilds</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Join communities built around the anime you love.
          </p>
        </div>
        {user && <CreateGuildButton />}
      </div>

      {(!guilds || guilds.length === 0) && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-3xl mb-3">⚔️</p>
          <p className="font-semibold mb-1">No guilds yet</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Be the first to create one.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
        {guilds?.map((guild) => {
          const memberCount = (guild.guild_members as unknown as { count: number }[])?.[0]?.count ?? 0;
          const isMember = myGuildIds.has(guild.id);
          return (
            <Link
              key={guild.id}
              href={`/guilds/${guild.slug}`}
              className="rounded-2xl p-5 flex flex-col gap-3 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "var(--surface)", border: `1px solid ${isMember ? "var(--accent)" : "var(--border)"}` }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{guild.icon || "⚔️"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{guild.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {memberCount} {memberCount === 1 ? "member" : "members"}
                    {isMember && <span className="ml-2 font-semibold" style={{ color: "var(--accent)" }}>• Joined</span>}
                  </p>
                </div>
              </div>
              {guild.description && (
                <p className="text-sm line-clamp-2" style={{ color: "var(--text-muted)" }}>
                  {guild.description}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
