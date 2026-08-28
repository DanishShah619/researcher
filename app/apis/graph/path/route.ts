import { NextRequest, NextResponse } from "next/server";
import { withSession, toNative } from "@/lib/db";
import {
  BRIDGE_PATH_BETWEEN_AUTHORS,
  GET_SAMPLE_AUTHORS_FOR_PATH,
  GraphNode,
  GraphEdge,
} from "@/lib/queries";

interface RawNodeData {
  id: string;
  label: "Paper" | "Author" | "Concept" | "Venue";
  title?: string;
  name?: string;
  year?: number | null;
}

interface RawRelData {
  type: "AUTHORED" | "CITES" | "ABOUT" | "PUBLISHED_IN";
  source: string;
  target: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const authorA = searchParams.get("authorA");
  const authorB = searchParams.get("authorB");
  const getSample = searchParams.get("sample") === "true";

  try {
    // If requested sample pairs
    if (getSample || (!authorA && !authorB)) {
      const samples = await withSession(async (session) => {
        const result = await session.run(GET_SAMPLE_AUTHORS_FOR_PATH);
        return result.records.map((r) =>
          toNative({
            authorAId: r.get("authorAId"),
            authorAName: r.get("authorAName"),
            authorBId: r.get("authorBId"),
            authorBName: r.get("authorBName"),
          }),
        );
      }, "READ");

      return NextResponse.json({ samples });
    }

    if (!authorA || !authorB) {
      return NextResponse.json(
        {
          error: "Both 'authorA' and 'authorB' query parameters are required.",
        },
        { status: 400 },
      );
    }

    if (authorA === authorB) {
      return NextResponse.json(
        { error: "Please select two distinct authors to find a bridge path." },
        { status: 400 },
      );
    }

    const pathData = await withSession(async (session) => {
      const result = await session.run(BRIDGE_PATH_BETWEEN_AUTHORS, {
        authorA,
        authorB,
      });

      if (result.records.length === 0) {
        return null;
      }

      const rec = result.records[0];
      const nodesData = toNative<RawNodeData[]>(rec.get("nodesData"));
      const relsData = toNative<RawRelData[]>(rec.get("relsData"));
      const pathLength = toNative<number>(rec.get("pathLength"));

      // Format for visualizer
      const nodes: GraphNode[] = nodesData.map((node) => {
        let color = "#3b82f6"; 
        if (node.label === "Author") color = "#8b5cf6"; 
        if (node.label === "Paper") color = "#0ea5e9"; 
        if (node.label === "Concept") color = "#10b981"; 
        if (node.label === "Venue") color = "#f59e0b"; 

        return {
          id: node.id,
          label: node.label,
          title: node.title,
          name: node.name,
          year: node.year,
          color,
        };
      });

      const edges: GraphEdge[] = relsData.map((rel, idx) => ({
        id: `e_${idx}_${rel.source}_${rel.target}`,
        source: rel.source,
        target: rel.target,
        type: rel.type,
        label: rel.type.toLowerCase().replace("_", " "),
      }));

      
        const explanation: string[] = [];
        for (let i = 0; i < nodesData.length - 1; i++) {
          const current = nodesData[i];
          const next = nodesData[i + 1];
          const rel = relsData[i];

          const currentName = current.name || current.title || current.id;
          const nextName = next.name || next.title || next.id;

          if (current.label === "Author" && next.label === "Paper") {
            explanation.push(`${currentName} authored "${nextName}"`);
          } else if (current.label === "Paper" && next.label === "Concept") {
            explanation.push(`"${currentName}" is tagged with concept "${nextName}"`);
          } else if (current.label === "Concept" && next.label === "Paper") {
            explanation.push(`Concept "${currentName}" also appears in "${nextName}"`);
          } else if (current.label === "Paper" && next.label === "Author") {
            explanation.push(`"${currentName}" was co-authored by ${nextName}`);
          } else {
            explanation.push(`${currentName} — [${rel?.type || "CONNECTED"}] → ${nextName}`);
          }
        }

      return {
        pathLength,
        nodes,
        edges,
        explanation,
      };
    }, "READ");

    if (!pathData) {
      return NextResponse.json(
        {
          found: false,
          message:
            "No concept-bridging path within 8 hops found between these authors (or they may already be direct co-authors).",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      found: true,
      ...pathData,
    });
  } catch (error: unknown) {
    console.error("[API /apis/graph/path] Error:", error);
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json(
      {
        error: "Failed to calculate author bridge path in CognoDB.",
        details: message,
      },
      { status: 503 },
    );
  }
}
