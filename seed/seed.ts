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
  
  console.log("  Research Companion — CognoDB Seed Pipeline");
 

  // 1. Verify Connectivity
  console.log("\n[Step 1/4] Verifying CognoDB connectivity...");
  const conn = await verifyConnectivity();
  if (!conn.ok) {
    console.error(`\n Failed to connect to CognoDB: ${conn.message}`);
    console.error("\nPlease check your .env.local file or environment variables:");
    console.error("  - COGNODB_URI (e.g. bolt+s://<instance>.databases.cognodb.cloud)");
    console.error("  - COGNODB_USER (e.g. cognodb)");
    console.error("  - COGNODB_PASSWORD");
    process.exit(1);
  }
  console.log(`Connected successfully to CognoDB (${conn.address || "remote"}).`);

  // 2. Ensure Constraints & Indexes
  console.log("\n[Step 2/4] Ensuring schema uniqueness constraints...");
  await withSession(async (session) => {
    for (const query of CONSTRAINT_QUERIES) {
      try {
        await session.run(query);
      } catch (err: unknown) {
       
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("already exists") && !msg.includes("An equivalent constraint already exists")) {
          console.warn(`  Notice during constraint creation: ${msg}`);
        }
      }
    }
  }, "WRITE");
  console.log("Schema constraints verified.");

  // 3. Fetch And Ingest Live Papers from Semantic Scholar API
  console.log("\n[Step 3/4] Ingesting papers & building citation graph...");
  let totalPapersSeeded = 0;
  let totalCitationsSeeded = 0;

  for (const topic of SEED_TOPICS) {
    console.log(`\n Fetching topic: "${topic.query}" (target: ${topic.limit} papers)`);
    let papers: S2Paper[] = [];
    try {
      papers = await searchPapers(topic.query, topic.limit);
    } catch (err) {
      console.error(` Could not fetch topic "${topic.query}":`, err);
      continue;
    }

    console.log(`  Received ${papers.length} papers. Writing to CognoDB...`);

    for (const paper of papers) {
      if (!paper.paperId || !paper.title) continue;

      await withSession(async (session) => {
        // 3.1 Upsert Paper
        await session.run(UPSERT_PAPER, {
          id: paper.paperId,
          title: paper.title,
          year: paper.year || null,
          abstract: paper.abstract || null,
          url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
          citationCount: paper.citationCount || 0,
        });
        totalPapersSeeded++;

        // 3.2 Upsert Authors & AUTHORED edges
        if (paper.authors && paper.authors.length > 0) {
          for (const author of paper.authors) {
            if (author.authorId && author.name) {
              await session.run(UPSERT_AUTHOR_AND_AUTHORED, {
                paperId: paper.paperId,
                authorId: author.authorId,
                name: author.name,
              });
            }
          }
        }

        // 3.3 Upsert Concepts & ABOUT edges
        const concepts = new Set<string>();
        if (paper.fieldsOfStudy) {
          paper.fieldsOfStudy.forEach((f) => f && concepts.add(f.trim()));
        }
        if (paper.s2FieldsOfStudy) {
          paper.s2FieldsOfStudy.forEach((s) => s.category && concepts.add(s.category.trim()));
        }
        // Add current search query as an extra concept tag
        concepts.add(topic.query);

        for (const conceptName of concepts) {
          await session.run(UPSERT_CONCEPT_AND_ABOUT, {
            paperId: paper.paperId,
            name: conceptName,
          });
        }

        // 3.4 Upsert Venue & PUBLISHED_IN edge
        if (paper.venue && typeof paper.venue === "string" && paper.venue.trim().length > 0) {
          await session.run(UPSERT_VENUE_AND_PUBLISHED_IN, {
            paperId: paper.paperId,
            name: paper.venue.trim(),
          });
        }

        // 3.5 Expand citation references (1-hop expansion)
        if (paper.references && paper.references.length > 0) {
          const refsToExpand = paper.references
            .filter((r) => r.paperId && r.title)
            .slice(0, CITATION_HOP_LIMIT_PER_PAPER);

          for (const ref of refsToExpand) {
            if (!ref.paperId || !ref.title) continue;
            await session.run(UPSERT_CITATION, {
              sourcePaperId: paper.paperId,
              targetPaperId: ref.paperId,
              targetTitle: ref.title,
              targetYear: ref.year || null,
            });
            totalCitationsSeeded++;
          }
        }
      }, "WRITE");
    }
  }

  // Summary of ingestion
  console.log("\n[Step 4/4] Verifying graph database counts...");
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


  console.log("  🎉 Ingestion Complete!");
 
  if (stats) {
    console.log(`  Papers in DB:     ${stats.paperCount}`);
    console.log(`  Authors in DB:    ${stats.authorCount}`);
    console.log(`  Concepts in DB:   ${stats.conceptCount}`);
    console.log(`  Venues in DB:     ${stats.venueCount}`);
    console.log(`  Citations in DB:  ${stats.citationCount}`);
  }
}


runSeed()
  .catch((err) => {
    console.error("\n❌ Fatal error during seed execution:", err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDriver();
  });
