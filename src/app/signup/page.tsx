"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { GENRES } from "@/lib/genres";
import { ImportPanel } from "@/components/ImportPanel";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Step 2
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else if (!data.session) {
        setError("Check your email to confirm your account before logging in.");
        setLoading(false);
      } else {
        setUserId(data.user?.id ?? null);
        setStep(2);
        setLoading(false);
      }
    } catch {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  function toggleGenre(g: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  }

  async function savePreferences(skip = false) {
    setSaving(true);
    if (!skip && selected.size > 0 && userId) {
      await supabase
        .from("profiles")
        .update({ favorite_genres: [...selected] })
        .eq("id", userId);
    }
    setSaving(false);
    setStep(3);
  }

  async function signInWithGoogle() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Import your list</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Already tracking anime elsewhere? Bring it all in — or skip and start fresh.
            </p>
          </div>

          {userId && (
            <ImportPanel
              userId={userId}
              onDone={() => {
                router.refresh();
                router.push("/dashboard");
              }}
            />
          )}

          <button
            onClick={() => { router.refresh(); router.push("/dashboard"); }}
            className="w-full mt-4 py-2.5 rounded-xl text-sm cursor-pointer"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            Skip — start fresh
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">What do you like?</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Pick your favourite genres — we&apos;ll use these on your profile.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {GENRES.map((g) => {
              const on = selected.has(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer"
                  style={{
                    backgroundColor: on ? "var(--accent)" : "var(--surface)",
                    color: on ? "#fff" : "var(--text-muted)",
                    border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                    transform: on ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => savePreferences(false)}
              disabled={saving || selected.size === 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {saving ? "Saving…" : `Continue with ${selected.size > 0 ? selected.size + " selected" : "selection"}`}
            </button>
            <button
              onClick={() => savePreferences(true)}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm cursor-pointer"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-8 text-center">Create account</h1>

        <button
          onClick={signInWithGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer mb-4"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
        </div>

        <form onSubmit={submitAccount} className="space-y-4">
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--text-muted)" }}>Username</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_]+"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-sm"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--text-muted)" }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-sm"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: "var(--text-muted)" }}>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-sm"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md text-sm font-semibold text-white cursor-pointer"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent)" }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
