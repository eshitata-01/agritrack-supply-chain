export type PublicDatabaseError = { code: string; message: string };

export function toPublicDatabaseError(error: unknown): PublicDatabaseError {
  const message = error instanceof Error ? error.message : "";
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";

  if (message === "ORACLE_CONFIG_MISSING") {
    return { code: "ORACLE_CONFIG_MISSING", message: "Oracle is not configured. Set ORACLE_USER, ORACLE_PASSWORD, and ORACLE_CONNECT_STRING in the repository root .env.local, then restart the app." };
  }
  if (message === "PROJECT_ROOT_NOT_FOUND") {
    return { code: "PROJECT_ROOT_NOT_FOUND", message: "Could not locate the project root that contains the database scripts and .env.local." };
  }
  if (code === "ORA-01017") {
    return { code, message: "Oracle rejected the configured username or password for this service. Verify the account exists in the target pluggable database and can log in; the application did not log the password." };
  }
  if (code === "ORA-12514" || code === "ORA-12505") {
    return { code, message: "The Oracle listener does not recognize the requested service. Check ORACLE_CONNECT_STRING and confirm that service is registered with the listener." };
  }
  if (code === "ORA-12541" || code === "NJS-503") {
    return { code, message: "The Oracle listener could not be reached. Confirm the database and listener are running and that host/port 1521 are reachable." };
  }
  if (code === "ORA-12170" || code === "NJS-511") {
    return { code, message: "The Oracle connection timed out. Check the listener address, firewall, and database startup state." };
  }
  if (code === "NJS-040") {
    return { code, message: "The Oracle connection pool timed out waiting for a free connection. The read request did not delete database records. Restore listener access, then restart the Next.js server to clear stale pooled connections." };
  }
  if (code.startsWith("ORA-") || code.startsWith("NJS-") || code.startsWith("DPI-")) {
    return { code, message: `Oracle connection failed (${code}). Check the database service, account permissions, and Oracle driver configuration.` };
  }
  return { code: "DATABASE_UNAVAILABLE", message: "The Oracle database is unavailable. Check server logs for the internal error code; credentials are not included in API responses." };
}
