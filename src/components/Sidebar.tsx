"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Home,
  Search,
  Tv2,
  Library,
  Sparkles,
  Zap,
  Shield,
  BarChart2,
  Rss,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  authRequired?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/",                label: "Home",       icon: Home },
  { href: "/search",          label: "Search",     icon: Search },
  { href: "/season",          label: "Season",     icon: Tv2 },
  { href: "/guilds",          label: "Guilds",     icon: Shield },
  { href: "/recommendations", label: "Recs",       icon: Sparkles,  authRequired: true },
  { href: "/discover",        label: "Match",      icon: Zap,       authRequired: true },
  { href: "/activity",        label: "Activity",   icon: Rss,       authRequired: true },
  { href: "/dashboard",       label: "My Lists",   icon: Library,   authRequired: true },
  { href: "/stats",           label: "Stats",      icon: BarChart2, authRequired: true },
];

// ── Logo SVG ────────────────────────────────────────────────────────────────

function ZukanMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      {/* Subtle inner gradient highlight */}
      <rect width="32" height="32" rx="8" fill="url(#zg)" />
      {/* Z mark — three-stroke geometric Z */}
      <path
        d="M8.5 10.5 H23.5"
        stroke="white" strokeWidth="3" strokeLinecap="round"
      />
      <path
        d="M23.5 10.5 L8.5 21.5"
        stroke="white" strokeWidth="2.5" strokeLinecap="round"
        strokeOpacity="0.85"
      />
      <path
        d="M8.5 21.5 H23.5"
        stroke="white" strokeWidth="3" strokeLinecap="round"
      />
      {/* Accent dot — top-right corner detail */}
      <circle cx="25.5" cy="7.5" r="2" fill="white" fillOpacity="0.35" />
      <defs>
        <linearGradient id="zg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.12" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Nav link ────────────────────────────────────────────────────────────────

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
      style={{
        backgroundColor: active ? "var(--accent-dim)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-2)";
          (e.currentTarget as HTMLElement).style.color = "var(--text)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
          (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
        }
      }}
    >
      <Icon size={17} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
      <span>{item.label}</span>
      {active && (
        <span className="ml-auto w-1 h-4 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
      )}
    </Link>
  );
}

// ── Sidebar content (shared between desktop + drawer) ───────────────────────

function SidebarContent({
  user,
  username,
  displayName,
  avatarUrl,
  pathname,
  onClose,
}: {
  user: User | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  pathname: string;
  onClose?: () => void;
}) {
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const visibleItems = NAV_ITEMS.filter((item) => !item.authRequired || user);
  const name = displayName || username;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 mb-1">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
          <ZukanMark size={32} />
          <span className="font-bold text-base tracking-tight" style={{ color: "var(--text)" }}>
            Zukan
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <NavLink key={item.href} item={item} active={active} onClick={onClose} />
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-3 h-px" style={{ backgroundColor: "var(--border)" }} />

      {/* Profile card or auth buttons */}
      <div className="px-3 pb-4">
        {user ? (
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            {/* Avatar + name row */}
            <Link
              href={username ? `/profile/${username}` : "#"}
              onClick={onClose}
              className="flex items-center gap-3 mb-3 group"
            >
              <div
                className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "2px solid var(--border)",
                  color: "var(--accent)",
                }}
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={username ?? "avatar"}
                    width={36}
                    height={36}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span>{name?.[0]?.toUpperCase() ?? "?"}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate leading-snug group-hover:underline"
                  style={{ color: "var(--text)" }}
                >
                  {name ?? "Profile"}
                </p>
                {username && (
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    @{username}
                  </p>
                )}
              </div>
            </Link>

            {/* Sign out */}
            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface)";
                (e.currentTarget as HTMLElement).style.color = "var(--destructive)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              }}
            >
              <LogOut size={13} strokeWidth={2} />
              Sign out
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium w-full transition-colors"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-2)";
                (e.currentTarget as HTMLElement).style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={onClose}
              className="flex items-center justify-center px-3 py-2 rounded-lg text-sm font-semibold text-white w-full transition-colors"
              style={{ backgroundColor: "var(--accent)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--accent)";
              }}
            >
              Sign up free
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", data.user.id)
          .maybeSingle()
          .then(({ data: p }) => {
            setUsername(p?.username ?? null);
            setDisplayName(p?.display_name ?? null);
            setAvatarUrl(p?.avatar_url ?? null);
          });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUsername(null);
        setDisplayName(null);
        setAvatarUrl(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sharedProps = { user, username, displayName, avatarUrl, pathname };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed top-0 left-0 h-screen w-[220px] hidden lg:flex flex-col z-40"
        style={{
          backgroundColor: "var(--surface)",
          borderRight: "1px solid var(--border)",
          boxShadow: "inset -1px 0 0 rgba(99,102,241,0.15), 4px 0 24px rgba(0,0,0,0.3)",
        }}
      >
        <SidebarContent {...sharedProps} />
      </aside>

      {/* Mobile top bar */}
      <header
        className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40 lg:hidden"
        style={{
          backgroundColor: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href="/" className="flex items-center gap-2">
          <ZukanMark size={28} />
          <span className="font-bold text-sm tracking-tight" style={{ color: "var(--text)" }}>
            Zukan
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg cursor-pointer"
          style={{ color: "var(--text-muted)" }}
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute top-0 left-0 h-full w-[220px]"
            style={{
              backgroundColor: "var(--surface)",
              borderRight: "1px solid var(--border)",
              animation: "slide-in-left 0.2s cubic-bezier(0.22,1,0.36,1) both",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={18} />
            </button>
            <SidebarContent {...sharedProps} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
