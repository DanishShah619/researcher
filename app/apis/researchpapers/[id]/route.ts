import { NextRequest, NextResponse } from "next/server";
import { withSession, toNative } from "@/lib/db";
import { GET_PAPER_WITH_NEIGHBORHOOD, PaperNeighborhood } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: paperId } = await context.params;

  if (!paperId) {
    return NextResponse.json(
      { error: "Paper ID parameter is required" },
      { status: 400 },
    );
  }

  try {
    const data = await withSession(async (session) => {
      const result = await session.run(GET_PAPER_WITH_NEIGHBORHOOD, {
        paperId,
      });

      if (result.records.length === 0 || !result.records[0].get("paper")) {
        return null;
      }

      const record = result.records[0];
      return toNative<PaperNeighborhood>({
        paper: record.get("paper"),
        authors: record.get("authors") || [],
        concepts: record.get("concepts") || [],
        venue: record.get("venue") || null,
        references: record.get("references") || [],
        citedBy: record.get("citedBy") || [],
      });
    }, "READ");

    if (!data) {
      return NextResponse.json(
        {
          error: `Paper with ID '${paperId}' was not found in the graph database.`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error(`[API /apis/researchpapers/${paperId}] Error:`, error);
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json(
      {
        error: "Failed to query paper neighborhood from CognoDB.",
        details: message,
      },
      { status: 503 },
    );
  }
}
