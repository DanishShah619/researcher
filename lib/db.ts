import neo4j, {
  Driver,
  Session,
  SessionMode,
  Integer,
  isInt,
} from "neo4j-driver";
import { parseBoundedInt } from "./params";

declare global {
  var __cognodbDriver: Driver | undefined;
}

function getDbCredentials() {
  const uri = process.env.COGNODB_URI;
  const user = process.env.COGNODB_USER;
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !user || !password) {
    const missing: string[] = [];
    if (!uri) missing.push("COGNODB_URI");
    if (!user) missing.push("COGNODB_USER");
    if (!password) missing.push("COGNODB_PASSWORD");

    throw new Error(
      `[CognoDB Error] Missing required database environment variables: ${missing.join(
        ", ",
      )}. Please verify your .env.local configuration.`,
    );
  }

  return { uri, user, password };
}

export function getDriver(): Driver {
  if (globalThis.__cognodbDriver) {
    return globalThis.__cognodbDriver;
  }

  const { uri, user, password } = getDbCredentials();

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 20,
    // Fail a request after 15s waiting for a free connection instead of the driver's
    // 60s default, so a burst that exhausts the pool sheds load rather than piling up.
    // Must stay above connectionTimeout: acquiring includes connecting, and an equal
    // value turns "database unreachable" into a misleading acquisition timeout.
    connectionAcquisitionTimeout: 15000,
    connectionTimeout: 10000,
    maxTransactionRetryTime: 15000,
    disableLosslessIntegers: false,
    userAgent: "ResearchCompanion/1.0",
  });

  // Cache globally regardless of environment. Without this, production deploys
  // on serverless platforms (Vercel) spin up a new connection pool per request,
  // exhausting CognoDB's connection ceiling almost immediately.
  globalThis.__cognodbDriver = driver;

  return driver;
}

/**
 * Verifies that the CognoDB instance is reachable and credentials are valid.
 */
export async function verifyConnectivity(): Promise<{
  ok: boolean;
  message?: string;
  address?: string;
  agent?: string;
}> {
  try {
    const driver = getDriver();
    const serverInfo = await driver.getServerInfo();
    return {
      ok: true,
      address: serverInfo.address,
      agent: serverInfo.agent,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown connection error";
    return {
      ok: false,
      message,
    };
  }
}

// Sessions slower than this are logged with their label. Override with COGNODB_SLOW_QUERY_MS.
const SLOW_SESSION_MS = parseBoundedInt(process.env.COGNODB_SLOW_QUERY_MS ?? null, 500, 0, 600_000);

/**
 * Executes database operations within a managed session lifecycle.
 * Guarantees that the session is closed even if the callback throws.
 *
 * @param work Async callback receiving the active Neo4j Session
 * @param mode 'READ' | 'WRITE' session mode (defaults to 'READ')
 * @param label Name used in the slow-session log line
 */
export async function withSession<T>(
  work: (session: Session) => Promise<T>,
  mode: SessionMode = "READ",
  label: string = "session",
): Promise<T> {
  const driver = getDriver();
  const session = driver.session({ defaultAccessMode: mode });
  const startedAt = performance.now();

  try {
    return await work(session);
  } finally {
    await session.close();
    const elapsedMs = Math.round(performance.now() - startedAt);
    if (elapsedMs >= SLOW_SESSION_MS) {
      console.warn(`[CognoDB] slow ${mode} session "${label}": ${elapsedMs}ms`);
    }
  }
}

/**
 * Explicitly closes the driver instance. Call this in shutdown hooks or seed scripts.
 */
export async function closeDriver(): Promise<void> {
  if (globalThis.__cognodbDriver) {
    await globalThis.__cognodbDriver.close();
    globalThis.__cognodbDriver = undefined;
  }
}

/**
 * Recursively converts Neo4j Integers, Node properties, and nested structures
 * into native JavaScript primitives and JSON-serializable objects.
 */
export function toNative<T = unknown>(value: unknown): T {
  if (value === null || value === undefined) {
    return value as T;
  }

  if (isInt(value)) {
    return (value as Integer).toNumber() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toNative(item)) as T;
  }

  if (typeof value === "object") {
    // Check if it's a Neo4j Node or Relationship with `.properties`
    const recordObj = value as { properties?: Record<string, unknown> };
    if (recordObj.properties && typeof recordObj.properties === "object") {
      return toNative(recordObj.properties);
    }

    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = toNative(v);
    }
    return result as T;
  }

  return value as T;
}
