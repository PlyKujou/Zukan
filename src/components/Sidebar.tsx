"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Browse",
    items: [
      { href: "/",       label: "Home",   icon: Home },
      { href: "/search", label: "Search", icon: Search },
      { href: "/season", label: "Season", icon: Tv2 },
      { href: "/guilds", label: "Guilds", icon: Shield },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/dashboard",       label: "My Lists", icon: Library,   authRequired: true },
      { href: "/recommendations", label: "Recs",     icon: Sparkles,  authRequired: true },
      { href: "/discover",        label: "Match",    icon: Zap,       authRequired: true },
      { href: "/activity",        label: "Activity", icon: Rss,       authRequired: true },
      { href: "/stats",           label: "Stats",    icon: BarChart2, authRequired: true },
    ],
  },
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
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <rect width="32" height="32" rx="9" fill="url(#zg)" />
      <path d="M8.5 10.5 H23.5" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M23.5 10.5 L8.5 21.5"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.85"
      />
      <path d="M8.5 21.5 H23.5" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="25.5" cy="7.5" r="2" fill="white" fillOpacity="0.4" />
      <defs>
        <linearGradient id="zg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.16" />
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
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
        active
          ? "text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-xl"
          style={{
            backgroundColor: "var(--accent-dim)",
            border: "1px solid var(--accent-dim-border)",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <Icon size={17} strokeWidth={active ? 2.5 : 2} className="relative shrink-0" />
      <span className="relative">{item.label}</span>
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

  const name = displayName || username;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 mb-1">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
          <ZukanMark size={30} />
          <span className="font-bold text-base tracking-tight" style={{ color: "var(--text)" }}>
            Zukan
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-6">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => !item.authRequired || user);
          if (visible.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="eyebrow px-3 mb-2" style={{ fontSize: "0.625rem" }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const active =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <NavLink key={item.href} item={item} active={active} onClick={onClose} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-3 h-px" style={{ backgroundColor: "var(--border)" }} />

      {/* Profile card or auth buttons */}
      <div className="px-3 pb-4">
        {user ? (
          <div className="card p-3" style={{ backgroundColor: "var(--surface-2)" }}>
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
                  <p className="text-xs truncate font-mono-nums" style={{ color: "var(--text-muted)" }}>
                    @{username}
                  </p>
                )}
              </div>
            </Link>

            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--destructive)]"
            >
              <LogOut size={13} strokeWidth={2} />
              Sign out
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div
              className="rounded-2xl p-3 mb-2"
              style={{ backgroundColor: "var(--accent-dim)", border: "1px solid var(--accent-dim-border)" }}
            >
              <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--accent)" }}>
                Join Zukan free
              </p>
              <p className="text-xs leading-snug" style={{ color: "var(--text-muted)" }}>
                Track your lists, rate anime, and discover what to watch next.
              </p>
            </div>
            <Link href="/login" onClick={onClose} className="btn btn-ghost w-full text-sm py-2">
              Log in
            </Link>
            <Link href="/signup" onClick={onClose} className="btn btn-primary w-full text-sm py-2">
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
        className="fixed top-0 left-0 h-screen w-[228px] hidden lg:flex flex-col z-40"
        style={{
          backgroundColor: "var(--surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <SidebarContent {...sharedProps} />
      </aside>

      {/* Mobile top bar */}
      <header
        className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40 lg:hidden"
        style={{
          backgroundColor: "rgba(11, 9, 8, 0.85)",
          backdropFilter: "blur(12px)",
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
          aria-label="Open menu"
          className="p-2 rounded-lg cursor-pointer text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", stiffness: 400, damping: 38 }}
              className="absolute top-0 left-0 h-full w-[228px]"
              style={{
                backgroundColor: "var(--surface)",
                borderRight: "1px solid var(--border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute top-5 right-4 p-1.5 rounded-lg cursor-pointer text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                <X size={18} />
              </button>
              <SidebarContent {...sharedProps} onClose={() => setMobileOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
