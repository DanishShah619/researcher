import { withSession, verifyConnectivity, closeDriver, toNative } from "../lib/db";
import {
  CONSTRAINT_QUERIES,
  UPSERT_PAPER,
  UPSERT_AUTHOR_AND_AUTHORED,
  UPSERT_CONCEPT_AND_ABOUT,
  UPSERT_VENUE_AND_PUBLISHED_IN,
  UPSERT_CITATION,
  GET_GRAPH_STATS,
} from "../lib/queries";
import { searchPapers, S2Paper } from "./semanticScholar";
import { SEED_TOPICS, CITATION_HOP_LIMIT_PER_PAPER } from "./data";

async function runSeed() {
  const startTime = Date.now();
  console.log("[seed] Starting CognoDB ingestion pipeline...");

  // 1. Connection check
  const conn = await verifyConnectivity();
  if (!conn.ok) {
    console.error(`[seed] Connection failed: ${conn.message}`);
    console.error("[seed] Ensure COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD are set in .env.local");
    process.exit(1);
  }
  console.log(`[seed] Connected to CognoDB (${conn.address || "remote"})`);

  // 2. Schema constraints
  console.log("[seed] Verifying uniqueness constraints and indexes...");
  await withSession(async (session) => {
    for (const query of CONSTRAINT_QUERIES) {
      try {
        await session.run(query);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("already exists") && !msg.includes("equivalent constraint")) {
          console.warn(`[seed] Schema notice: ${msg}`);
        }
      }
    }
  }, "WRITE");

  // 3. Ingestion loop
  let totalPapers = 0;
  let totalCitations = 0;

  for (const topic of SEED_TOPICS) {
    console.log(`[seed] Fetching topic: "${topic.query}" (limit: ${topic.limit})...`);
    let papers: S2Paper[] = [];
    try {
      papers = await searchPapers(topic.query, topic.limit);
    } catch (err) {
      console.error(`[seed] Topic fetch error for "${topic.query}":`, err);
      continue;
    }

    console.log(`[seed] Writing ${papers.length} papers for "${topic.query}"...`);

    // Open one session per paper and run all writes inside it —
    // authors, concepts, venue, and citation hops all share the same connection.
    for (const paper of papers) {
      if (!paper.paperId || !paper.title) continue;

      await withSession(async (session) => {
        await session.run(UPSERT_PAPER, {
          id: paper.paperId,
          title: paper.title,
          year: paper.year ?? null,
          abstract: paper.abstract ?? null,
          url: paper.url ?? `https://www.semanticscholar.org/paper/${paper.paperId}`,
          citationCount: paper.citationCount ?? 0,
        });
        totalPapers++;

        for (const author of paper.authors ?? []) {
          if (author.authorId && author.name) {
            await session.run(UPSERT_AUTHOR_AND_AUTHORED, {
              paperId: paper.paperId,
              authorId: author.authorId,
              name: author.name,
            });
          }
        }

        const concepts = new Set<string>();
        (paper.fieldsOfStudy ?? []).forEach((f) => f && concepts.add(f.trim()));
        (paper.s2FieldsOfStudy ?? []).forEach((s) => s.category && concepts.add(s.category.trim()));
        concepts.add(topic.query);

        for (const conceptName of concepts) {
          await session.run(UPSERT_CONCEPT_AND_ABOUT, {
            paperId: paper.paperId,
            name: conceptName,
          });
        }

        if (paper.venue && paper.venue.trim().length > 0) {
          await session.run(UPSERT_VENUE_AND_PUBLISHED_IN, {
            paperId: paper.paperId,
            name: paper.venue.trim(),
          });
        }

        const refs = (paper.references ?? [])
          .filter((r) => r.paperId && r.title)
          .slice(0, CITATION_HOP_LIMIT_PER_PAPER);

        for (const ref of refs) {
          if (!ref.paperId || !ref.title) continue;
          await session.run(UPSERT_CITATION, {
            sourcePaperId: paper.paperId,
            targetPaperId: ref.paperId,
            targetTitle: ref.title,
            targetYear: ref.year ?? null,
          });
          totalCitations++;
        }
      }, "WRITE");
    }
  }

  // 4. Summarize
  const stats = await withSession(async (session) => {
    const result = await session.run(GET_GRAPH_STATS);
    if (result.records.length > 0) {
      return toNative<{
        paperCount: number;
        authorCount: number;
        conceptCount: number;
        venueCount: number;
        citationCount: number;
      }>(result.records[0].toObject());
    }
    return null;
  }, "READ");

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[seed] Ingestion complete in ${durationSec}s.`);
  if (stats) {
    console.log(
      `[seed] Database totals: ${stats.paperCount} papers, ${stats.authorCount} authors, ${stats.conceptCount} concepts, ${stats.venueCount} venues, ${stats.citationCount} citations.`
    );
  }
}

runSeed()
  .catch((err) => {
    console.error("[seed] Unhandled error during seed execution:", err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDriver();
  });
