export interface S2Author {
  authorId: string;
  name: string;
}

export interface S2Reference {
  paperId: string | null;
  title: string | null;
  year?: number | null;
}

export interface S2FieldOfStudy {
  category: string;
  source: string;
}

export interface S2Paper {
  paperId: string;
  title: string;
  year?: number | null;
  abstract?: string | null;
  url?: string | null;
  citationCount?: number | null;
  venue?: string | null;
  authors?: S2Author[] | null;
  fieldsOfStudy?: string[] | null;
  s2FieldsOfStudy?: S2FieldOfStudy[] | null;
  references?: S2Reference[] | null;
}

interface S2SearchResponse {
  total: number;
  offset: number;
  next?: number;
  data: S2Paper[];
}

const BASE_URL = "https://api.semanticscholar.org/graph/v1";
const S2_FIELDS =
  "paperId,title,year,abstract,url,citationCount,venue,authors,fieldsOfStudy,s2FieldsOfStudy,references";

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// HTTP fetch with exponential backoff on rate limits (HTTP 429)
async function fetchWithRetry(
  url: string,
  retries = 4,
  delayMs = 1200,
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "ResearchCompanion-Seeder/1.0",
        },
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : delayMs * Math.pow(2, attempt);
        console.warn(
          `[S2 Rate Limit] 429 received. Backing off for ${waitTime}ms (attempt ${attempt}/${retries})...`,
        );
        await sleep(waitTime);
        continue;
      }

      if (!res.ok) {
        throw new Error(`S2 API error HTTP ${res.status}: ${res.statusText}`);
      }

      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(
        `[S2 Fetch Error] Attempt ${attempt} failed: ${err}. Retrying in ${delayMs}ms...`,
      );
      await sleep(delayMs);
    }
  }

  throw new Error(`Failed to fetch ${url} after ${retries} attempts.`);
}

/**
 * Searches for research papers by querying keyword or domain.
 */
export async function searchPapers(
  query: string,
  limit = 25,
): Promise<S2Paper[]> {
  const url = `${BASE_URL}/paper/search?query=${encodeURIComponent(
    query,
  )}&limit=${limit}&fields=${S2_FIELDS}`;

  console.log(
    `[S2 Client] Searching papers for topic: "${query}" (limit: ${limit})...`,
  );
  const response = await fetchWithRetry(url);
  const data = (await response.json()) as S2SearchResponse;

  return data.data || [];
}

/**
 * Fetches single paper with its references for multi-hop expansion.
 */
export async function getPaperDetails(
  paperId: string,
): Promise<S2Paper | null> {
  const url = `${BASE_URL}/paper/${encodeURIComponent(paperId)}?fields=${S2_FIELDS}`;
  try {
    const response = await fetchWithRetry(url);
    return (await response.json()) as S2Paper;
  } catch (error) {
    console.error(
      `[S2 Client] Failed to fetch details for paper ${paperId}:`,
      error,
    );
    return null;
  }
}
