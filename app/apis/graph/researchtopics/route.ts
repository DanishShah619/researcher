import { NextRequest, NextResponse } from "next/server";
import { withSession, toNative } from "@/lib/db";
import { GET_RESEARCH_TOPICS, GET_PAPERS_BY_TOPIC } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const topic = searchParams.get("topic");
  const limit = parseInt(searchParams.get("limit") || "30", 10);

  try {
    const data = await withSession(async (session) => {
      if (topic) {
        const result = await session.run(GET_PAPERS_BY_TOPIC, {
          topicName: topic,
          limit,
        });

        const papers = result.records.map((rec) =>
          toNative({
            ...rec.get("paper"),
            authors: rec.get("authors") || [],
          }),
        );

        return { topic, count: papers.length, papers };
      } else {
        const result = await session.run(GET_RESEARCH_TOPICS, {
          limit,
        });

        const topics = result.records.map((rec) =>
          toNative({
            name: rec.get("name"),
            paperCount: rec.get("paperCount"),
          }),
        );

        return { topics };
      }
    }, "READ");

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("[API /apis/graph/researchtopics] Error:", error);
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json(
      {
        error: "Failed to retrieve topics from CognoDB.",
        details: message,
      },
      { status: 503 },
    );
  }
}
