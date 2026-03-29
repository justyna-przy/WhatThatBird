import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export default function ProjectPage() {
  return (
    <main className="min-h-screen bg-background text-slate-900">
      <SiteNav className="border-b border-slate-200 bg-card/90 backdrop-blur" />

      <section className="mx-auto w-full max-w-3xl px-6 py-16 text-center md:px-8">
        <p className="text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">Project story</p>
        <h1 className="mt-3 text-4xl text-[#0b235c] md:text-6xl">Moved to the landing page</h1>
        <p className="mt-6 text-slate-700 md:text-lg">
          The full project overview now lives on the home page under{" "}
          <span className="font-semibold">What this project is about</span>.
        </p>
        <div className="mt-8">
          <Link
            href="/#about"
            className="rounded-full bg-[#0f2c70] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#143a93]"
          >
            Go to project overview
          </Link>
        </div>
      </section>
    </main>
  );
}
