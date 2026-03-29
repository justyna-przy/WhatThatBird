"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Mic, MicOff, AlertCircle, Bird, Clock, Layers } from "lucide-react";
import { SiteNav } from "@/components/site-nav";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prediction {
  idx: number;
  label: string;
  common: string;
  conf: number;
}

interface InferResult {
  status: string;
  top3?: Prediction[];
  latency_us?: number;
  error?: string;
  queueDepth?: number;
}

interface HealthStatus {
  online: boolean;
  lastSeenMs: number | null;
  lastError: string | null;
  queueDepth: number;
  busy: boolean;
}

interface HistoryEntry {
  timestamp: Date;
  predictions: Prediction[];
  latencyMs: number;
}

// ─── Audio helpers ─────────────────────────────────────────────────────────────

const SAMPLE_RATE  = 16_000;
const CLIP_SAMPLES = 48_000; // 3 s at 16 kHz
const RECORD_MS    = 3_000;

/** Record RECORD_MS of mic audio and return raw int16-LE PCM at 16 kHz mono. */
async function recordAndResample(): Promise<ArrayBuffer> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

  return new Promise((resolve, reject) => {
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      try {
        const blob     = new Blob(chunks, { type: recorder.mimeType });
        const arrayBuf = await blob.arrayBuffer();
        const audioCtx = new AudioContext();
        const decoded  = await audioCtx.decodeAudioData(arrayBuf);
        await audioCtx.close();

        // Resample to 16 kHz mono using OfflineAudioContext
        const offline = new OfflineAudioContext(1, CLIP_SAMPLES, SAMPLE_RATE);
        const source  = offline.createBufferSource();
        source.buffer = decoded;
        source.connect(offline.destination);
        source.start();
        const resampled = await offline.startRendering();

        // Float32 → int16-LE
        const floats = resampled.getChannelData(0);
        const pcm    = new Int16Array(CLIP_SAMPLES);
        for (let i = 0; i < CLIP_SAMPLES; i++) {
          const clamped = Math.max(-1, Math.min(1, floats[i] ?? 0));
          pcm[i] = Math.round(clamped * 32767);
        }
        resolve(pcm.buffer);
      } catch (err) {
        reject(err);
      }
    };

    recorder.onerror = (e) => reject(e);
    recorder.start();
    setTimeout(() => recorder.stop(), RECORD_MS);
  });
}

