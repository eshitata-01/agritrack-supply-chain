import { existsSync } from "node:fs";
import path from "node:path";

export function getWorkspaceRoot() {
  const candidates = [process.cwd(), path.resolve(process.cwd(), "..")];
  const root = candidates.find((candidate) => existsSync(path.join(candidate, "database", "schema", "create_tables.sql")));
  if (!root) throw new Error("PROJECT_ROOT_NOT_FOUND");
  return root;
}
