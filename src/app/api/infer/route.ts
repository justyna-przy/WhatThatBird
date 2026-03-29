/**
 * POST /api/infer
 *
 * Accepts either:
 *   1) multipart/form-data with field "audio" (WAV/WebM/etc.) or
 *   2) legacy raw int16 PCM in the request body (application/octet-stream).
 *
 * The route:
 *   1. Checks per-IP rate limit (2 req/min)
 *   2. Enqueues on the single-concurrency inference queue
 *   3. Forwards audio to the Flask BirdSpec API
 *   4. Returns per-window predictions
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, retryAfterSeconds } from "@/lib/ratelimit";
import { enqueue, getQueueDepth } from "@/lib/queue";
import { inferAudioBlob, inferRawPcm, type InferResponse } from "@/lib/api";
import { startHeartbeat } from "@/lib/heartbeat";

// Start heartbeat on first request if not already running
startHeartbeat();

const MAX_RAW_PCM_BYTES = 96_000; // legacy 3 s @ 16 kHz mono int16
const MAX_FORM_AUDIO_BYTES = 250_000; // frontend trims to <= 3 s WAV

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

  const contentType = req.headers.get("content-type") ?? "";

  let inferenceJob: () => Promise<InferResponse>;
  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audio = formData.get("audio");

      if (!(audio instanceof File)) {
        return NextResponse.json(
          { error: "Missing file field 'audio'" },
          { status: 400 }
        );
      }
      if (audio.size === 0) {
        return NextResponse.json({ error: "Empty audio file" }, { status: 400 });
      }
      if (audio.size > MAX_FORM_AUDIO_BYTES) {
        return NextResponse.json(
          { error: `Audio file too large (max ${MAX_FORM_AUDIO_BYTES} bytes)` },
          { status: 400 }
        );
      }

      const audioBytes = Buffer.from(await audio.arrayBuffer());
      inferenceJob = () =>
        inferAudioBlob(audioBytes, {
          filename: audio.name || "clip.wav",
          mimeType: audio.type || "audio/wav",
        });
    } else {
      // Legacy raw PCM fallback for older clients.
      const arrayBuffer = await req.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return NextResponse.json({ error: "Empty body" }, { status: 400 });
      }
      if (arrayBuffer.byteLength > MAX_RAW_PCM_BYTES) {
        return NextResponse.json(
          { error: `PCM too large (max ${MAX_RAW_PCM_BYTES} bytes)` },
          { status: 400 }
        );
      }

      const pcmBuffer = Buffer.from(arrayBuffer);
      inferenceJob = () => inferRawPcm(pcmBuffer);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bad request" },
      { status: 400 }
    );
  }

  try {
    const result = await enqueue(inferenceJob);
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
