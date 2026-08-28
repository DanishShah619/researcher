import { NextRequest, NextResponse } from "next/server";
import { withSession, toNative } from "@/lib/db";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: authorId } = await context.params;

  if (!authorId) {
    return NextResponse.json(
      { error: "Author ID parameter is required" },
      { status: 400 },
    );
  }

  try {
    const network = await withSession(async (session) => {
      const result = await session.run(
        `
        MATCH (a:Author {id: $authorId})-[:AUTHORED]->(p1:Paper)<-[:AUTHORED]-(co1:Author)
        WHERE co1 <> a
        OPTIONAL MATCH (co1)-[:AUTHORED]->(p2:Paper)<-[:AUTHORED]-(co2:Author)
        WHERE co2 <> a AND co2 <> co1
        RETURN a.id AS rootId,
               a.name AS rootName,
               collect(DISTINCT co1 {.id, .name}) AS firstDegreeCoAuthors,
               collect(DISTINCT co2 {.id, .name}) AS secondDegreeCoAuthors
        `,
        { authorId },
      );

      if (result.records.length === 0) return null;

      const rec = result.records[0];
      return toNative({
        rootAuthor: { id: rec.get("rootId"), name: rec.get("rootName") },
        firstDegreeCoAuthors: rec.get("firstDegreeCoAuthors"),
        secondDegreeCoAuthors: rec.get("secondDegreeCoAuthors"),
      });
    }, "READ");

    if (!network) {
      return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }

    return NextResponse.json(network);
  } catch (error: unknown) {
    console.error(
      `[API /apis/researchauthors/${authorId}/second_degree] Error:`,
      error,
    );
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json(
      { error: "Failed to retrieve second-degree network.", details: message },
      { status: 503 },
    );
  }
}
