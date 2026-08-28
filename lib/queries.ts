/**
 * Centralized Cypher query catalog and data contracts.
 *
    * This file defines the Cypher queries used to interact with the Neo4j graph database,
 */

export interface PaperData {
  id: string;
  title: string;
  year?: number | null;
  abstract?: string | null;
  url?: string | null;
  citationCount?: number | null;
}

export interface AuthorData {
  id: string;
  name: string;
}

export interface ConceptData {
  name: string;
  paperCount?: number;
}

export interface VenueData {
  name: string;
}

export interface PaperNeighborhood {
  paper: PaperData;
  authors: AuthorData[];
  concepts: string[];
  venue?: string | null;
  references: Array<{ id: string; title: string; year?: number | null }>;
  citedBy: Array<{ id: string; title: string; year?: number | null }>;
}

export interface AuthorProfile {
  author: AuthorData;
  papers: Array<PaperData & { venue?: string | null }>;
  coAuthors: Array<{ id: string; name: string; sharedPapersCount: number }>;
  concepts: Array<{ name: string; count: number }>;
}

export interface GraphNode {
  id: string;
  label: "Paper" | "Author" | "Concept" | "Venue";
  title?: string;
  name?: string;
  year?: number | null;
  color?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "AUTHORED" | "CITES" | "ABOUT" | "PUBLISHED_IN";
  label: string;
}

export interface GraphPathResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  length: number;
  explanation: string[];
}

export interface GraphStats {
  paperCount: number;
  authorCount: number;
  conceptCount: number;
  venueCount: number;
  citationCount: number;
}

// Uniqueness constraints double as fast indexes for MERGE operations
export const CONSTRAINT_QUERIES = [
  `CREATE CONSTRAINT paper_id_unique IF NOT EXISTS FOR (p:Paper) REQUIRE p.id IS UNIQUE`,
  `CREATE CONSTRAINT author_id_unique IF NOT EXISTS FOR (a:Author) REQUIRE a.id IS UNIQUE`,
  `CREATE CONSTRAINT concept_name_unique IF NOT EXISTS FOR (c:Concept) REQUIRE c.name IS UNIQUE`,
  `CREATE CONSTRAINT venue_name_unique IF NOT EXISTS FOR (v:Venue) REQUIRE v.name IS UNIQUE`,
];

export const UPSERT_PAPER = `
  MERGE (p:Paper {id: $id})
  SET p.title = $title,
      p.year = $year,
      p.abstract = $abstract,
      p.url = $url,
      p.citationCount = $citationCount
  RETURN p.id AS id
`;

export const UPSERT_AUTHOR_AND_AUTHORED = `
  MATCH (p:Paper {id: $paperId})
  MERGE (a:Author {id: $authorId})
  ON CREATE SET a.name = $name
  ON MATCH SET a.name = coalesce($name, a.name)
  MERGE (a)-[:AUTHORED]->(p)
  RETURN a.id AS authorId
`;

export const UPSERT_CONCEPT_AND_ABOUT = `
  MATCH (p:Paper {id: $paperId})
  MERGE (c:Concept {name: $name})
  MERGE (p)-[:ABOUT]->(c)
  RETURN c.name AS conceptName
`;

export const UPSERT_VENUE_AND_PUBLISHED_IN = `
  MATCH (p:Paper {id: $paperId})
  MERGE (v:Venue {name: $name})
  MERGE (p)-[:PUBLISHED_IN]->(v)
  RETURN v.name AS venueName
`;

export const UPSERT_CITATION = `
  MATCH (source:Paper {id: $sourcePaperId})
  MERGE (target:Paper {id: $targetPaperId})
  ON CREATE SET target.title = $targetTitle,
                target.year = $targetYear
  MERGE (source)-[:CITES]->(target)
  RETURN source.id AS source, target.id AS target
`;

/**
 * Variable-length traversal query builder.
 * Clamps hops between 1 and 6 to prevent runaway query execution.
 */
export function buildCitationChainQuery(maxHops: number = 3): string {
  const safeHops = Math.min(Math.max(Math.floor(maxHops), 1), 6);

  return `
    MATCH (start:Paper {id: $startPaperId})
    MATCH path = (start)-[:CITES*1..${safeHops}]->(reached:Paper)
    WHERE ($conceptFilter IS NULL OR $conceptFilter = '' OR (reached)-[:ABOUT]->(:Concept {name: $conceptFilter}))
    WITH path, reached, length(path) AS depth
    RETURN reached.id AS id,
           reached.title AS title,
           reached.year AS year,
           depth,
           [node IN nodes(path) | node.id] AS pathPaperIds
    ORDER BY depth ASC, reached.citationCount DESC
    LIMIT $limit
  `;
}

/**
 * Shortest concept-bridging path between two non-coauthoring researchers.
 * Relational equivalent requires recursive CTEs or multi-way self-joins across 5 join tables.
 */
export const BRIDGE_PATH_BETWEEN_AUTHORS = `
  MATCH (a:Author {id: $authorA}), (b:Author {id: $authorB})
  WHERE a <> b AND NOT (a)-[:AUTHORED]->(:Paper)<-[:AUTHORED]-(b)
  MATCH path = shortestPath((a)-[:AUTHORED|ABOUT*..8]-(b))
  RETURN path,
         length(path) AS pathLength,
         [node IN nodes(path) | {
           id: coalesce(node.id, node.name),
           label: labels(node)[0],
           title: node.title,
           name: node.name,
           year: node.year
         }] AS nodesData,
         [rel IN relationships(path) | {
           type: type(rel),
           source: coalesce(startNode(rel).id, startNode(rel).name),
           target: coalesce(endNode(rel).id, endNode(rel).name)
         }] AS relsData
`;

