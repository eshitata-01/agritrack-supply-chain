import { NextResponse } from "next/server";
import { getDatabaseIdentity, getOracleMode, verifyOracleConnection } from "@backend/config/oracle";
import { toPublicDatabaseError } from "@backend/services/database-errors";

export async function GET() {
  const driverMode = getOracleMode();
  try {
    await verifyOracleConnection();
    const database = await getDatabaseIdentity();
    if (!database) throw new Error("DATABASE_IDENTITY_EMPTY");
    return NextResponse.json({ connected: true, driverMode, database });
  } catch (error) {
    return NextResponse.json({ connected: false, driverMode, error: toPublicDatabaseError(error) }, { status: 503 });
  }
}
