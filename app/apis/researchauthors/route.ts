import { NextRequest, NextResponse } from "next/server";
import { withSession, toNative } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "30", 10);

  try {
    const authors = await withSession(async (session) => {
      const result = await session.run(
        `
        MATCH (a:Author)-[:AUTHORED]->(p:Paper)
        RETURN a.id AS id, a.name AS name, count(p) AS paperCount
        ORDER BY paperCount DESC
        LIMIT $limit
        `,
        { limit },
      );

      return result.records.map((r) =>
        toNative({
          id: r.get("id"),
          name: r.get("name"),
          paperCount: r.get("paperCount"),
        }),
      );
    }, "READ");

    return NextResponse.json({ authors });
  } catch (error: unknown) {
    console.error("[API /apis/researchauthors] Error:", error);
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json(
      { error: "Failed to retrieve authors list.", details: message },
      { status: 503 },
    );
  }
}
