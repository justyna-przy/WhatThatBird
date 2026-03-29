import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export default function ProjectPage() {
  return (
    <main className="min-h-screen bg-background text-slate-900">
      <SiteNav className="border-b border-slate-200 bg-card/90 backdrop-blur" />

      <section className="mx-auto w-full max-w-5xl px-6 py-12 md:px-8">
        <p className="text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">Project story</p>
        <h1 className="font-display mt-3 text-4xl text-[#0b235c] md:text-6xl">WhatThatBird in plain English</h1>
        <p className="mt-6 text-slate-700 md:text-lg">
          Bird monitoring is important, but listening manually to hours of recordings is slow and expensive. This
          project is about making identification instant: record a short clip, run a compact model on hardware, and
          get likely species names in under a second.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <article className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-display text-2xl text-[#0b235c]">The problem</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Biodiversity teams need more frequent monitoring, but current workflows often rely on manual labeling and
              cloud-heavy pipelines.
            </p>
          </article>
          <article className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-display text-2xl text-[#0b235c]">The approach</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Convert audio to spectrogram features and run a quantized CNN directly on a low-power accelerator so the
              system can work offline in the field.
            </p>
          </article>
          <article className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-display text-2xl text-[#0b235c]">The impact</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Faster feedback during surveys, lower operating cost, and a path to wider acoustic monitoring without
              always depending on cloud infrastructure.
            </p>
          </article>
        </div>

        <div className="mt-10 rounded-3xl bg-card p-7 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-display text-3xl text-[#0b235c]">Try it now</h2>
          <p className="mt-3 text-slate-700">
            Use the trial page to record 3 seconds of audio and run the on-device model, then compare with the demo
            and report pages for deeper details.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/trial"
              className="rounded-full bg-[#0f2c70] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#143a93]"
            >
              Open trial
            </Link>
            <Link
              href="/demo"
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            >
              Watch demo
            </Link>
            <Link
              href="/report"
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            >
              Read report
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
