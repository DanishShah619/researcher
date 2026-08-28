import { NextRequest, NextResponse } from "next/server";
import { withSession, toNative } from "@/lib/db";
import { GET_AUTHOR_PROFILE, AuthorProfile } from "@/lib/queries";

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
    const data = await withSession(async (session) => {
      const result = await session.run(GET_AUTHOR_PROFILE, {
        authorId,
      });

      if (result.records.length === 0 || !result.records[0].get("author")) {
        return null;
      }

      const record = result.records[0];
      return toNative<AuthorProfile>({
        author: record.get("author"),
        papers: record.get("papers") || [],
        concepts: record.get("concepts") || [],
        coAuthors: (record.get("coAuthors") || []).filter(Boolean),
      });
    }, "READ");

    if (!data) {
      return NextResponse.json(
        { error: `Author with ID '${authorId}' was not found.` },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error(`[API /apis/researchauthors/${authorId}] Error:`, error);
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json(
      {
        error: "Failed to query author profile from CognoDB.",
        details: message,
      },
      { status: 503 },
    );
  }
}
