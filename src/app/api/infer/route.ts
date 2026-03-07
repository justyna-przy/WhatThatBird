/**
 * POST /api/infer
 *
 * Accepts a multipart form upload with a single field "audio" containing
 * a WAV/WebM blob that has already been resampled to 16 kHz mono int16
 * PCM by the browser (OfflineAudioContext).  The body is the raw int16
 * PCM bytes as an ArrayBuffer — sent as application/octet-stream.
 *
 * The route:
 *   1. Checks per-IP rate limit (2 req/min)
 *   2. Enqueues on the single-concurrency inference queue
 *   3. Forwards PCM to the MAX78002 via LOAD_PCM
 *   4. Returns the device JSON response
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, retryAfterSeconds } from "@/lib/ratelimit";
import { enqueue, getQueueDepth } from "@/lib/queue";
import { loadPcmAndInfer } from "@/lib/serial";
import { startHeartbeat } from "@/lib/heartbeat";

// Start heartbeat on first request if not already running
startHeartbeat();

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  // Rate limit
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterSeconds: retryAfterSeconds(ip) },
      { status: 429 }
    );
  }

  // Read raw PCM bytes from body
  const arrayBuffer = await req.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  // Max 96000 bytes = 48000 int16 samples = 3 s at 16 kHz
  if (arrayBuffer.byteLength > 96_000) {
    return NextResponse.json({ error: "PCM too large (max 96000 bytes)" }, { status: 400 });
  }

  const pcmBuffer = Buffer.from(arrayBuffer);

  try {
    const result = await enqueue(() => loadPcmAndInfer(pcmBuffer));
    return NextResponse.json({ ...result, queueDepth: getQueueDepth() });
  } catch (err) {
    const e = err as Error & { status?: number };
    const status = e.status ?? 500;
    return NextResponse.json(
      { error: e.message, queueDepth: getQueueDepth() },
      { status }
    );
  }
}
