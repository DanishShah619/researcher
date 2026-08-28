import Link from "next/link";
import {
  Users,
  Lightbulb,
  ExternalLink,
  ArrowLeft,
  GitFork,
  BookOpen,
  Network,
} from "lucide-react";
import { withSession, toNative } from "@/lib/db";
import { GET_PAPER_WITH_NEIGHBORHOOD, PaperNeighborhood, GraphNode, GraphEdge } from "@/lib/queries";
import GraphView from "@/components/GraphView";
import Badge from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getPaperData(paperId: string) {
  try {
    return await withSession(async (session) => {
      const result = await session.run(GET_PAPER_WITH_NEIGHBORHOOD, {
        paperId,
      });

      if (result.records.length === 0 || !result.records[0].get("paper")) {
        return null;
      }

      const rec = result.records[0];
      return toNative<PaperNeighborhood>({
        paper: rec.get("paper"),
        authors: rec.get("authors") || [],
        concepts: rec.get("concepts") || [],
        venue: rec.get("venue") || null,
        references: rec.get("references") || [],
        citedBy: rec.get("citedBy") || [],
      });
    }, "READ");
  } catch (err) {
    console.error(`Failed to load paper ${paperId}:`, err);
    throw err;
  }
}

export default async function PaperDetailPage({ params }: PageProps) {
  const { id: paperId } = await params;

  let data: PaperNeighborhood | null = null;
  let errorMsg: string | null = null;

  try {
    data = await getPaperData(paperId);
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Database connection failed";
  }

  if (errorMsg) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <ErrorState
          title="Unable to Load Paper"
          message={errorMsg}
          retryHref={`/papers/${paperId}`}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <EmptyState
          title="Paper Not Found"
          description={`No paper matching ID "${paperId}" was found in the graph database.`}
          actionText="Back to Search"
          actionHref="/"
        />
      </div>
    );
  }

  const { paper, authors, concepts, venue, references, citedBy } = data;

  // Build 1-hop graph data
  const graphNodes: GraphNode[] = [
    {
      id: paper.id,
      label: "Paper",
      title: paper.title,
      year: paper.year,
      color: "#0284c7",
    },
  ];

  const graphEdges: GraphEdge[] = [];

  authors.forEach((a) => {
    graphNodes.push({
      id: a.id,
      label: "Author",
      name: a.name,
      color: "#8b5cf6",
    });
    graphEdges.push({
      id: `e_auth_${a.id}_${paper.id}`,
      source: a.id,
      target: paper.id,
      type: "AUTHORED",
      label: "authored",
    });
  });

  concepts.forEach((c) => {
    graphNodes.push({
      id: `concept_${c}`,
      label: "Concept",
      name: c,
      color: "#10b981",
    });
    graphEdges.push({
      id: `e_about_${paper.id}_${c}`,
      source: paper.id,
      target: `concept_${c}`,
      type: "ABOUT",
      label: "about",
    });
  });

  if (venue) {
    graphNodes.push({
      id: `venue_${venue}`,
      label: "Venue",
      name: venue,
      color: "#f59e0b",
    });
    graphEdges.push({
      id: `e_venue_${paper.id}`,
      source: paper.id,
      target: `venue_${venue}`,
      type: "PUBLISHED_IN",
      label: "published in",
    });
  }

  references.slice(0, 6).forEach((ref) => {
    graphNodes.push({
      id: ref.id,
      label: "Paper",
      title: ref.title,
      year: ref.year,
      color: "#38bdf8",
    });
    graphEdges.push({
      id: `e_cites_${paper.id}_${ref.id}`,
      source: paper.id,
      target: ref.id,
      type: "CITES",
      label: "cites",
    });
  });

  citedBy.slice(0, 6).forEach((cBy) => {
    graphNodes.push({
      id: cBy.id,
      label: "Paper",
      title: cBy.title,
      year: cBy.year,
      color: "#60a5fa",
    });
    graphEdges.push({
      id: `e_cites_${cBy.id}_${paper.id}`,
      source: cBy.id,
      target: paper.id,
      type: "CITES",
      label: "cites",
    });
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Search & Explore
      </Link>

      {/* Paper Header Card */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {paper.year && (
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {paper.year}
            </span>
          )}
          {venue && <Badge variant="venue" label={venue} />}
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-900/40">
            <GitFork className="h-3 w-3" /> {paper.citationCount || 0} citations
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          {paper.title}
        </h1>

        {/* Authors */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Users className="h-4 w-4 text-purple-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-400">Authors:</span>
          {authors.length > 0 ? (
            authors.map((a, idx) => (
              <Link
                key={a.id}
                href={`/authors/${a.id}`}
                className="text-xs font-semibold text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 hover:underline"
              >
                {a.name}
                {idx < authors.length - 1 ? "," : ""}
              </Link>
            ))
          ) : (
            <span className="text-xs text-slate-400">Not listed</span>
          )}
        </div>

        {/* Concepts */}
        {concepts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Lightbulb className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-400">Concepts:</span>
            {concepts.map((c) => (
              <Link key={c} href={`/researchtopics?topic=${encodeURIComponent(c)}`}>
                <Badge variant="concept" label={c} />
              </Link>
            ))}
          </div>
        )}

        {/* Abstract */}
        {paper.abstract && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Abstract</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{paper.abstract}</p>
          </div>
        )}

        {/* External Link */}
        {paper.url && (
          <div className="pt-2">
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400"
            >
              View on Semantic Scholar <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </Card>

      {/* Neighborhood Graph */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Citation & Concept Neighborhood</h2>
          </div>
          <span className="text-xs text-slate-400">
            {graphNodes.length} nodes • {graphEdges.length} connections
          </span>
        </div>

        <GraphView nodes={graphNodes} edges={graphEdges} height={500} />
      </section>

      {/* References & Inbound Citations */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <CardHeader
            title={`References (${references.length})`}
            icon={BookOpen}
          />
          {references.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No references recorded in graph.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {references.map((ref) => (
                <div key={ref.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/papers/${ref.id}`}
                    className="text-xs font-semibold text-slate-800 hover:text-sky-600 dark:text-slate-200 dark:hover:text-sky-400 block line-clamp-2"
                  >
                    {ref.title}
                  </Link>
                  {ref.year && <span className="text-[11px] text-slate-400">Year: {ref.year}</span>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <CardHeader
            title={`Cited In Database By (${citedBy.length})`}
            icon={GitFork}
          />
          {citedBy.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No inbound citations within local graph yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {citedBy.map((c) => (
                <div key={c.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/papers/${c.id}`}
                    className="text-xs font-semibold text-slate-800 hover:text-sky-600 dark:text-slate-200 dark:hover:text-sky-400 block line-clamp-2"
                  >
                    {c.title}
                  </Link>
                  {c.year && <span className="text-[11px] text-slate-400">Year: {c.year}</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
