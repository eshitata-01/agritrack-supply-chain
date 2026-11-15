import type { CropDefinition, Shipment } from "@/lib/agritrack-data";

export type FacilityRecord = { id: string; name: string; location: string };
export type RouteRecord = { id: string; source: string; destination: string; region?: string };
export type DashboardResponse = {
  mode: "oracle";
  shipments: Shipment[];
  crops: CropDefinition[];
  facilities: FacilityRecord[];
  routes: RouteRecord[];
  regions: string[];
};
export type SqlInsightResponse = { queryId: string; filename: string; sql: string; mode: "oracle"; rows: Record<string, unknown>[] };
export type SqlDefinitionResponse = { queryId: string; filename: string; sql: string; mode: "definition" };
export type DbHealthResponse = {
  connected: boolean;
  driverMode: "thin" | "thick";
  database?: { USERNAME: string; DB_NAME: string; CON_NAME: string; SERVICE_NAME: string };
  error?: { code: string; message: string };
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new ApiError("The AgriTrack API could not be reached. Check that the Next.js server is running.", 0, "API_UNREACHABLE");
  }

  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const nested = body?.error && typeof body.error === "object" ? body.error as Record<string, unknown> : null;
    const message = typeof nested?.message === "string"
      ? nested.message
      : typeof body?.error === "string" ? body.error : `API request failed (${response.status}).`;
    const code = typeof nested?.code === "string" ? nested.code : undefined;
    throw new ApiError(message, response.status, code);
  }
  return body as T;
}

export function getAgriTrackData() {
  return requestJson<DashboardResponse>("/api/agritrack");
}

export function getDatabaseHealth() {
  return requestJson<DbHealthResponse>("/api/health/db");
}

export function getSqlDefinition(queryId: string) {
  return requestJson<SqlDefinitionResponse>(`/api/sql-insights/${encodeURIComponent(queryId)}?sqlOnly=1`);
}

export function executeSqlInsight(queryId: string) {
  return requestJson<SqlInsightResponse>(`/api/sql-insights/${encodeURIComponent(queryId)}`);
}

export function createRecord(resource: string, record: Record<string, unknown>) {
  return requestJson<{ success: true }>("/api/agritrack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource, ...record }),
  });
}

export function updateRecord(resource: string, id: number, record: Record<string, unknown>) {
  return requestJson<{ success: true }>("/api/agritrack", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource, id, record }),
  });
}

export function deleteRecord(resource: string, id: number) {
  return requestJson<{ success: true }>(`/api/agritrack?resource=${encodeURIComponent(resource)}&id=${id}`, { method: "DELETE" });
}
