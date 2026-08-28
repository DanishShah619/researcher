import Link from "next/link";
import {
  Lightbulb,
  FileText,
  Users,
  ArrowRight,
  Sparkles,
  GitFork,
  Network,
} from "lucide-react";
import { withSession, toNative } from "@/lib/db";
import {
  GET_RESEARCH_TOPICS,
  GET_PAPERS_BY_TOPIC,
  PaperData,
  AuthorData,
  GraphNode,
  GraphEdge,
} from "@/lib/queries";
import GraphView from "@/components/GraphView";
import Badge from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import ErrorState from "@/components/ui/ErrorState";

interface PageProps {
  searchParams: Promise<{ topic?: string }>;
}

async function getTopicsData(selectedTopic?: string) {
  try {
    return await withSession(async (session) => {
      const topicsRes = await session.run(GET_RESEARCH_TOPICS, { limit: 50 });
      const topics = topicsRes.records.map((r) =>
        toNative<{ name: string; paperCount: number }>({
          name: r.get("name"),
          paperCount: r.get("paperCount"),
        })
      );

      let topicPapers: Array<PaperData & { authors: AuthorData[]; venue?: string | null }> = [];
      if (selectedTopic) {
        const papersRes = await session.run(GET_PAPERS_BY_TOPIC, {
          topicName: selectedTopic,
          limit: 25,
        });
        topicPapers = papersRes.records.map((rec) =>
          toNative({
            ...rec.get("paper"),
            authors: rec.get("authors") || [],
          })
        );
      }

      return {
        topics,
        topicPapers,
      };
    }, "READ");
  } catch (err) {
    console.error("Failed to load topics:", err);
    throw err;
  }
}

export default async function ResearchTopicsPage({ searchParams }: PageProps) {
  const { topic: selectedTopic } = await searchParams;

  let data: {
    topics: Array<{ name: string; paperCount: number }>;
    topicPapers: Array<PaperData & { authors: AuthorData[]; venue?: string | null }>;
  } | null = null;
  let errorMsg: string | null = null;

  try {
    data = await getTopicsData(selectedTopic);
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Database connection failed";
  }

  if (errorMsg) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <ErrorState
          title="Unable to Load Topics"
          message={errorMsg}
          retryHref="/researchtopics"
        />
      </div>
    );
  }

  const topics = data?.topics || [];
  const topicPapers = data?.topicPapers || [];

  // Build Graph Nodes for Selected Topic
  const graphNodes: GraphNode[] = [];
  const graphEdges: GraphEdge[] = [];

  if (selectedTopic) {
    graphNodes.push({
      id: `concept_${selectedTopic}`,
      label: "Concept",
      name: selectedTopic,
      color: "#10b981",
    });

    topicPapers.slice(0, 10).forEach((p) => {
      graphNodes.push({
        id: p.id,
        label: "Paper",
        title: p.title,
        year: p.year,
        color: "#0ea5e9",
      });
      graphEdges.push({
        id: `e_about_${p.id}_${selectedTopic}`,
        source: p.id,
        target: `concept_${selectedTopic}`,
        type: "ABOUT",
        label: "about",
      });

      if (p.authors && p.authors.length > 0) {
        const topAuthor = p.authors[0];
        if (!graphNodes.some((n) => n.id === topAuthor.id)) {
          graphNodes.push({
            id: topAuthor.id,
            label: "Author",
            name: topAuthor.name,
            color: "#8b5cf6",
          });
        }
        graphEdges.push({
          id: `e_auth_${topAuthor.id}_${p.id}`,
          source: topAuthor.id,
          target: p.id,
          type: "AUTHORED",
          label: "authored",
        });
      }
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 sm:p-8 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/40 shadow-sm space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/60 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <Lightbulb className="h-3.5 w-3.5" />
          <span>Knowledge Graph Clustering</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Research Fields & Topic Explorer
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl">
          Discover research literature clustered by conceptual domains. Select a topic below to inspect connected papers, authors, and citation webs.
        </p>
      </div>

      {/* Topics Cloud */}
      <Card className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Available Conceptual Domains ({topics.length})
        </h3>

        <div className="flex flex-wrap gap-2.5">
          {topics.map((t) => {
            const isSelected = selectedTopic === t.name;
            return (
              <Link
                key={t.name}
                href={`/researchtopics?topic=${encodeURIComponent(t.name)}`}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-105"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-emerald-950/50"
                }`}
              >
                <span>{t.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isSelected
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t.paperCount}
                </span>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Selected Topic Content */}
      {selectedTopic && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          {/* Topic Detail Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Active Topic
              </span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {selectedTopic}
              </h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {topicPapers.length} Papers in Database
            </span>
          </div>

          {/* Graph View for Topic */}
          {topicPapers.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Topic Concept Graph
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  {graphNodes.length} nodes • {graphEdges.length} connections
                </span>
              </div>
              <GraphView nodes={graphNodes} edges={graphEdges} height={420} />
            </section>
          )}

          {/* Papers Grid */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-500" /> Papers Tagged with &quot;{selectedTopic}&quot;
            </h3>

            {topicPapers.length === 0 ? (
              <Card className="p-8 text-center text-xs text-slate-400">
                No papers found for this topic.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topicPapers.map((paper) => (
                  <Card
                    key={paper.id}
                    className="p-5 hover:border-sky-300 dark:hover:border-sky-800 transition-colors space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {paper.year && (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {paper.year}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <GitFork className="h-3 w-3 text-sky-500" /> {paper.citationCount || 0} citations
                        </span>
                      </div>

                      <Link
                        href={`/papers/${paper.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-sky-600 dark:text-slate-100 dark:hover:text-sky-400 block line-clamp-2 leading-snug"
                      >
                        {paper.title}
                      </Link>

                      {paper.abstract && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {paper.abstract}
                        </p>
                      )}
                    </div>

                    {paper.authors && paper.authors.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 truncate max-w-[70%]">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{paper.authors.map((a) => a.name).join(", ")}</span>
                        </div>
                        <Link
                          href={`/papers/${paper.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400 shrink-0"
                        >
                          View Paper <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
