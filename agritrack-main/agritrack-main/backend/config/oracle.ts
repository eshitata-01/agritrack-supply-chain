import oracledb, { type Pool } from "oracledb";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getWorkspaceRoot } from "@backend/config/project-paths";

let poolPromise: Promise<Pool> | null = null;

function loadWorkspaceEnvironment() {
  // The Next app is rooted under frontend/, while secrets are kept in the repo root.
  try {
    const content = readFileSync(join(getWorkspaceRoot(), ".env.local"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*(ORACLE_USER|ORACLE_PASSWORD|ORACLE_CONNECT_STRING)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch { /* Missing file is reported as missing configuration below. */ }
}

export function getOracleMode() {
  return oracledb.thin ? "thin" : "thick";
}

export function getOraclePool() {
  if (!poolPromise) {
    loadWorkspaceEnvironment();
    const { ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECT_STRING } = process.env;
    if (!ORACLE_USER || !ORACLE_PASSWORD || !ORACLE_CONNECT_STRING) {
      throw new Error("ORACLE_CONFIG_MISSING");
    }

    poolPromise = oracledb.createPool({
      user: ORACLE_USER,
      password: ORACLE_PASSWORD,
      connectString: ORACLE_CONNECT_STRING,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
      poolTimeout: 60,
      queueTimeout: 15000,
    }).catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

export async function closeOraclePool() {
  if (!poolPromise) return;
  const pendingPool = poolPromise;
  poolPromise = null;
  const pool = await pendingPool;
  await pool.close(10);
}

export async function runOracleQuery<T = Record<string, unknown>>(
  sql: string,
  binds: Record<string, unknown> = {},
) {
  const pool = await getOraclePool();
  const connection = await pool.getConnection();
  try {
    const result = await connection.execute<T>(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows ?? [];
  } finally {
    await connection.close();
  }
}

export async function runOracleMutation<T = Record<string, unknown>>(
  sql: string,
  binds: Record<string, unknown> = {},
) {
  const pool = await getOraclePool();
  const connection = await pool.getConnection();
  try {
    const result = await connection.execute<T>(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
    });
    return result.rows ?? [];
  } finally {
    await connection.close();
  }
}

export async function runOracleTransaction(
  statements: Array<{ sql: string; binds?: Record<string, unknown> }>,
) {
  const pool = await getOraclePool();
  const connection = await pool.getConnection();
  try {
    for (const statement of statements) {
      await connection.execute(statement.sql, statement.binds ?? {}, {});
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}

export async function getDatabaseIdentity() {
  const rows = await runOracleQuery<Record<string, string>>(
    `SELECT USER AS USERNAME,
            SYS_CONTEXT('USERENV', 'DB_NAME') AS DB_NAME,
            SYS_CONTEXT('USERENV', 'CON_NAME') AS CON_NAME,
            SYS_CONTEXT('USERENV', 'SERVICE_NAME') AS SERVICE_NAME
       FROM dual`,
  );
  return rows[0] ?? null;
}

export async function verifyOracleConnection() {
  const rows = await runOracleQuery<Record<string, unknown>>("SELECT 1 FROM DUAL");
  const value = rows[0] ? Number(Object.values(rows[0])[0]) : NaN;
  if (value !== 1) throw new Error("ORACLE_HEALTH_CHECK_FAILED");
  return true;
}
