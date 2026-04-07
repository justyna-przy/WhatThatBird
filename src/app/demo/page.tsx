"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Clock, Mic, MicOff } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const SAMPLE_RATE = 16_000;
const MAX_AUDIO_SECONDS = 3;
const MAX_RECORD_MS = MAX_AUDIO_SECONDS * 1000;
const WINDOW_SECONDS = 3;
const FFT_SIZE = 512;
const SPECTROGRAM_BINS = 96;

const hannWindow = new Float32Array(FFT_SIZE);
for (let i = 0; i < FFT_SIZE; i++) {
  hannWindow[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
}

const trigTables = (() => {
  const cosTable = Array.from({ length: SPECTROGRAM_BINS }, () => new Float32Array(FFT_SIZE));
  const sinTable = Array.from({ length: SPECTROGRAM_BINS }, () => new Float32Array(FFT_SIZE));

  for (let k = 0; k < SPECTROGRAM_BINS; k++) {
    for (let n = 0; n < FFT_SIZE; n++) {
      const phase = (2 * Math.PI * k * n) / FFT_SIZE;
      cosTable[k][n] = Math.cos(phase);
      sinTable[k][n] = Math.sin(phase);
    }
  }

  return { cosTable, sinTable };
})();

type UIState = "idle" | "preparing" | "recording" | "ready" | "inferencing" | "error";

interface Prediction {
  idx: number;
  label: string;
  common: string;
  conf: number;
}

interface InferWindow {
  window_index: number;
  start_s: number;
  end_s: number;
  predictions: Prediction[];
  latency_us?: number;
  spec_us?: number;
  cnn_nj?: number;
  spec_nj?: number;
  total_nj?: number;
}

interface InferResponse {
  ok?: boolean;
  windows?: InferWindow[];
  error?: string;
}

interface HealthStatus {
  online: boolean;
  lastSeenMs: number | null;
  lastError: string | null;
}

interface SpectrogramData {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  durationSec: number;
}

interface PreparedClip {
  fileName: string;
  durationSec: number;
  originalDurationSec: number;
  sampleRate: number;
  samples: Float32Array;
  wavBlob: Blob;
  spectrogram: SpectrogramData;
  wasTrimmed: boolean;
}

interface StubClass {
  idx: number;
  label: string;
  common: string;
  profile: [number, number, number];
}

const STUB_CLASSES: StubClass[] = [
  { idx: 31, label: "non_bird", common: "Background", profile: [0.08, 0.14, 0.12] },
  { idx: 10, label: "coloeus_monedula", common: "Jackdaw", profile: [0.48, 0.36, 0.43] },
  { idx: 13, label: "corvus_corax", common: "Common Raven", profile: [0.52, 0.28, 0.33] },
  { idx: 14, label: "corvus_cornix", common: "Hooded Crow", profile: [0.55, 0.31, 0.4] },
  { idx: 5, label: "apus_apus", common: "Swift", profile: [0.36, 0.62, 0.7] },
  { idx: 1, label: "acrocephalus_schoenobaenus", common: "Sedge Warbler", profile: [0.42, 0.56, 0.62] },
  { idx: 47, label: "troglodytes_troglodytes", common: "Wren", profile: [0.3, 0.67, 0.74] },
  { idx: 48, label: "turdus_merula", common: "Blackbird", profile: [0.46, 0.4, 0.5] },
  { idx: 50, label: "tyto_alba", common: "Barn Owl", profile: [0.23, 0.52, 0.59] },
];

function formatLabel(prediction: Prediction): string {
  const text = prediction.common || prediction.label;
  return text
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function encodeMono16BitWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  const dataBytes = samples.length * 2;
  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(44 + i * 2, Math.round(int16), true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function formatTrimNotice(originalDurationSec: number): string {
  return `Input was ${originalDurationSec.toFixed(1)}s and was trimmed to ${MAX_AUDIO_SECONDS}s for this trial view.`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function extractWindowFeatures(samples: Float32Array): [number, number, number] {
  const n = Math.max(1, samples.length);
  let sumSq = 0;
  let zc = 0;
  let diffSum = 0;
  let prev = samples[0] ?? 0;

  for (let i = 0; i < n; i++) {
    const value = samples[i] ?? 0;
    sumSq += value * value;
    if ((prev >= 0 && value < 0) || (prev < 0 && value >= 0)) {
      zc += 1;
    }
    if (i > 0) {
      diffSum += Math.abs(value - prev);
    }
    prev = value;
  }

  const rms = Math.sqrt(sumSq / n);
  const energy = clamp01(rms * 6.2);
  const texture = clamp01((zc / n) * 9);
  const brightness = clamp01((diffSum / n) * 7.5);
  return [energy, texture, brightness];
}

function scoreStubClass(
  classProfile: StubClass,
  features: [number, number, number],
  windowIndex: number
): number {
  const [energy, texture, brightness] = features;
  const [targetEnergy, targetTexture, targetBrightness] = classProfile.profile;

  const distance =
    Math.abs(energy - targetEnergy) * 0.9 +
    Math.abs(texture - targetTexture) * 0.75 +
    Math.abs(brightness - targetBrightness) * 0.7;

  let score = 1.35 - distance;
  const noise = seededNoise(windowIndex * 31 + classProfile.idx * 7);
  score += (noise - 0.5) * 0.14;

  if (classProfile.label === "non_bird") {
    if (energy < 0.18) score += 0.35;
    if (energy > 0.36) score -= 0.12;
  }

  return Math.max(0.04, score);
}

function buildStubWindows(clip: PreparedClip): InferWindow[] {
  const windowsCount = Math.max(1, Math.ceil(clip.durationSec / WINDOW_SECONDS));
  const windows: InferWindow[] = [];

  for (let i = 0; i < windowsCount; i++) {
    const start_s = i * WINDOW_SECONDS;
    const end_s = Math.min(clip.durationSec, start_s + WINDOW_SECONDS);
    const startSample = Math.floor(start_s * SAMPLE_RATE);
    const endSample = Math.max(startSample + 1, Math.floor(end_s * SAMPLE_RATE));
    const windowSamples = clip.samples.slice(startSample, endSample);
    const features = extractWindowFeatures(windowSamples);

    const ranked = STUB_CLASSES
      .map((cls) => ({
        cls,
        score: scoreStubClass(cls, features, i + 1),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const scoreSum = ranked.reduce((sum, row) => sum + row.score, 0);
    const predictions: Prediction[] = ranked.map((row) => ({
      idx: row.cls.idx,
      label: row.cls.label,
      common: row.cls.common,
      conf: Number(((row.score / scoreSum) * 100).toFixed(1)),
    }));

    const perfSeed = i + 1;
    const latency_us = Math.round(3000 + seededNoise(perfSeed * 11) * 1100);
    const spec_us = Math.round(64000 + seededNoise(perfSeed * 17) * 9000);
    const cnn_nj = Math.round(14000 + seededNoise(perfSeed * 23) * 2800);
    const total_nj = Math.round(660000 + seededNoise(perfSeed * 29) * 90000);

    windows.push({
      window_index: i,
      start_s,
      end_s,
      predictions,
      latency_us,
      spec_us,
      cnn_nj,
      total_nj,
    });
  }

  return windows;
}

async function decodeTrimAndResample(
  audioBlob: Blob,
  options?: { rejectIfLong?: boolean }
): Promise<{ samples: Float32Array; originalDurationSec: number; wasTrimmed: boolean }> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const context = new AudioContext();

  try {
    const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
    const originalDurationSec = decoded.duration;
    const isLongerThanLimit = originalDurationSec > MAX_AUDIO_SECONDS + 0.001;
    if (options?.rejectIfLong && isLongerThanLimit) {
      throw new Error(
        `Clip is ${originalDurationSec.toFixed(1)}s. Please upload audio that is ${MAX_AUDIO_SECONDS}s or shorter.`
      );
    }
    const targetDurationSec = Math.min(originalDurationSec, MAX_AUDIO_SECONDS);
    const targetLength = Math.max(1, Math.floor(targetDurationSec * SAMPLE_RATE));

    const offline = new OfflineAudioContext(1, targetLength, SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0, 0, targetDurationSec);
    const rendered = await offline.startRendering();

    const mono = rendered.getChannelData(0);
    const samples = new Float32Array(mono.length);
    samples.set(mono);

    return {
      samples,
      originalDurationSec,
      wasTrimmed: isLongerThanLimit,
    };
  } finally {
    await context.close();
  }
}

function samplePalette(t: number): [number, number, number] {
  const stops = [
    { t: 0.0, c: [8, 27, 57] as [number, number, number] },
    { t: 0.35, c: [37, 89, 164] as [number, number, number] },
    { t: 0.72, c: [114, 182, 238] as [number, number, number] },
    { t: 1.0, c: [244, 177, 131] as [number, number, number] },
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.t && t <= b.t) {
      const ratio = (t - a.t) / (b.t - a.t);
      return [
        Math.round(a.c[0] + (b.c[0] - a.c[0]) * ratio),
        Math.round(a.c[1] + (b.c[1] - a.c[1]) * ratio),
        Math.round(a.c[2] + (b.c[2] - a.c[2]) * ratio),
      ];
    }
  }

  return stops[stops.length - 1].c;
}

function buildSpectrogram(samples: Float32Array): SpectrogramData {
  const durationSec = samples.length / SAMPLE_RATE;
  const width = Math.max(180, Math.min(420, Math.round(durationSec * 32)));
  const height = SPECTROGRAM_BINS;
  const magnitudes = new Float32Array(width * height);

  let minLog = Number.POSITIVE_INFINITY;
  let maxLog = Number.NEGATIVE_INFINITY;

  for (let x = 0; x < width; x++) {
    const center = Math.floor(((x + 0.5) * samples.length) / width);
    const start = center - FFT_SIZE / 2;

    for (let k = 0; k < height; k++) {
      let real = 0;
      let imag = 0;
      const cosRow = trigTables.cosTable[k];
      const sinRow = trigTables.sinTable[k];

      for (let n = 0; n < FFT_SIZE; n++) {
        const sampleIdx = start + n;
        const sample = sampleIdx >= 0 && sampleIdx < samples.length ? samples[sampleIdx] : 0;
        const value = sample * hannWindow[n];
        real += value * cosRow[n];
        imag -= value * sinRow[n];
      }

      const magnitude = Math.sqrt(real * real + imag * imag);
      const logMag = Math.log10(magnitude + 1e-7);
      magnitudes[k * width + x] = logMag;
      if (logMag < minLog) minLog = logMag;
      if (logMag > maxLog) maxLog = logMag;
    }
  }

  const range = Math.max(1e-6, maxLog - minLog);
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    const srcBin = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const value = magnitudes[srcBin * width + x];
      const normalized = Math.max(0, Math.min(1, (value - minLog) / range));
      const boosted = Math.pow(normalized, 0.75);
      const [r, g, b] = samplePalette(boosted);
      const idx = (y * width + x) * 4;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    }
  }

  return { width, height, pixels, durationSec };
}

function drawSpectrogramCanvas(canvas: HTMLCanvasElement, spectrogram: SpectrogramData) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const offscreen = document.createElement("canvas");
  offscreen.width = spectrogram.width;
  offscreen.height = spectrogram.height;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;

  const imagePixels = Uint8ClampedArray.from(spectrogram.pixels);
  offCtx.putImageData(
    new ImageData(imagePixels, spectrogram.width, spectrogram.height),
    0,
    0
  );

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
}

export default function TrialPage() {
  const [uiState, setUiState] = useState<UIState>("idle");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [clip, setClip] = useState<PreparedClip | null>(null);
  const [windows, setWindows] = useState<InferWindow[]>([]);
  const [isStubResult, setIsStubResult] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [recordingMs, setRecordingMs] = useState(0);
  const [inferProgress, setInferProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inferTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOnline = health?.online ?? false;
  const selectedWindow = windows[0] ?? null;

  const predictionSummary = useMemo(() => {
    if (!selectedWindow) return "Top predictions will appear here after classification.";
    const topBird = selectedWindow.predictions.find((prediction) => prediction.label !== "non_bird");
    const topPrediction = topBird ?? selectedWindow.predictions[0];
    if (!topPrediction) return "Top predictions will appear here after classification.";
    return `${formatLabel(topPrediction)} (${topPrediction.conf.toFixed(1)}%)`;
  }, [selectedWindow]);

  const clearTimers = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (inferTimerRef.current) {
      clearInterval(inferTimerRef.current);
      inferTimerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      mediaRecorderRef.current = null;
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [clearTimers]);

  useEffect(() => {
    async function pollHealth() {
      try {
        const response = await fetch("/api/health");
        if (response.ok) {
          setHealth((await response.json()) as HealthStatus);
        }
      } catch {
        // Keep last state.
      }
    }

    pollHealth();
    const id = setInterval(pollHealth, 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!clip || !canvasRef.current) return;
    drawSpectrogramCanvas(canvasRef.current, clip.spectrogram);
  }, [clip]);

  const prepareClip = useCallback(async (blob: Blob, name: string, rejectIfLong = false) => {
    setUiState("preparing");
    setErrorMsg(null);
    setNoticeMsg(null);
    setWindows([]);
    setIsStubResult(false);

    try {
      const { samples, originalDurationSec, wasTrimmed } = await decodeTrimAndResample(blob, { rejectIfLong });
      const spectrogram = buildSpectrogram(samples);
      const wavBlob = encodeMono16BitWav(samples, SAMPLE_RATE);

      setClip({
        fileName: name,
        durationSec: samples.length / SAMPLE_RATE,
        originalDurationSec,
        sampleRate: SAMPLE_RATE,
        samples,
        wavBlob,
        spectrogram,
        wasTrimmed,
      });

      if (wasTrimmed) {
        setNoticeMsg(formatTrimNotice(originalDurationSec));
      }

      setUiState("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to decode this audio file.");
      setUiState("error");
    }
  }, []);

  const handleUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await prepareClip(file, file.name, true);
      event.target.value = "";
    },
    [prepareClip]
  );

  const startRecording = useCallback(async () => {
    if (isRecording || uiState === "inferencing" || uiState === "preparing") return;

    try {
      setErrorMsg(null);
      setNoticeMsg(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
      recordingChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setUiState("recording");
      setRecordingMs(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setErrorMsg("Recording failed. Please check microphone permissions and try again.");
        setIsRecording(false);
        setUiState("error");
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        setRecordingMs(0);

        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        if (recordingChunksRef.current.length === 0) {
          setErrorMsg("No audio was captured.");
          setUiState("error");
          return;
        }

        const mimeType = recorder.mimeType || "audio/webm";
        const recordingBlob = new Blob(recordingChunksRef.current, { type: mimeType });
        await prepareClip(recordingBlob, "recording.webm");
      };

      recorder.start();
      const startedAt = performance.now();
      recordTimerRef.current = setInterval(() => {
        const elapsed = performance.now() - startedAt;
        setRecordingMs(Math.min(elapsed, MAX_RECORD_MS));
        if (elapsed >= MAX_RECORD_MS) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to start recording.");
      setUiState("error");
      setIsRecording(false);
    }
  }, [isRecording, prepareClip, stopRecording, uiState]);

  const runInference = useCallback(async () => {
    if (!clip || uiState === "inferencing" || uiState === "preparing") return;
    const baseNotice = clip.wasTrimmed ? formatTrimNotice(clip.originalDurationSec) : null;
    const setSimulatedResult = (reason: string) => {
      const simulatedWindows = buildStubWindows(clip);
      setWindows(simulatedWindows);
      setIsStubResult(true);
      setErrorMsg(null);
      setNoticeMsg(baseNotice ? `${baseNotice} ${reason}` : reason);
      setInferProgress(100);
      setUiState("ready");
      setTimeout(() => setInferProgress(0), 250);
    };

    if (!isOnline) {
      setSimulatedResult("Device is offline, so these predictions are simulated for preview.");
      return;
    }

    setErrorMsg(null);
    setUiState("inferencing");
    setInferProgress(8);

    inferTimerRef.current = setInterval(() => {
      setInferProgress((prev) => Math.min(prev + 6, 93));
    }, 150);

    try {
      const payload = new FormData();
      payload.append("audio", clip.wavBlob, `${clip.fileName.replace(/\.[^.]+$/, "") || "clip"}_3s.wav`);

      const response = await fetch("/api/infer", {
        method: "POST",
        body: payload,
      });
      const data = (await response.json()) as InferResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${response.status}`);
      }

      const nextWindows = data.windows ?? [];
      if (nextWindows.length === 0) {
        setSimulatedResult("The API returned no predictions, so these predictions are simulated for preview.");
        return;
      }

      setWindows(nextWindows);
      setIsStubResult(false);
      setNoticeMsg(baseNotice);
      setInferProgress(100);
      setUiState("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Inference request failed.";
      setSimulatedResult(`API unavailable (${message}). Showing simulated predictions for preview.`);
    } finally {
      if (inferTimerRef.current) {
        clearInterval(inferTimerRef.current);
        inferTimerRef.current = null;
      }
      setTimeout(() => setInferProgress(0), 250);
    }
  }, [clip, isOnline, uiState]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav className="border-b border-slate-200 bg-card/90 backdrop-blur" />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-8">
        <header className="space-y-2">
          <p className="text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">Demo</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl text-[#0b235c] md:text-5xl">Run Inference On Your Audio</h1>
            <Badge
              variant="secondary"
              className={cn(
                "inline-flex h-12 items-center gap-2 rounded-full border px-5 text-lg font-medium md:h-[3.5rem]",
                isOnline
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              )}
            >
              <span
                className={cn("inline-block h-3 w-3 rounded-full", isOnline ? "bg-emerald-500" : "bg-rose-500")}
              />
              {isOnline ? "Device online" : "Device offline"}
            </Badge>
          </div>
        </header>

        <div className="grid gap-6">
          <Card className="rounded-2xl ring-1 ring-[#afc4ea]">
            <CardHeader>
              <CardTitle className="font-nav-lora text-[#0b235c]">Audio Input</CardTitle>
               <CardDescription>Upload or record up to 3 seconds of audio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleUpload}
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="border-[#8fabdf] bg-white/80 text-[#0a1b39] hover:bg-[#e7eefc]"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uiState === "preparing" || uiState === "inferencing" || isRecording}
                >
                  Upload Audio
                </Button>

                {!isRecording ? (
                  <Button
                    variant="outline"
                    className="border-[#8fabdf] bg-white/80 text-[#0a1b39] hover:bg-[#e7eefc]"
                    onClick={startRecording}
                    disabled={uiState === "preparing" || uiState === "inferencing"}
                  >
                    <Mic className="h-4 w-4" />
                    Record {MAX_AUDIO_SECONDS}s
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="border-[#efb7aa] bg-white/80 text-[#8f2a1a] hover:bg-[#ffe9e5]"
                    onClick={stopRecording}
                  >
                    <MicOff className="h-4 w-4" />
                    Stop Recording
                  </Button>
                )}

                <Button
                  className="bg-[#0a1b39] text-white hover:bg-[#18366f]"
                  onClick={runInference}
                  disabled={!clip || uiState === "preparing" || uiState === "inferencing" || isRecording || !isOnline}
                >
                  Run Inference
                </Button>
              </div>

              {isRecording && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span>Recording...</span>
                    <span>{(recordingMs / 1000).toFixed(1)}s / {MAX_AUDIO_SECONDS}s</span>
                  </div>
                  <Progress value={(recordingMs / MAX_RECORD_MS) * 100} className="h-2" />
                </div>
              )}

              {uiState === "inferencing" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span>Classifying clip...</span>
                    <span>{Math.round(inferProgress)}%</span>
                  </div>
                  <Progress value={inferProgress} className="h-2" />
                </div>
              )}

              {clip && (
                <div className="grid gap-3 rounded-xl border border-[#afc4ea] bg-[#f4f8ff] p-3 text-sm text-slate-700 sm:grid-cols-3">
                  <div>
                    <p className="text-xs tracking-wide text-slate-500 uppercase">Clip</p>
                    <p className="font-medium">{clip.fileName}</p>
                  </div>
                  <div>
                    <p className="text-xs tracking-wide text-slate-500 uppercase">Duration</p>
                    <p className="font-medium">{clip.durationSec.toFixed(2)} s</p>
                  </div>
                  <div>
                    <p className="text-xs tracking-wide text-slate-500 uppercase">Inference Mode</p>
                    <p className="font-medium">Single clip</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {noticeMsg && (
          <Alert className="border-[#f0caa8] bg-[#fff4ea] text-[#6f4a2b]">
            <AlertDescription>{noticeMsg}</AlertDescription>
          </Alert>
        )}

        <Card className="rounded-2xl ring-1 ring-[#afc4ea]">
          <CardHeader>
            <CardTitle className="font-nav-lora text-[#0b235c]">Spectrogram Preview</CardTitle>
            <CardDescription>Visualization of the uploaded clip.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-hidden rounded-xl border-2 border-[#8fabdf] bg-[#091a3a]">
              <canvas ref={canvasRef} width={960} height={260} className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl ring-1 ring-[#afc4ea]">
          <CardHeader>
            <CardTitle className="font-nav-lora flex items-center gap-2 text-[#0b235c]">
              Predictions
              {isStubResult && (
                <Badge variant="secondary" className="bg-[#fff4ea] text-[#7b4f2c] ring-1 ring-[#f0caa8]">
                  Simulated
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{predictionSummary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {windows.length === 0 ? (
              <p className="text-sm text-slate-600">
                Run inference to populate predictions.
              </p>
            ) : (
              selectedWindow && (
                <div className="rounded-xl border border-[#afc4ea] bg-[#f4f8ff] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[#0b235c]">
                      Analyzed clip ({selectedWindow.end_s.toFixed(1)}s)
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      {selectedWindow.latency_us != null && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {(selectedWindow.latency_us / 1000).toFixed(1)} ms CNN
                        </span>
                      )}
                      {selectedWindow.total_nj != null && (
                        <span>{(selectedWindow.total_nj / 1_000_000).toFixed(3)} mJ total</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedWindow.predictions.map((prediction, rank) => {
                      const confidence = Math.max(0, Math.min(100, prediction.conf));
                      return (
                        <div key={`${prediction.idx}-${rank}`}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <p className="font-medium text-slate-800">
                              {rank + 1}. {formatLabel(prediction)}
                            </p>
                            <p className="text-slate-600">{confidence.toFixed(1)}%</p>
                          </div>
                          <div className="h-2 rounded-full bg-white ring-1 ring-[#d4e1f9]">
                            <div
                              className="h-full rounded-full bg-[#2f63d9]"
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
