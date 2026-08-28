import Link from "next/link";
import {
  User,
  FileText,
  Users,
  Lightbulb,
  ArrowLeft,
  GitMerge,
  Network,
} from "lucide-react";
import { withSession, toNative } from "@/lib/db";
import { GET_AUTHOR_PROFILE, AuthorProfile, GraphNode, GraphEdge } from "@/lib/queries";
import GraphView from "@/components/GraphView";
import Badge from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getAuthorData(authorId: string) {
  try {
    return await withSession(async (session) => {
      const result = await session.run(GET_AUTHOR_PROFILE, {
        authorId,
      });

      if (result.records.length === 0 || !result.records[0].get("author")) {
        return null;
      }

      const rec = result.records[0];
      return toNative<AuthorProfile>({
        author: rec.get("author"),
        papers: rec.get("papers") || [],
        concepts: rec.get("concepts") || [],
        coAuthors: (rec.get("coAuthors") || []).filter(Boolean),
      });
    }, "READ");
  } catch (err) {
    console.error(`Failed to load author ${authorId}:`, err);
    throw err;
  }
}

export default async function AuthorDetailPage({ params }: PageProps) {
  const { id: authorId } = await params;

  let data: AuthorProfile | null = null;
  let errorMsg: string | null = null;

  try {
    data = await getAuthorData(authorId);
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Database connection failed";
  }

  if (errorMsg) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <ErrorState
          title="Unable to Load Researcher"
          message={errorMsg}
          retryHref={`/authors/${authorId}`}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <EmptyState
          title="Author Not Found"
          description={`No author with ID "${authorId}" was found in the graph database.`}
          actionText="Back to Search"
          actionHref="/"
          icon={User}
        />
      </div>
    );
  }

  const { author, papers, concepts, coAuthors } = data;

  // Build Graph Nodes for Author's network
  const graphNodes: GraphNode[] = [
    {
      id: author.id,
      label: "Author",
      name: author.name,
      color: "#7c3aed",
    },
  ];

  const graphEdges: GraphEdge[] = [];

  papers.slice(0, 10).forEach((p) => {
    graphNodes.push({
      id: p.id,
      label: "Paper",
      title: p.title,
      year: p.year,
      color: "#0ea5e9",
    });
    graphEdges.push({
      id: `e_auth_${author.id}_${p.id}`,
      source: author.id,
      target: p.id,
      type: "AUTHORED",
      label: "authored",
    });
  });

  concepts.slice(0, 5).forEach((c) => {
    graphNodes.push({
      id: `concept_${c.name}`,
      label: "Concept",
      name: c.name,
      color: "#10b981",
    });
    papers.slice(0, 6).forEach((p) => {
      graphEdges.push({
        id: `e_about_${p.id}_${c.name}`,
        source: p.id,
        target: `concept_${c.name}`,
        type: "ABOUT",
        label: "about",
      });
    });
  });

  coAuthors.slice(0, 6).forEach((co) => {
    graphNodes.push({
      id: co.id,
      label: "Author",
      name: co.name,
      color: "#c084fc",
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

      {/* Author Profile Header */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 shadow-sm">
              <User className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Researcher Profile
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {author.name}
              </h1>
            </div>
          </div>

          <Link
            href={`/path_tracer?authorA=${author.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-purple-500 shadow-md shadow-purple-500/20 transition-all self-start sm:self-auto"
          >
            <GitMerge className="h-4 w-4" /> Trace Concept Bridge
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-400 font-medium">Authored Papers</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{papers.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Direct Co-Authors</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{coAuthors.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Research Concepts</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{concepts.length}</p>
          </div>
        </div>

        {/* Research Concepts */}
        {concepts.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-emerald-500" /> Primary Research Themes
            </h3>
            <div className="flex flex-wrap gap-2">
              {concepts.map((c) => (
                <Link key={c.name} href={`/researchtopics?topic=${encodeURIComponent(c.name)}`}>
                  <Badge variant="concept" label={c.name} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Collaboration Graph View */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Knowledge & Collaboration Network</h2>
          </div>
          <span className="text-xs text-slate-400">
            {graphNodes.length} nodes • {graphEdges.length} connections
          </span>
        </div>

        <GraphView nodes={graphNodes} edges={graphEdges} height={460} />
      </section>

      {/* Publications & Co-Authors */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader
            title={`Authored Publications (${papers.length})`}
            icon={FileText}
          />

          {papers.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No publications found.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {papers.map((p) => (
                <div key={p.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/papers/${p.id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-sky-600 dark:text-slate-100 dark:hover:text-sky-400 leading-snug"
                    >
                      {p.title}
                    </Link>
                    {p.year && (
                      <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {p.year}
                      </span>
                    )}
                  </div>
                  {p.venue && (
                    <div className="pt-0.5">
                      <Badge variant="venue" label={p.venue} />
                    </div>
                  )}
                  {p.abstract && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {p.abstract}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <CardHeader
            title={`Direct Co-Authors (${coAuthors.length})`}
            icon={Users}
          />

          {coAuthors.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No co-authors recorded in database.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {coAuthors.map((co) => (
                <div key={co.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                  <Link
                    href={`/authors/${co.id}`}
                    className="text-xs font-semibold text-slate-800 hover:text-purple-600 dark:text-slate-200 dark:hover:text-purple-400"
                  >
                    {co.name}
                  </Link>
                  <Link
                    href={`/path_tracer?authorA=${author.id}&authorB=${co.id}`}
                    className="shrink-0 text-[10px] font-semibold text-purple-600 hover:underline dark:text-purple-400"
                  >
                    Check Path
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
