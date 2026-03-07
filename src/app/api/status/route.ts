/**
 * GET /api/status
 * Sends a STATUS command to the device and returns the raw JSON response.
 * Used for manual health checks from the UI.
 */

import { NextResponse } from "next/server";
import { queryStatus } from "@/lib/serial";

export async function GET() {
  try {
    const result = await queryStatus();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 503 }
    );
  }
}
