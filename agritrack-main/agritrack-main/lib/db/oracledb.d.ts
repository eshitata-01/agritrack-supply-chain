declare module "oracledb" {
  export interface Pool {
    getConnection(): Promise<Connection>;
    close(drainTimeSeconds: number): Promise<void>;
  }

  export interface Connection {
    execute<T>(sql: string, binds: Record<string, unknown>, options: Record<string, unknown>): Promise<{ rows?: T[] }>;
    close(): Promise<void>;
  }

  const oracledb: {
    createPool(options: Record<string, unknown>): Promise<Pool>;
    OUT_FORMAT_OBJECT: number;
  };

  export default oracledb;
}
