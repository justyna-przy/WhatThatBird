import { access } from "node:fs/promises";
import path from "node:path";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { SiteNav } from "@/components/site-nav";

const pipeline = ["Microphone", "I2S", "DMA", "Spectrogram", "CNN Accelerator", "UART", "Web App"];
const PROFILE_CANDIDATES = ["me_and_gandalf.jpg", "profile.jpg", "profile.jpeg", "profile.png"];

async function resolveProfilePhotoSrc() {
  for (const fileName of PROFILE_CANDIDATES) {
    try {
      await access(path.join(process.cwd(), "public", fileName));
      return `/${fileName}`;
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

export default async function AboutPage() {
  const photoSrc = await resolveProfilePhotoSrc();

  return (
    <main className="min-h-screen bg-background text-slate-900">
      <SiteNav className="border-b border-slate-200 bg-card/90 backdrop-blur" />

      <section className="mx-auto w-full max-w-6xl px-6 py-12 md:px-8">
        <p className="text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">About</p>
        <h1 className="mt-3 text-4xl text-[#0b235c] md:text-6xl">Project Story</h1>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="relative overflow-hidden rounded-3xl border border-[#bcd0f3] bg-gradient-to-br from-[#f7fbff] via-white to-[#eef4ff] p-8">
            <h2 className="font-nav-lora relative mt-3 text-3xl leading-tight text-[#0b235c] md:text-4xl">
              My FYP was about proving that edge AI can be practical, not just theoretical.
            </h2>
            <p className="relative mt-5 max-w-3xl text-base leading-relaxed text-slate-700 md:text-lg">
              I wanted a project that combined embedded systems, machine learning, and product thinking in one full
              build. Bird-call classification gave me exactly that challenge, because it requires strong model
              performance but also careful hardware, energy, and deployment decisions.
            </p>
            <p className="relative mt-4 max-w-3xl text-base leading-relaxed text-slate-700 md:text-lg">
              Instead of stopping at model training, I focused on the end-to-end pipeline: capture a short clip, run
              inference on MAX78002, and return understandable predictions through a web interface.
            </p>
          </article>

          <aside className="font-nav-lora rounded-3xl border border-slate-200 bg-card p-6 shadow-sm">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-slate-200">
              {photoSrc ? (
                <Image
                  src={photoSrc}
                  alt="Justyna Przyborska"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 30vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-4xl font-semibold text-slate-500">
                  JP
                </div>
              )}
            </div>

            <p className="mt-4 text-xl font-semibold text-[#0a1b39]">Justyna Przyborska</p>
            <p className="mt-1 text-sm text-slate-600">Immersive Software Engineering student, University of Limerick</p>

            <a
              href="https://justyna.ie"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b235c] underline decoration-slate-300 underline-offset-4 transition-colors hover:text-[#143a93]"
            >
              justyna.ie
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </aside>
        </div>
      </section>
    </main>
  );
}
