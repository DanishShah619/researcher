# Research Companion — Graph-Native Citation & Concept Explorer

A tool for exploring research literature the way researchers actually think
about it: not as a flat list of papers, but as a web of authors, citations,
and ideas. Built on **CognoDB** (a managed graph database speaking openCypher
over Bolt) for the Wexa AI take-home assignment.

This README doubles as a **decision log** — every major choice, why it was
made, what else was considered, and a step-by-step guide to finish the build.

---

## 1. Why a graph database?

The interesting questions in this domain are inherently about **relationships
between entities of different types**, and the depth of those relationships
is unknown ahead of time:

- "What's the shortest path of ideas connecting these two papers?"
- "Which authors bridge two otherwise-unconnected subfields?"
- "What's cited by both of these clusters, but by neither directly?"

**In a relational schema**, each of these needs a self-join or recursive CTE
per hop, with the hop count often unknown in advance — the query either
hardcodes a max depth or becomes unmanageable. Variable-length,
direction-aware traversal is not what SQL was built for.

**In a graph model**, the same question is a single Cypher pattern:
```cypher
MATCH path = (a:Author)-[:AUTHORED]->(:Paper)-[:ABOUT]->(:Concept)<-[:ABOUT]-(:Paper)<-[:AUTHORED]-(b:Author)
WHERE a.id = $authorA AND b.id = $authorB
RETURN path LIMIT 5
```
No join explosion, no fixed hop count, and the query reads like the question
you're actually asking.

### Alternatives considered

| Option | Why not chosen |
|---|---|
| **PostgreSQL + recursive CTEs** | Works for fixed shallow depth, but multi-hop concept-bridging queries become unreadable and slow as hop count grows; no native path-finding. |
| **PostgreSQL + a graph extension (e.g. AGE)** | Adds real complexity (extension install, dual query languages) for a benefit CognoDB gives natively. Not worth it for a 48h scope. |
| **MongoDB with manual graph traversal in app code** | Pushes traversal logic into the application layer instead of the database — slower, harder to reason about, and defeats the point of the assignment. |
| **CognoDB (chosen)** | Native Cypher, native variable-length paths, managed free tier, drop-in Neo4j driver compatibility. |

---

## 2. Why this use case (research companion)?

Options considered: social network, e-commerce recommendations, fraud
detection, supply chain, and citation/concept explorer. The citation graph
was chosen because:

- It's a **textbook-strong justification for graph over relational** — citation
  networks and concept bridging are one of the clearest real-world cases where
  the graph *is* the data, not an afterthought.
- Real, freely available data exists (Semantic Scholar), so the seed data is
  genuine rather than synthetic — stronger than hand-written fake records.
- It naturally produces both required query types: a clean multi-hop
  traversal (citation chains) and a clean "relational-awkward" query
  (author-bridging through shared concepts).

---

## 3. Why the Semantic Scholar API for seed data?

| Option | Why not chosen |
|---|---|
| **arXiv API** | No citation graph data — only paper metadata. Would need a second source stitched in just to get `CITES` edges. |
| **OpenAlex** | Excellent and free, but heavier response schema and less consistent `fieldsOfStudy` tagging for quick concept-node extraction. Reasonable fallback if S2 rate limits become a blocker. |
| **Crossref** | Citation *counts*, not citation *graphs* (no per-paper reference lists in the free tier) — doesn't give edges directly. |
| **Semantic Scholar Graph API (chosen)** | Free, no key required for light use, returns papers, authors, references, and field-of-study tags in a single call — maps almost 1:1 onto the target graph schema. |

---

## 4. Why Node.js for the ingestion script?

Originally prototyped in Python (equally valid — the official Neo4j driver
supports it). Switched to Node because:

- The application layer is Next.js, so the ingestion script and the app now
  **share one language and one driver** (`neo4j-driver`), which makes it
  easier to factor out a shared `lib/cognodb.ts` connection helper later if
  useful, and keeps the repo's toolchain to just `npm install`.
- Native `fetch` on Node 18+ meant no extra HTTP dependency was needed.

This is a stylistic choice, not a technical necessity — either language
satisfies the assignment's "official Neo4j driver" requirement equally.

---

## 5. Why Next.js for the application?

| Option | Why not chosen |
|---|---|
| **React (Vite) + Express backend** | Two servers to deploy and configure instead of one; more moving parts for a 48h build. |
| **SvelteKit** | Comparable fit technically, but smaller ecosystem for the graph-visualization libraries this project needs, and less familiar territory — riskier under a deadline. |
| **Flask/FastAPI + server-rendered templates** | Weaker "polished UI/UX" story out of the box; more manual work to get loading/empty states feeling native. |
| **Next.js (chosen)** | API routes double as the backend (Cypher queries live next to the pages that call them), free zero-config deployment on Vercel satisfies the "hosted demo" requirement directly, and server components let data load server-side for clean loading states. |

**Graph visualization**: since a force-directed/interactive graph view needs
the DOM/canvas, that piece will be an isolated `'use client'` component (e.g.
`react-force-graph` or `vis-network`) fed with JSON from a server-fetched
Cypher query — kept separate from the server components so the rest of the
app stays server-rendered.

---

## 6. Data model

**Nodes**
- `Paper {id, title, year, abstract, url}`
- `Author {id, name}`
- `Concept {name}`
- `Venue {name}`

**Relationships**
- `(:Author)-[:AUTHORED]->(:Paper)`
- `(:Paper)-[:CITES]->(:Paper)`
- `(:Paper)-[:ABOUT]->(:Concept)`
- `(:Paper)-[:PUBLISHED_IN]->(:Venue)`

