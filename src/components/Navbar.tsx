"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <nav
      style={{ backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg" style={{ color: "var(--accent)" }}>
          Zukan
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/search" style={{ color: "var(--text-muted)" }} className="hover:text-white transition-colors">
            Search
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" style={{ color: "var(--text-muted)" }} className="hover:text-white transition-colors">
                My Lists
              </Link>
              <Link href="/profile/edit" style={{ color: "var(--text-muted)" }} className="hover:text-white transition-colors">
                Profile
              </Link>
              <button
                onClick={signOut}
                style={{ color: "var(--text-muted)" }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{ color: "var(--text-muted)" }}
                className="hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 rounded-md text-white text-sm font-medium transition-colors"
                style={{ backgroundColor: "var(--accent)" }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
