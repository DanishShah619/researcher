/**
 * Seed Dataset Configuration
 * Specifies initial research topics and hop depth for live data ingestion.
 */

export interface SeedTopicConfig {
  query: string;
  limit: number;
}

export const SEED_TOPICS: SeedTopicConfig[] = [
  { query: "Retrieval Augmented Generation", limit: 20 },
  { query: "Graph Neural Networks", limit: 20 },
  { query: "Knowledge Graph Reasoning", limit: 15 },
  { query: "Large Language Model Reasoning", limit: 20 },
  { query: "Vector Database Embeddings", limit: 15 }
];

/**
 * Number of reference citations to expand per seeded paper
 * to create interconnected multi-hop citation graphs.
 */
export const CITATION_HOP_LIMIT_PER_PAPER = 5;