```
(Author)-[:AUTHORED]->(Paper)-[:CITES]->(Paper)
                          |                  |
                     [:ABOUT]           [:ABOUT]
                          v                  v
                      (Concept)          (Concept)
                          ^
                          |
                     [:ABOUT]
                          |
(Author)-[:AUTHORED]->(Paper)-[:PUBLISHED_IN]->(Venue)
```

Constraints (`Paper.id`, `Author.id`, `Concept.name`, `Venue.name` all
unique) are created by the ingestion script on first run — these double as
indexes, keeping `MERGE` fast as the dataset grows.

### Why MERGE everywhere, not CREATE

Every write in the ingestion script uses `MERGE`, making the whole pipeline
**idempotent** — re-running it (e.g. with a new `--topic`) only adds new data,
never duplicates existing nodes or edges. This matters because the pipeline
will likely be re-run several times while tuning the seed topic/limit.

---

## 7. Query design

**Multi-hop traversal (required):**
Citation-chain reachability — given a paper, find everything within N
citation hops that also touches a given concept. Demonstrates variable-length
path matching CognoDB handles natively.

**Relational-awkward query (required):**
Shortest concept-bridging path between two authors who have never
co-authored — `Author → Paper → Concept → Paper → Author`. In SQL this is a
multi-way self-join with an unknown depth; in Cypher it's one pattern.

> Cypher query file (`queries.cypher`) with both of these, fully parameterised
> for use via the driver, is the next artifact to write — see the checklist
> below.

---

## 8. Project structure (target)

```
research-companion/
├── ingest/
│   ├── ingest.js            # Semantic Scholar → CognoDB pipeline
│   ├── package.json
│   └── queries.cypher       # named, parameterised Cypher used by the app
├── app/
│   ├── api/
│   │   ├── papers/[id]/route.ts   # paper detail + neighborhood query
│   │   └── path/route.ts          # author-bridging path query
│   ├── paper/[id]/page.tsx        # paper detail (server component)
│   └── explore/page.tsx           # path-finder UI (client, graph viz)
├── lib/
│   └── cognodb.ts            # shared driver singleton, read from env vars
├── .env.local.example
└── README.md
```

---

## 9. Setup guide

### Step 1 — Provision CognoDB
1. Sign up at `console.cognodb.com/signup` (no credit card needed).
2. Create a free `c0` instance, pick a region — provisions in under a minute.
3. Copy the `bolt+s://<instance-id>.databases.cognodb.cloud` URI and the
   generated password **immediately** (shown once) — store both as env vars,
   never commit them.

### Step 2 — Seed the graph
```bash
cd ingest
npm install
export COGNODB_URI="bolt+s://<instance-id>.databases.cognodb.cloud"
export COGNODB_USER="cognodb"
export COGNODB_PASSWORD="<your-password>"
node ingest.js --topic "retrieval augmented generation" --limit 150
```

### Step 3 — Run the app locally
```bash
cd app
npm install
cp .env.local.example .env.local   # fill in the same COGNODB_* values
npm run dev
```

### Step 4 — Deploy
Push to GitHub, import into Vercel, set the three `COGNODB_*` environment
variables in the Vercel project settings, deploy. Free tier is sufficient.

### Step 5 — Keep the instance alive
Per the assignment: keep the CognoDB instance running until you hear back,
in case they test against live data.

---

## 10. Checklist to finish the project

- [x] Decide use case + graph justification
- [x] Design data model
- [x] Write ingestion pipeline (Node.js)
- [ ] Write `queries.cypher` — multi-hop traversal + author-bridging query,
      parameterised, ready for the driver
- [ ] Scaffold Next.js app (`lib/cognodb.ts` connection helper first)
- [ ] Build `api/papers/[id]/route.ts` — paper detail + 1-hop neighborhood
- [ ] Build `api/path/route.ts` — bridging-path query between two authors
- [ ] Build `paper/[id]/page.tsx` — server-rendered detail page
- [ ] Build `explore/page.tsx` — client-side interactive graph (pick
      `react-force-graph` or `vis-network`)
- [ ] Add loading / empty / error states across all pages (graded criterion)
- [ ] Add graceful handling when CognoDB is unreachable (graded criterion)
- [ ] Take UI screenshots for README
- [ ] Deploy to Vercel, confirm hosted demo works end-to-end
- [ ] Record short screen walkthrough
- [ ] Add `.env.local.example` (no real secrets) and confirm `.env*` is
      gitignored
- [ ] Final README pass: fill in screenshots, demo link, and confirm every
      assignment requirement (§5.1–5.3 of the brief) is checked off
- [ ] Submit: email repo URL + demo link to hr@wexa.ai, subject
      "CognoDB Assignment 2 – Danish Shah"

---

## 11. Submission requirements cross-check

| Requirement | Status |
|---|---|
| Graph data model + README diagram | ✅ documented above |
| Seed data loaded by script | ✅ `ingest.js` |
| Multi-hop traversal query | ⬜ pending — `queries.cypher` |
| Relational-awkward query | ⬜ pending — `queries.cypher` |
| Parameterised queries via official driver | ✅ pattern established in `ingest.js` |
| Functional web app | ⬜ pending — Next.js scaffold |
| Loading/empty/error states | ⬜ pending |
| Env vars for secrets, nothing committed | ✅ pattern established |
| Graceful DB-unreachable handling | ⬜ pending |
| Hosted demo + screen recording | ⬜ pending |