/** Draw a waveform onto a canvas from a raw int16 PCM ArrayBuffer. */
function drawWaveform(canvas: HTMLCanvasElement, pcmBuffer: ArrayBuffer) {
  const ctx     = canvas.getContext("2d")!;
  const samples = new Int16Array(pcmBuffer);
  const { width, height } = canvas;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth   = 1;
  ctx.beginPath();

  const step = Math.floor(samples.length / width);
  for (let x = 0; x < width; x++) {
    const sample = samples[x * step] ?? 0;
    const y = (height / 2) * (1 - sample / 32768);
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// ─── Component ────────────────────────────────────────────────────────────────

type UIState = "idle" | "recording" | "sending" | "done" | "error";

export default function Home() {
  const [uiState,   setUiState]   = useState<UIState>("idle");
  const [result,    setResult]    = useState<InferResult | null>(null);
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);
  const [health,    setHealth]    = useState<HealthStatus | null>(null);
  const [history,   setHistory]   = useState<HistoryEntry[]>([]);
  const [countdown, setCountdown] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Health polling every 10 s
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) setHealth(await res.json());
      } catch { /* keep last known */ }
    }
    poll();
    const id = setInterval(poll, 10_000);
    return () => clearInterval(id);
  }, []);

  // Recording countdown ticker
  useEffect(() => {
    if (uiState === "recording") {
      let remaining = RECORD_MS / 1000;
      setCountdown(remaining);
      timerRef.current = setInterval(() => {
        remaining = Math.max(0, remaining - 0.1);
        setCountdown(remaining);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCountdown(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [uiState]);

  // Main record → resample → infer flow
  const handleRecord = useCallback(async () => {
    if (uiState === "recording" || uiState === "sending") return;
    setUiState("recording");
    setResult(null);
    setErrorMsg(null);

    let pcmBuffer: ArrayBuffer;
    try {
      pcmBuffer = await recordAndResample();
    } catch (err) {
      setErrorMsg(`Microphone error: ${err instanceof Error ? err.message : String(err)}`);
      setUiState("error");
      return;
    }

    if (canvasRef.current) drawWaveform(canvasRef.current, pcmBuffer);
    setUiState("sending");

    try {
      const res  = await fetch("/api/infer", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: pcmBuffer,
      });
      const data: InferResult = await res.json();

      if (!res.ok || data.status !== "ok") {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setResult(data);
      setUiState("done");

      if (data.top3 && data.latency_us != null) {
        setHistory((prev) =>
          [{ timestamp: new Date(), predictions: data.top3!, latencyMs: Math.round(data.latency_us! / 1000) },
           ...prev].slice(0, 5)
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setUiState("error");
    }
  }, [uiState]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const isOnline   = health?.online ?? false;
  const queueDepth = health?.queueDepth ?? 0;
  const buttonBusy = uiState === "recording" || uiState === "sending";

  const buttonLabel: Record<UIState, string> = {
    idle:      "Record 3 s",
    recording: `Recording… ${countdown.toFixed(1)} s`,
    sending:   "Analysing…",
    done:      "Record again",
    error:     "Try again",
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav className="border-b border-slate-200 bg-card/90 backdrop-blur" />
      <section className="flex flex-col items-center gap-8 px-4 py-10">

      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <Bird className="w-8 h-8 text-green-500" />
          <h1 className="text-3xl font-bold tracking-tight">WhatThatBird</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-md">
          On-device Irish bird call classifier running on a MAX78002 neural-network
          accelerator. Record 3 seconds of audio and let the chip identify the species.
        </p>
      </div>

      {/* Device status bar */}
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${
            isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"
          }`} />
          {isOnline ? "Device online" : "Device offline"}
        </span>
        <Separator orientation="vertical" className="h-4" />
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          Queue: {queueDepth}
        </span>
        {health?.busy && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="secondary" className="text-xs">Busy</Badge>
          </>
        )}
      </div>

      {/* Record button + progress */}
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <Button
          size="lg"
          className="w-full text-base gap-2"
          onClick={handleRecord}
          disabled={buttonBusy || !isOnline}
        >
          {uiState === "recording" ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          {buttonLabel[uiState]}
        </Button>

        {uiState === "recording" && (
          <Progress
            value={((RECORD_MS / 1000 - countdown) / (RECORD_MS / 1000)) * 100}
            className="w-full h-2"
          />
        )}

        {!isOnline && (
          <p className="text-xs text-muted-foreground text-center">
            The MAX78002 must be connected and the Next.js server running locally.
          </p>
        )}
      </div>

      {/* Waveform */}
      <canvas
        ref={canvasRef}
        width={640}
        height={80}
        className="w-full max-w-2xl rounded-lg border border-border bg-[#0a0a0a]"
      />

      {/* Error */}
      {uiState === "error" && errorMsg && (
        <Alert variant="destructive" className="max-w-lg w-full">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Prediction results */}
      {result?.top3 && (
        <Card className="w-full max-w-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Top predictions</span>
              {result.latency_us != null && (
                <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {Math.round(result.latency_us / 1000)} ms
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {result.top3.map((p, i) => (
              <div key={p.idx} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm w-4">{i + 1}.</span>
                    <div>
                      <p className="font-medium leading-tight">{p.common}</p>
                      <p className="text-xs text-muted-foreground italic">{p.label.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <Badge variant={i === 0 ? "default" : "secondary"} className="ml-2 shrink-0">
                    {p.conf.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={p.conf} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Prediction history */}
      {history.length > 0 && (
        <Card className="w-full max-w-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent predictions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {history.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs w-16">
                    {entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span className="font-medium">{entry.predictions[0].common}</span>
                  <span className="text-muted-foreground italic text-xs hidden sm:inline">
                    {entry.predictions[0].label.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">{entry.predictions[0].conf.toFixed(1)}%</Badge>
                  <span className="text-muted-foreground text-xs flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />{entry.latencyMs} ms
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      </section>
    </main>
  );
}
