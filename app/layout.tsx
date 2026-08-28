import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Network, Sparkles, Compass, GitMerge } from "lucide-react";
import SearchBar from "@/components/SearchBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Research Companion — Graph-Native Citation & Concept Explorer",
  description:
    "Explore academic research as an interconnected web of papers, authors, citations, and concepts powered by CognoDB openCypher graph database.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className={`${inter.className} min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100`}
      >
        {/* Navigation Bar */}
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  Research Companion
                  <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    CognoDB
                  </span>
                </span>
                <p className="text-[11px] text-slate-400 font-medium leading-none">
                  Graph Citation Explorer
                </p>
              </div>
            </Link>

            {/* Middle Quick Search Bar */}
            <div className="hidden md:block w-72 lg:w-96">
              <SearchBar placeholder="Quick search papers or authors..." />
            </div>

            {/* Nav Links */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/path_tracer"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              >
                <GitMerge className="h-4 w-4 text-blue-500" />
                <span>Path Tracer</span>
              </Link>
              <Link
                href="/researchtopics"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              >
                <Compass className="h-4 w-4 text-emerald-500" />
                <span>Topics</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-500" />
              <span>
                Built for Wexa AI Take-Home Challenge backed by CognoDB & Neo4j
                Bolt
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/path_tracer"
                className="hover:text-sky-500 transition-colors"
              >
                Author Bridge Finder
              </Link>
              <span>•</span>
              <Link
                href="/researchtopics"
                className="hover:text-sky-500 transition-colors"
              >
                Concept Explorer
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
