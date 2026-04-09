import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Zukan — Track Your Anime",
  description: "Track anime you've watched, rate them, and build your list.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {/* Fixed decorative glow orbs — behind everything */}
        <div
          aria-hidden="true"
          style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}
        >
          {/* Top-left orb */}
          <div style={{
            position: "absolute", top: "-280px", left: "160px",
            width: "640px", height: "640px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 65%)",
            filter: "blur(70px)",
          }} />
          {/* Bottom-right orb */}
          <div style={{
            position: "absolute", bottom: "-200px", right: "-100px",
            width: "480px", height: "480px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)",
            filter: "blur(80px)",
          }} />
        </div>

        <Sidebar />
        {/* Desktop: offset by sidebar width. Mobile: offset by top bar height. */}
        <main className="lg:pl-[220px] pt-14 lg:pt-0 min-h-screen" style={{ position: "relative", zIndex: 1 }}>
          <div className="page-enter">{children}</div>
        </main>
      </body>
    </html>
  );
}
