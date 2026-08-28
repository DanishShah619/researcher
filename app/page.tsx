import Link from "next/link";
import {
  FileText,
  Users,
  Lightbulb,
  Building2,
  GitFork,
  ArrowRight,
  GitMerge,
  Sparkles,
  Database,
  CheckCircle2,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { withSession, toNative } from "@/lib/db";
import { GET_GRAPH_STATS, GET_RESEARCH_TOPICS, GET_SAMPLE_AUTHORS_FOR_PATH } from "@/lib/queries";

async function getDashboardData() {
  try {
    return await withSession(async (session) => {
      const statsRes = await session.run(GET_GRAPH_STATS);
      const stats = statsRes.records.length > 0 ? toNative(statsRes.records[0].toObject()) : null;

      const topicsRes = await session.run(GET_RESEARCH_TOPICS, { limit: 8 });
      const topics = topicsRes.records.map((r) =>
        toNative<{ name: string; paperCount: number }>({
          name: r.get("name"),
          paperCount: r.get("paperCount"),
        })
      );

      const samplePairsRes = await session.run(GET_SAMPLE_AUTHORS_FOR_PATH);
      const samplePairs = samplePairsRes.records.map((r) =>
        toNative<{ authorAId: string; authorAName: string; authorBId: string; authorBName: string }>({
          authorAId: r.get("authorAId"),
          authorAName: r.get("authorAName"),
          authorBId: r.get("authorBId"),
          authorBName: r.get("authorBName"),
        })
      );

      return {
        isDbConnected: true,
        stats: stats as {
          paperCount: number;
          authorCount: number;
          conceptCount: number;
          venueCount: number;
          citationCount: number;
        } | null,
        topics,
        samplePairs,
      };
    }, "READ");
  } catch (err: unknown) {
    return {
      isDbConnected: false,
      stats: null,
      topics: [],
      samplePairs: [],
      error: err instanceof Error ? err.message : "Database connection failed",
    };
  }
}

export default async function HomePage() {
  const data = await getDashboardData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-12">
      {/* Offline Alert */}
      {!data.isDbConnected && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-900/50 dark:bg-amber-950/40 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                CognoDB Instance Unreachable
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Configure your database credentials in <code className="rounded bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 font-mono text-[11px]">.env.local</code> and run <code className="rounded bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 font-mono text-[11px]">npx tsx seed/seed.ts</code> to seed the graph.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="text-center space-y-5 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-semibold text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Graph-Native Literature Explorer</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Explore Research as an <br />
          <span className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Interconnected Knowledge Graph
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
          Trace multi-hop citation lineages, discover hidden concept bridges between researchers, and explore citation neighborhoods powered by CognoDB openCypher.
        </p>

        <div className="pt-2 max-w-2xl mx-auto">
          <SearchBar placeholder="Search papers by title or researchers by name..." />
        </div>
      </section>

      {/* Live Graph Metrics */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Papers"
          value={data.stats ? data.stats.paperCount : "—"}
          icon={FileText}
          colorVariant="sky"
        />
        <StatCard
          label="Authors"
          value={data.stats ? data.stats.authorCount : "—"}
          icon={Users}
          colorVariant="purple"
        />
        <StatCard
          label="Concepts"
          value={data.stats ? data.stats.conceptCount : "—"}
          icon={Lightbulb}
          colorVariant="emerald"
        />
        <StatCard
          label="Venues"
          value={data.stats ? data.stats.venueCount : "—"}
          icon={Building2}
          colorVariant="amber"
        />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            label="Citations"
            value={data.stats ? data.stats.citationCount : "—"}
            icon={GitFork}
            colorVariant="indigo"
          />
        </div>
      </section>

      {/* Feature Exploration Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Author Bridge Pathfinder */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:border-purple-900/50 dark:from-purple-950/30 dark:via-slate-900 dark:to-indigo-950/30">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white shadow-sm">
                <GitMerge className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Relational-Awkward Query
              </span>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              Author Concept Bridge Pathfinder
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Discover how two researchers who have never co-authored are connected through shared ideas using Cypher <code className="font-mono text-xs text-purple-600 dark:text-purple-400 font-semibold">shortestPath()</code>.
            </p>

            {data.samplePairs.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Sample Pair:
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.samplePairs.slice(0, 2).map((pair, idx) => (
                    <Link
                      key={idx}
                      href={`/path_tracer?authorA=${pair.authorAId}&authorB=${pair.authorBId}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300 transition-colors"
                    >
                      <span>{pair.authorAName}</span>
                      <ArrowRight className="h-3 w-3 text-purple-400" />
                      <span>{pair.authorBName}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Link
                href="/path_tracer"
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-purple-500 shadow-md shadow-purple-500/20 transition-all"
              >
                Open Path Tracer <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Card>

        {/* Topics Exploration */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/30">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                <Lightbulb className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Concept Clustering
              </span>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              Explore Research Fields & Topics
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Browse papers grouped by conceptual domains like Retrieval Augmented Generation, Graph Neural Networks, and Knowledge Graphs.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {data.topics.slice(0, 6).map((topic) => (
                <Link
                  key={topic.name}
                  href={`/researchtopics?topic=${encodeURIComponent(topic.name)}`}
                >
                  <Badge variant="concept" label={topic.name} count={topic.paperCount} />
                </Link>
              ))}
            </div>

            <div className="pt-2">
              <Link
                href="/researchtopics"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20 transition-all"
              >
                Browse All Topics <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* Technical Rationale Section */}
      <Card className="p-8">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            <Sparkles className="h-4 w-4" /> Why a Graph Database?
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Relationships are First-Class Citizens
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            In relational SQL databases, answering questions of unknown traversal depth (such as multi-hop citation chains or finding author paths through shared concepts) requires recursive common table expressions (CTEs) or expensive multi-table self-joins that blow up exponentially.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="font-semibold text-xs text-rose-600 dark:text-rose-400 mb-1">
                Relational (SQL)
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Recursive CTEs per hop, fixed depth ceilings, and self-join explosions over thousands of rows.
              </p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900/30 dark:bg-sky-950/30">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> CognoDB (openCypher)
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Index-free adjacency, native variable-length paths (<code className="font-mono text-[11px]">:CITES*1..3</code>), and sub-millisecond pattern matching.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
