import { NextRequest, NextResponse } from "next/server";
import { withSession, toNative } from "@/lib/db";
import { SEARCH_PAPERS_AND_AUTHORS } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "15", 10);

  if (!query.trim()) {
    return NextResponse.json({ query: "", results: [] });
  }

  try {
    const results = await withSession(async (session) => {
      const cypherRes = await session.run(SEARCH_PAPERS_AND_AUTHORS, {
        query: query.trim(),
        limit,
      });

      return cypherRes.records.map((r) =>
        toNative({
          id: r.get("id"),
          title: r.get("title"),
          year: r.get("year"),
          type: r.get("type"),
          count: r.get("count"),
        }),
      );
    }, "READ");

    return NextResponse.json({
      query,
      results,
    });
  } catch (error: unknown) {
    console.error(`[API /apis/researchpapers/search] Error:`, error);
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json(
      {
        error: "Failed to search CognoDB.",
        details: message,
      },
      { status: 503 },
    );
  }
}
