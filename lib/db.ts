import neo4j, { Driver, Session, SessionMode, Integer, isInt } from "neo4j-driver";

/**
 * Global declaration for development hot-reloading.
 * Prevents multiple driver instances from being spawned during Next.js HMR,
 * strictly honoring CognoDB's 200 connection pool limit.
 */
declare global {
  // eslint-disable-next-line no-var
  var __cognodbDriver: Driver | undefined;
}

/**
 * Validates and retrieves required CognoDB environment credentials.
 */
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
        ", "
      )}. Please verify your .env.local configuration.`
    );
  }

  return { uri, user, password };
}

/**
 * Returns the singleton neo4j Driver instance configured for CognoDB.
 * Configures connection pool ceiling to 20 to protect against connection exhaustion.
 */
export function getDriver(): Driver {
  if (globalThis.__cognodbDriver) {
    return globalThis.__cognodbDriver;
  }

  const { uri, user, password } = getDbCredentials();

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 20,
    connectionTimeout: 10000,
    maxTransactionRetryTime: 15000,
    disableLosslessIntegers: false,
    userAgent: "ResearchCompanion/1.0",
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__cognodbDriver = driver;
  }

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

/**
 * Executes database operations within a managed session lifecycle.
 * Guarantees that the session is closed even if the callback throws.
 *
 * @param work Async callback receiving the active Neo4j Session
 * @param mode 'READ' | 'WRITE' session mode (defaults to 'READ')
 */
export async function withSession<T>(
  work: (session: Session) => Promise<T>,
  mode: SessionMode = "READ"
): Promise<T> {
  const driver = getDriver();
  const session = driver.session({ defaultAccessMode: mode });

  try {
    return await work(session);
  } finally {
    await session.close();
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
