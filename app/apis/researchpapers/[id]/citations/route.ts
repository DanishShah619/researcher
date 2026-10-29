import { NextRequest, NextResponse } from "next/server";
import { withSession, toNative } from "@/lib/db";
import { publicDbErrorMessage } from "@/lib/errors";
import { parseBoundedInt, MAX_LIMIT } from "@/lib/params";
import { buildCitationChainQuery } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: paperId } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const hops = parseBoundedInt(searchParams.get("hops"), 2, 1, 6);
  const conceptFilter = searchParams.get("concept") || null;
  const limit = parseBoundedInt(searchParams.get("limit"), 25, 1, MAX_LIMIT);

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
    }, "READ", "api:paper-citations");

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
    return NextResponse.json(
      {
        error: "Failed to query citation chain traversal from CognoDB.",
        details: publicDbErrorMessage(error),
      },
      { status: 503 },
    );
  }
}
