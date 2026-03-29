/**
 * api.ts — HTTP client for the BirdSpec Windows Flask API.
 *
 * Replaces serial.ts. The device is connected to a Windows machine
 * running birdspec_api.py; this module talks to that server over HTTP.
 *
 * Configure the base URL via BIRDSPEC_API_BASE in .env.local, e.g.:
 *   BIRDSPEC_API_BASE=http://10.202.65.240:5000
 */

const API_BASE =
  process.env.BIRDSPEC_API_BASE ?? "http://10.202.65.240:5000";

// ── WAV builder ──────────────────────────────────────────────────────────────

/**
 * Prepend a standard 44-byte WAV header to raw int16-LE PCM bytes.
 * The Flask API decodes audio with soundfile/librosa so it needs a
 * container format — raw PCM is not supported.
 */
function wrapInWav(pcmBytes: Buffer): Buffer {
  const numChannels  = 1;
  const sampleRate   = 16_000;
  const bitsPerSample = 16;
  const byteRate     = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign   = numChannels * (bitsPerSample / 8);
  const dataSize     = pcmBytes.length;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);           // PCM subchunk size
  header.writeUInt16LE(1, 20);            // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBytes]);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface FlaskPrediction {
  idx: number;
  label: string;
  common: string;
  conf: string; // e.g. "87.3" — string in Flask API
}

interface FlaskWindow {
  window_index: number;
  start_s: number;
  end_s: number;
  predictions: FlaskPrediction[];
  latency_us?: number;
  spec_us?: number;
  cnn_nj?: number;
  spec_nj?: number;
  total_nj?: number;
}

interface FlaskInferResponse {
  ok: boolean;
  error?: string;
  windows?: FlaskWindow[];
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send 96 000 bytes of raw int16-LE PCM to the Flask API for inference.
 *
 * Wraps the PCM in a WAV container, POSTs as multipart/form-data to
 * /api/infer, and reshapes the first window's result back into the
 * format the trial page expects:
 *   { status, top3: [{idx, label, common, conf: number}], latency_us }
 */
export async function loadPcmAndInfer(
  pcmBuffer: Buffer
): Promise<Record<string, unknown>> {
  const wav  = wrapInWav(pcmBuffer);
  const form = new FormData();
  form.append("audio", new Blob([wav], { type: "audio/wav" }), "clip.wav");

  const resp = await fetch(`${API_BASE}/api/infer?top=3&metrics=1`, {
    method: "POST",
    body: form,
  });

  if (!resp.ok) {
    throw Object.assign(
      new Error(`Flask API returned ${resp.status}`),
      { status: resp.status }
    );
  }

  const data = (await resp.json()) as FlaskInferResponse;

  if (!data.ok) {
    throw new Error(data.error ?? "Inference failed");
  }

  const w = data.windows?.[0];
  if (!w) throw new Error("No inference windows returned");

  return {
    status:     "ok",
    top3:       w.predictions.map((p) => ({ ...p, conf: parseFloat(p.conf) })),
    latency_us: w.latency_us ?? 0,
    spec_us:    w.spec_us,
    cnn_nj:     w.cnn_nj,
    spec_nj:    w.spec_nj,
    total_nj:   w.total_nj,
  };
}

/**
 * Query device status — used by heartbeat.ts.
 * Returns the inner device object so callers get the same shape as
 * the old serial.ts queryStatus() (e.g. { status, state, classes }).
 */
export async function queryStatus(): Promise<Record<string, unknown>> {
  const resp = await fetch(`${API_BASE}/api/status`, {
    signal: AbortSignal.timeout(6_000),
  });
  if (!resp.ok) throw new Error(`Status check failed: ${resp.status}`);

  const data = (await resp.json()) as {
    ok: boolean;
    device?: Record<string, unknown>;
    error?: string;
  };
  if (!data.ok) throw new Error(data.error ?? "Device error");

  return data.device ?? {};
}
