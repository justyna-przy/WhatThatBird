import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { GITHUB_LINKS, SITE_NAME } from "@/lib/site";

const highlights = [
  { label: "Classes", value: "51" },
  { label: "Top-1 test", value: "80.59%" },
  { label: "CNN latency", value: "3.5 ms" },
  { label: "CNN energy", value: "15.3 µJ" },
  { label: "Target", value: "MAX78002" },
];  

export default function Home() {
  return (
    <main className="bg-background text-slate-900">
      <section
        className="relative min-h-[100svh] overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #6b8dcb 0%, #375896 16%, #203a72 30%, #0a1b39 44%, #0a1b39 100%)",
        }}
      >
        <div className="relative z-30">
          <SiteNav light />
        </div>

        <div className="relative z-10 flex min-h-[calc(100svh-5.75rem)] items-start justify-center px-6 pt-[8vh] text-center md:pt-[11vh]">
          <div className="max-w-5xl text-slate-100">
            <h1 className="font-display mt-2 text-5xl leading-tight font-medium md:text-8xl">
              Introducing <span className="text-[#f4b183]">MicroBird</span>
            </h1>
            <p className="mt-4 text-[1.3rem] text-slate-200 md:text-[1.65rem]">
              Microjoule-range embedded bird-call classification on the Max78002.
            </p>
            <p className="mt-2 text-[1.3rem] text-slate-300/75 italic md:text-[1.2rem]">
              University of Limerick final year project by Justyna Przyborska
            </p>
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
              {SITE_NAME} is a complete end-to-end embedded bird-call classifier for Irish species monitoring. It
              turns short field recordings into reliable detections directly on low-power hardware.
            </p>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-700 md:text-lg">
              The deployment runs on the MAX78002 neural-network accelerator with measured CNN inference at 3.5 ms and
              15.3 µJ, while the full 3-second pipeline is about 0.69 mJ per clip.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-[#0f2c70]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-3xl text-[#0b235c]">Explore the site</h3>
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
