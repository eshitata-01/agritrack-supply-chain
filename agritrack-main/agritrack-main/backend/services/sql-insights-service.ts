import { readFile } from "node:fs/promises";
import path from "node:path";
import { runOracleQuery } from "@backend/config/oracle";
import { getWorkspaceRoot } from "@backend/config/project-paths";

const allowedQueries: Record<string, string> = {
  "01": "01_monthly_loss_trend.sql",
  "02": "02_stage_loss.sql",
  "03": "03_facility_ranking.sql",
  "04": "04_route_risk.sql",
  "05": "05_storage_duration.sql",
  "06": "06_crop_ranking.sql",
  "07": "07_high_risk_shipments.sql",
  "08": "08_region_comparison.sql",
};

export async function getSqlDefinition(queryId: string) {
  const filename = allowedQueries[queryId];
  if (!filename) return null;
  const sql = await readFile(path.join(getWorkspaceRoot(), "database", "queries", filename), "utf8");
  return { queryId, filename, sql };
}

export async function executeSqlInsight(queryId: string) {
  const definition = await getSqlDefinition(queryId);
  if (!definition) return null;
  const rows = await runOracleQuery(definition.sql);
  return { ...definition, mode: "oracle" as const, rows };
}
