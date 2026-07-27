import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MotionProvider } from "@/components/MotionProvider";

export const metadata: Metadata = {
  title: "Zukan — Track Your Anime",
  description: "Track anime you've watched, rate them, and build your list.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <MotionProvider>
          <Sidebar />
          <main className="lg:pl-[228px] pt-14 lg:pt-0 min-h-screen relative">
            {children}
          </main>
        </MotionProvider>
      </body>
    </html>
  );
}
