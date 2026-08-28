"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  GitMerge,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  User,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import GraphView from "@/components/GraphView";
import { GraphNode, GraphEdge } from "@/lib/queries";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface AuthorSelection {
  id: string;
  name: string;
}

interface PathResultState {
  found: boolean;
  message?: string;
  pathLength?: number;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  explanation?: string[];
}

function PathTracerContent() {
  const searchParams = useSearchParams();
  const initialAuthorA = searchParams.get("authorA");
  const initialAuthorB = searchParams.get("authorB");

  const [authorA, setAuthorA] = useState<AuthorSelection | null>(null);
  const [authorB, setAuthorB] = useState<AuthorSelection | null>(null);
  const [samples, setSamples] = useState<
    Array<{ authorAId: string; authorAName: string; authorBId: string; authorBName: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PathResultState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSamples() {
      try {
        const res = await fetch("/apis/graph/path?sample=true");
        if (res.ok) {
          const data = await res.json();
          setSamples(data.samples || []);
        }
      } catch (err) {
        console.error("Failed to load sample author pairs:", err);
      }
    }
    fetchSamples();
  }, []);

  useEffect(() => {
    if (initialAuthorA) {
      fetch(`/apis/researchauthors/${initialAuthorA}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.author) setAuthorA({ id: d.author.id, name: d.author.name });
        })
        .catch(() => setAuthorA({ id: initialAuthorA, name: `Author ${initialAuthorA}` }));
    }
    if (initialAuthorB) {
      fetch(`/apis/researchauthors/${initialAuthorB}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.author) setAuthorB({ id: d.author.id, name: d.author.name });
        })
        .catch(() => setAuthorB({ id: initialAuthorB, name: `Author ${initialAuthorB}` }));
    }
  }, [initialAuthorA, initialAuthorB]);

  const handleTrace = async (aId?: string, bId?: string) => {
    const targetA = aId || authorA?.id;
    const targetB = bId || authorB?.id;

    if (!targetA || !targetB) {
      setErrorMessage("Please select two authors to compute the concept bridge path.");
      return;
    }

    if (targetA === targetB) {
      setErrorMessage("Please select two different authors.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const res = await fetch(
        `/apis/graph/path?authorA=${encodeURIComponent(targetA)}&authorB=${encodeURIComponent(targetB)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || "Failed to query path from database");
      }

      setResult(data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error querying bridge path");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6 sm:p-8 dark:border-purple-900/50 dark:from-purple-950/40 dark:via-slate-900 dark:to-indigo-950/40 shadow-sm space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-100/60 px-3 py-1 text-xs font-semibold text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Assignment Requirement: Relational-Awkward Graph Query</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Author Concept Bridge Pathfinder
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl">
          Trace the shortest chain of shared ideas connecting two researchers who have never co-authored a paper together.
          Powered by openCypher <code className="font-mono font-semibold text-purple-600 dark:text-purple-400">shortestPath((a:Author)-[:AUTHORED|ABOUT*..8]-(b:Author))</code>.
        </p>
      </div>

      {/* Selectors Card */}
      <Card className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Author A */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="h-4 w-4 text-purple-500" /> Researcher A
            </label>
            {authorA ? (
              <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/60 px-4 py-3 dark:border-purple-800 dark:bg-purple-950/40">
                <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">
                  {authorA.name}
                </span>
                <button
                  onClick={() => setAuthorA(null)}
                  className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 font-semibold"
                >
                  Change
                </button>
              </div>
            ) : (
              <SearchBar
                placeholder="Search Researcher A..."
                autoNavigate={false}
                onSelect={(item) => {
                  if (item.type === "Author") {
                    setAuthorA({ id: item.id, name: item.title });
                  }
                }}
              />
            )}
          </div>

          {/* Author B */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="h-4 w-4 text-indigo-500" /> Researcher B
            </label>
            {authorB ? (
              <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-950/40">
                <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  {authorB.name}
                </span>
                <button
                  onClick={() => setAuthorB(null)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold"
                >
                  Change
                </button>
              </div>
            ) : (
              <SearchBar
                placeholder="Search Researcher B..."
                autoNavigate={false}
                onSelect={(item) => {
                  if (item.type === "Author") {
                    setAuthorB({ id: item.id, name: item.title });
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          {samples.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Sample Pairs:</span>
              {samples.slice(0, 3).map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setAuthorA({ id: sample.authorAId, name: sample.authorAName });
                    setAuthorB({ id: sample.authorBId, name: sample.authorBName });
                    handleTrace(sample.authorAId, sample.authorBId);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                >
                  {sample.authorAName} & {sample.authorBName}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => handleTrace()}
            disabled={!authorA || !authorB || isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-purple-500/20 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Tracing Graph Path...
              </>
            ) : (
              <>
                <GitMerge className="h-4 w-4" /> Trace Concept Bridge
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Error */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-3">
          {result.found ? (
            <>
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    Concept Bridge Discovered ({result.pathLength} hops)
                  </h3>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    Non-Coauthored Connection
                  </span>
                </div>

                <div className="space-y-2.5 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Step-by-Step Traversal Explanation:
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {result.explanation?.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[11px] font-bold text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Interactive Bridge Graph Visualization
                </h3>
                <GraphView
                  nodes={result.nodes || []}
                  edges={result.edges || []}
                  height={480}
                />
              </div>
            </>
          ) : (
            <Card className="p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Direct Concept Bridge Found</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {result.message || "No path within 8 hops connects these authors via shared topics and papers."}
              </p>
            </Card>
          )}
        </section>
      )}

      {/* SQL vs Cypher Note */}
      <Card className="p-6 bg-slate-50 dark:bg-slate-950 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-purple-500" /> Relational SQL vs openCypher Analysis
        </h4>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          In a traditional relational schema, an author-to-author concept traversal requires multi-hop recursive self-joins across separate tables.
          Because the shortest bridging path depth is unknown ahead of time, SQL queries require complex recursive CTEs that suffer from join explosions and cannot easily prune bidirectional cycles.
          In CognoDB, the graph engine uses index-free adjacency to evaluate <code className="font-mono text-xs text-purple-600 dark:text-purple-400 font-semibold">shortestPath((a)-[:AUTHORED|ABOUT*..8]-(b))</code> in milliseconds.
        </p>
      </Card>
    </div>
  );
}

export default function PathTracerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      }
    >
      <PathTracerContent />
    </Suspense>
  );
}
