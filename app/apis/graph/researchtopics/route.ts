import { NextRequest, NextResponse } from "next/server";
import { withSession, toNative } from "@/lib/db";
import { publicDbErrorMessage } from "@/lib/errors";
import { parseBoundedInt, MAX_LIMIT } from "@/lib/params";
import { GET_RESEARCH_TOPICS, GET_PAPERS_BY_TOPIC } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const topic = searchParams.get("topic");
  const limit = parseBoundedInt(searchParams.get("limit"), 30, 1, MAX_LIMIT);

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
    }, "READ", "api:research-topics");

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("[API /apis/graph/researchtopics] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve topics from CognoDB.",
        details: publicDbErrorMessage(error),
      },
      { status: 503 },
    );
  }
}