export const GET_PAPER_WITH_NEIGHBORHOOD = `
  MATCH (p:Paper {id: $paperId})
  OPTIONAL MATCH (a:Author)-[:AUTHORED]->(p)
  OPTIONAL MATCH (p)-[:ABOUT]->(c:Concept)
  OPTIONAL MATCH (p)-[:PUBLISHED_IN]->(v:Venue)
  OPTIONAL MATCH (p)-[:CITES]->(ref:Paper)
  OPTIONAL MATCH (citedBy:Paper)-[:CITES]->(p)
  RETURN p {
           .id,
           .title,
           .year,
           .abstract,
           .url,
           .citationCount
         } AS paper,
         collect(DISTINCT a {.id, .name}) AS authors,
         collect(DISTINCT c.name) AS concepts,
         v.name AS venue,
         collect(DISTINCT ref {.id, .title, .year}) AS references,
         collect(DISTINCT citedBy {.id, .title, .year}) AS citedBy
`;

export const GET_AUTHOR_PROFILE = `
  MATCH (a:Author {id: $authorId})
  OPTIONAL MATCH (a)-[:AUTHORED]->(p:Paper)
  OPTIONAL MATCH (p)-[:PUBLISHED_IN]->(v:Venue)
  OPTIONAL MATCH (p)-[:ABOUT]->(c:Concept)
  OPTIONAL MATCH (co:Author)-[:AUTHORED]->(p)
  WHERE co <> a

  WITH a,
       collect(DISTINCT p {
         .id,
         .title,
         .year,
         .abstract,
         .url,
         .citationCount,
         venue: v.name
       }) AS papers,
       c.name AS conceptName,
       count(DISTINCT p) AS conceptWeight,
       co

  WITH a,
       papers,
       collect(DISTINCT { name: conceptName, count: conceptWeight }) AS rawConcepts,
       co,
       count(DISTINCT co) AS sharedPapers

  RETURN a {.id, .name} AS author,
         papers,
         [c IN rawConcepts WHERE c.name IS NOT NULL] AS concepts,
         collect(DISTINCT CASE WHEN co IS NOT NULL THEN { id: co.id, name: co.name, sharedPapersCount: sharedPapers } END) AS coAuthors
`;

export const SEARCH_PAPERS_AND_AUTHORS = `
  CALL {
    MATCH (p:Paper)
    WHERE toLower(p.title) CONTAINS toLower($query) 
       OR toLower(coalesce(p.abstract, '')) CONTAINS toLower($query)
    RETURN p.id AS id, p.title AS title, p.year AS year, 'Paper' AS type, p.citationCount AS count
    LIMIT $limit
    UNION
    MATCH (a:Author)
    WHERE toLower(a.name) CONTAINS toLower($query)
    RETURN a.id AS id, a.name AS title, null AS year, 'Author' AS type, 0 AS count
    LIMIT $limit
  }
  RETURN id, title, year, type, count
  ORDER BY count DESC
  LIMIT $limit
`;

export const GET_RESEARCH_TOPICS = `
  MATCH (c:Concept)<-[:ABOUT]-(p:Paper)
  RETURN c.name AS name, count(p) AS paperCount
  ORDER BY paperCount DESC
  LIMIT $limit
`;

export const GET_PAPERS_BY_TOPIC = `
  MATCH (c:Concept {name: $topicName})<-[:ABOUT]-(p:Paper)
  OPTIONAL MATCH (a:Author)-[:AUTHORED]->(p)
  OPTIONAL MATCH (p)-[:PUBLISHED_IN]->(v:Venue)
  RETURN p {
           .id,
           .title,
           .year,
           .abstract,
           .url,
           .citationCount,
           venue: v.name
         } AS paper,
         collect(DISTINCT a {.id, .name}) AS authors
  ORDER BY p.citationCount DESC
  LIMIT $limit
`;

export const GET_GRAPH_STATS = `
  MATCH (p:Paper)
  WITH count(p) AS paperCount
  MATCH (a:Author)
  WITH paperCount, count(a) AS authorCount
  MATCH (c:Concept)
  WITH paperCount, authorCount, count(c) AS conceptCount
  MATCH (v:Venue)
  WITH paperCount, authorCount, conceptCount, count(v) AS venueCount
  OPTIONAL MATCH ()-[r:CITES]->()
  RETURN paperCount,
         authorCount,
         conceptCount,
         venueCount,
         count(r) AS citationCount
`;

export const GET_SAMPLE_AUTHORS_FOR_PATH = `
  MATCH (a:Author)-[:AUTHORED]->(:Paper)-[:ABOUT]->(:Concept)<-[:ABOUT]-(:Paper)<-[:AUTHORED]-(b:Author)
  WHERE a.id < b.id AND NOT (a)-[:AUTHORED]->(:Paper)<-[:AUTHORED]-(b)
  RETURN a.id AS authorAId, a.name AS authorAName,
         b.id AS authorBId, b.name AS authorBName
  LIMIT 5
`;
