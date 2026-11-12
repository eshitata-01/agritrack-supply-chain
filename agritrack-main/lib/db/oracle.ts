import oracledb from "oracledb";

let poolPromise: Promise<oracledb.Pool> | null = null;

export function getOraclePool() {
  if (!poolPromise) {
    const { ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECT_STRING } = process.env;
    if (!ORACLE_USER || !ORACLE_PASSWORD || !ORACLE_CONNECT_STRING) {
      throw new Error("Oracle environment variables are missing. Configure ORACLE_USER, ORACLE_PASSWORD and ORACLE_CONNECT_STRING.");
    }
    poolPromise = oracledb.createPool({
      user: ORACLE_USER,
      password: ORACLE_PASSWORD,
      connectString: ORACLE_CONNECT_STRING,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
    });
  }
  return poolPromise;
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
