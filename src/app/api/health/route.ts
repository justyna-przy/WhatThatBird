/**
 * GET /api/health
 * Returns device online status, last seen timestamp, and queue depth.
 * Polled by the frontend every 10 seconds.
 */

import { NextResponse } from "next/server";
import { getHealth, startHeartbeat } from "@/lib/heartbeat";
import { getQueueDepth, isDeviceBusy } from "@/lib/queue";

startHeartbeat();

export async function GET() {
  const health = getHealth();
  return NextResponse.json({
    online: health.online,
    lastSeenMs: health.lastSeenMs,
    lastError: health.lastError,
    queueDepth: getQueueDepth(),
    busy: isDeviceBusy(),
  });
}
