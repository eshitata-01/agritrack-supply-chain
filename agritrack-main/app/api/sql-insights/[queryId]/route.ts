import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runOracleQuery } from "@/lib/db/oracle";

export const runtime = "nodejs";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ queryId: string }> },
) {
  const { queryId } = await params;
  const filename = allowedQueries[queryId];
  if (!filename) {
    return NextResponse.json({ error: "Unknown query ID" }, { status: 404 });
  }

  try {
    const sqlPath = path.join(process.cwd(), "database", "queries", filename);
    const sql = await readFile(sqlPath, "utf8");
    const rows = await runOracleQuery(sql);
    return NextResponse.json({ queryId, filename, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query execution failed";
    return NextResponse.json(
      { error: message, hint: "Check Oracle configuration and run the schema, views, and seed scripts." },
      { status: 503 },
    );
  }
}
