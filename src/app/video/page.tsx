import { access } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

async function hasDemoVideo() {
  try {
    await access(path.join(process.cwd(), "public", "demo.mp4"));
    return true;
  } catch {
    return false;
  }
}

export default async function DemoPage() {
  const videoReady = await hasDemoVideo();

  return (
    <main className="min-h-screen bg-background text-slate-900">
      <SiteNav className="border-b border-slate-200 bg-card/90 backdrop-blur" />

      <section className="mx-auto w-full max-w-6xl px-6 py-12 md:px-8">
        <p className="text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">Demo</p>
        <h1 className="mt-3 text-4xl text-[#0b235c] md:text-6xl">Live Demo Video</h1>
        <p className="mt-4 max-w-3xl text-slate-700 md:text-lg">
          This walkthrough shows the MicroBird pipeline from recording to top predictions on MAX78002, including the
          on-device spectrogram path and low-energy CNN inference.
        </p>

        <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-lg">
          {videoReady ? (
            <video className="aspect-video w-full" controls preload="metadata" poster="/birdies.png">
              <source src="/demo.mp4" type="video/mp4" />
              Your browser does not support video playback.
            </video>
          ) : (
            <div className="flex aspect-video items-center justify-center px-8 text-center text-slate-200">
              <div>
                <p className="text-xl font-medium">Demo video not added yet</p>
                <p className="mt-3 text-sm text-slate-400">
                  Add <code className="rounded bg-slate-800 px-1.5 py-0.5">public/demo.mp4</code> and this page will
                  play it automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
