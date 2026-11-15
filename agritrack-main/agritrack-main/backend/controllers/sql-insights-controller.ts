import { NextResponse } from "next/server";
import { toPublicDatabaseError } from "@backend/services/database-errors";
import { executeSqlInsight, getSqlDefinition } from "@backend/services/sql-insights-service";

type RouteContext = { params: Promise<{ queryId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { queryId } = await params;
  try {
    if (new URL(request.url).searchParams.get("sqlOnly") === "1") {
      const definition = await getSqlDefinition(queryId);
      return definition
        ? NextResponse.json({ ...definition, mode: "definition" })
        : NextResponse.json({ error: "Unknown query ID." }, { status: 404 });
    }
    const result = await executeSqlInsight(queryId);
    return result
      ? NextResponse.json(result)
      : NextResponse.json({ error: "Unknown query ID." }, { status: 404 });
  } catch (error) {
    const databaseError = toPublicDatabaseError(error);
    return NextResponse.json({ mode: "error", error: databaseError }, { status: 503 });
  }
}
