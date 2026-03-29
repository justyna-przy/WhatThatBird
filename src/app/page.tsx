import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { GITHUB_LINKS, SITE_NAME } from "@/lib/site";

const highlights = [
  { label: "Classes", value: "50" },
  { label: "Inference", value: "40-80 ms" },
  { label: "Target", value: "MAX78002" },
  { label: "Memory", value: "1 MB SRAM" },
];  

export default function Home() {
  return (
    <main className="bg-background text-slate-900">
      <section
        className="relative min-h-[100svh] overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #5576b5 0%, #24447f 16%, #132753 30%, #0a1b39 44%, #0a1b39 100%)",
        }}
      >
        <div className="relative z-30">
          <SiteNav light />
        </div>

        <div className="relative z-10 flex min-h-[calc(100svh-5.75rem)] items-center justify-center px-6 pb-36 pt-10 text-center">
          <div className="max-w-4xl text-slate-100">
            <p className="font-display text-3xl font-semibold tracking-wide md:text-5xl">
              Low power and embedded
            </p>
            <h1 className="font-display mt-2 text-5xl leading-tight font-semibold md:text-8xl">
              Bird-call Classification
            </h1>
            <p className="mt-4 text-base text-slate-200 md:text-xl">
              University of Limerick final year project
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/trial"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#082969] transition-colors hover:bg-slate-200"
              >
                Try the model
              </Link>
              <Link
                href="/report"
                className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Read the report
              </Link>
              <a
                href={GITHUB_LINKS.webApp}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/50 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>

        <Image
          src="/birdies.png"
          alt="Bird species collage used in the project hero"
          fill
          priority
          className="pointer-events-none absolute inset-0 z-20 object-cover object-bottom"
        />
      </section>

      <section id="about" className="px-6 py-20 md:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-[1.6fr_1fr] md:gap-14">
          <div>
            <h2 className="font-display text-4xl leading-tight text-[#0b235c] md:text-5xl">
              What this project is about
            </h2>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-700 md:text-lg">
              {SITE_NAME} listens to short bird recordings and identifies the most likely species on a low-power
              embedded chip. The goal is to make biodiversity monitoring cheaper, more scalable, and practical in
              places where cloud processing is not reliable.
            </p>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-700 md:text-lg">
              Instead of sending audio to a server, inference runs on-device using the MAX78002 neural-network
              accelerator. That keeps latency low and power use small while still giving a useful top-3 prediction.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-[#0f2c70]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="font-display text-3xl text-[#0b235c]">Explore the site</h3>
            <div className="mt-5 space-y-3">
              <Link href="/trial" className="group flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 hover:bg-slate-100">
                <span className="font-medium">Live trial</span>
                <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-slate-800" />
              </Link>
              <Link href="/demo" className="group flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 hover:bg-slate-100">
                <span className="font-medium">Demo video</span>
                <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-slate-800" />
              </Link>
              <Link href="/project" className="group flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 hover:bg-slate-100">
                <span className="font-medium">Project story</span>
                <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-slate-800" />
              </Link>
              <Link href="/about" className="group flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 hover:bg-slate-100">
                <span className="font-medium">Method and architecture</span>
                <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-slate-800" />
              </Link>
              <Link href="/report" className="group flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 hover:bg-slate-100">
                <span className="font-medium">Paper and abstract</span>
                <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-slate-800" />
              </Link>
              <a
                href={GITHUB_LINKS.webApp}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 hover:bg-slate-100"
              >
                <span className="font-medium">GitHub repository</span>
                <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-slate-800" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
