import { NextRequest, NextResponse } from "next/server";
import { withSession, toNative } from "@/lib/db";
import { buildCitationChainQuery } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: paperId } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const hops = parseInt(searchParams.get("hops") || "2", 10);
  const conceptFilter = searchParams.get("concept") || null;
  const limit = parseInt(searchParams.get("limit") || "25", 10);

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
        conceptFilter,
        limit,
      });

      return result.records.map((rec) =>
        toNative({
          id: rec.get("id"),
          title: rec.get("title"),
          year: rec.get("year"),
          depth: rec.get("depth"),
          pathPaperIds: rec.get("pathPaperIds"),
        }),
      );
    }, "READ");

    return NextResponse.json({
      startPaperId: paperId,
      maxHops: hops,
      conceptFilter,
      totalReached: data.length,
      results: data,
    });
  } catch (error: unknown) {
    console.error(
      `[API /apis/researchpapers/${paperId}/citations] Error:`,
      error,
    );
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json(
      {
        error: "Failed to query citation chain traversal from CognoDB.",
        details: message,
      },
      { status: 503 },
    );
  }
}
