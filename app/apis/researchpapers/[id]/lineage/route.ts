import { NextRequest, NextResponse } from "next/server";
import { withSession, toNative } from "@/lib/db";
import { buildCitationChainQuery } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: paperId } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const hops = Math.min(
    Math.max(parseInt(searchParams.get("hops") || "3", 10), 1),
    5,
  );
  const concept = searchParams.get("concept") || null;
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (!paperId) {
    return NextResponse.json(
      { error: "Paper ID parameter is required" },
      { status: 400 },
    );
  }

  try {
    const data = await withSession(async (session) => {
      const query = buildCitationChainQuery(hops);
      const result = await session.run(query, {
        startPaperId: paperId,
        conceptFilter: concept,
        limit,
      });

      return result.records.map((r) =>
        toNative({
          id: r.get("id"),
          title: r.get("title"),
          year: r.get("year"),
          depth: r.get("depth"),
          pathPaperIds: r.get("pathPaperIds"),
        }),
      );
    }, "READ");

    return NextResponse.json({
      startPaperId: paperId,
      hops,
      concept,
      totalReached: data.length,
      lineage: data,
    });
  } catch (error: unknown) {
    console.error(
      `[API /apis/researchpapers/${paperId}/lineage] Error:`,
      error,
    );
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json(
      {
        error: "Failed to trace citation lineage in CognoDB.",
        details: message,
      },
      { status: 503 },
    );
  }
}
