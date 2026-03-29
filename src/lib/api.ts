/**
 * api.ts — HTTP client for the BirdSpec Windows Flask API.
 *
 * The MAX78002 is connected to a Windows machine running birdspec_api.py;
 * this module talks to that server over HTTP.
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
  const numChannels = 1;
  const sampleRate = 16_000;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBytes.length;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
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
  conf: string | number;
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

export interface InferPrediction {
  idx: number;
  label: string;
  common: string;
  conf: number;
}

export interface InferWindow {
  window_index: number;
  start_s: number;
  end_s: number;
  predictions: InferPrediction[];
  latency_us?: number;
  spec_us?: number;
  cnn_nj?: number;
  spec_nj?: number;
  total_nj?: number;
}

export interface InferResponse {
  ok: boolean;
  windows: InferWindow[];
}

function normalizeInferResponse(data: FlaskInferResponse): InferResponse {
  return {
    ok: true,
    windows: (data.windows ?? []).map((w) => ({
      window_index: w.window_index,
      start_s: w.start_s,
      end_s: w.end_s,
      predictions: (w.predictions ?? []).map((p) => ({
        idx: p.idx,
        label: p.label,
        common: p.common,
        conf: (() => {
          const parsed =
            typeof p.conf === "number"
              ? p.conf
              : Number.parseFloat(p.conf);
          return Number.isFinite(parsed) ? parsed : 0;
        })(),
      })),
      latency_us: w.latency_us,
      spec_us: w.spec_us,
      cnn_nj: w.cnn_nj,
      spec_nj: w.spec_nj,
      total_nj: w.total_nj,
    })),
  };
}

/**
 * Send an audio blob (e.g. WAV/WebM) to Flask and return all window results.
 */
export async function inferAudioBlob(
  audioBuffer: Buffer,
  options?: {
    filename?: string;
    mimeType?: string;
    topK?: number;
  }
): Promise<InferResponse> {
  const filename = options?.filename ?? "clip.wav";
  const mimeType = options?.mimeType ?? "audio/wav";
  const topK = options?.topK ?? 3;

  const form = new FormData();
  form.append("audio", new Blob([audioBuffer], { type: mimeType }), filename);

  const resp = await fetch(`${API_BASE}/api/infer?top=${topK}&metrics=1`, {
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

  return normalizeInferResponse(data);
}

/**
 * Backward-compatible helper for clients that still send raw int16 PCM.
 */
export async function inferRawPcm(
  pcmBuffer: Buffer
): Promise<InferResponse> {
  const wav = wrapInWav(pcmBuffer);
  return inferAudioBlob(wav, {
    filename: "clip.wav",
    mimeType: "audio/wav",
  });
}

/**
 * Query device status — used by heartbeat.ts.
 * Returns the inner device object (e.g. { status, state, classes }).
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
