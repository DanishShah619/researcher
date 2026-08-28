import { NextResponse } from "next/server";
import { withSession, toNative } from "@/lib/db";
import { GET_GRAPH_STATS } from "@/lib/queries";

export async function GET() {
  try {
    const stats = await withSession(async (session) => {
      const result = await session.run(GET_GRAPH_STATS);
      if (result.records.length > 0) {
        return toNative(result.records[0].toObject());
      }
      return {
        paperCount: 0,
        authorCount: 0,
        conceptCount: 0,
        venueCount: 0,
        citationCount: 0,
      };
    }, "READ");

    return NextResponse.json({ ok: true, stats });
  } catch (error: unknown) {
    console.error("[API /apis/graph/stats] Error:", error);
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to query database statistics from CognoDB.",
        details: message,
      },
      { status: 503 },
    );
  }
}
