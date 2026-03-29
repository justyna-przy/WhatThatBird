import { access } from "node:fs/promises";
import path from "node:path";
import Image from "next/image";
import { SiteNav } from "@/components/site-nav";

const pipeline = ["Microphone", "I2S", "DMA", "Spectrogram", "CNN Accelerator", "UART", "Web App"];

async function hasProfilePhoto() {
  try {
    await access(path.join(process.cwd(), "public", "profile.jpg"));
    return true;
  } catch {
    return false;
  }
}

export default async function AboutPage() {
  const photoReady = await hasProfilePhoto();

  return (
    <main className="min-h-screen bg-background text-slate-900">
      <SiteNav className="border-b border-slate-200 bg-card/90 backdrop-blur" />

      <section className="mx-auto w-full max-w-6xl px-6 py-12 md:px-8">
        <p className="text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">About</p>
        <h1 className="mt-3 text-4xl text-[#0b235c] md:text-6xl">Method and Architecture</h1>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-3xl text-[#0b235c]">Bio</h2>
            <div className="mt-4 flex items-center gap-4">
              {photoReady ? (
                <Image
                  src="/profile.jpg"
                  alt="Project author profile photo"
                  width={112}
                  height={112}
                  className="h-28 w-28 rounded-2xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-semibold text-slate-500 ring-1 ring-slate-200">
                  JP
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-slate-900">Justyna Przy</p>
                <p className="text-sm text-slate-600">Final Year Project, University of Limerick</p>
                {!photoReady && (
                  <p className="mt-1 text-xs text-slate-500">
                    Add <code className="rounded bg-slate-100 px-1 py-0.5">public/profile.jpg</code> to show your photo
                  </p>
                )}
              </div>
            </div>
            <p className="mt-5 text-slate-700">
              I built MicroBird as an end-to-end pipeline combining embedded audio capture, on-device spectrogram
              processing, and a quantized CNN on MAX78002. The goal was to deliver practical bird-call classification
              with low energy and no cloud dependency.
            </p>
          </div>

          <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-3xl text-[#0b235c]">System flow</h2>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {pipeline.map((step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                    {step}
                  </span>
                  {index < pipeline.length - 1 && <span className="text-slate-400">→</span>}
                </div>
              ))}
            </div>
            <p className="mt-5 text-slate-700">
              Audio is captured from the microphone, streamed through I2S and DMA, converted into model-ready
              features, inferred on the MAX78002 accelerator, and sent over UART to the web interface for display.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-3xl text-[#0b235c]">Model</h3>
            <ul className="mt-4 space-y-2 text-slate-700">
              <li>ResNet-style architecture</li>
              <li>Quantization-aware training (QAT)</li>
              <li>51 classes (50 species + non-bird)</li>
              <li>Trained on XC-ML bird dataset</li>
            </ul>
          </div>
          <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-3xl text-[#0b235c]">Accuracy</h3>
            <p className="mt-4 text-slate-700">
              Best validated model (DW2) reached 83.01% top-1 QAT validation accuracy. Hardware-confirmed W3 reached
              80.59% top-1 and 91.53% top-3 on the held-out test set.
            </p>
            <p className="mt-4 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              Test accuracy (W3): 80.59% top-1 / 91.53% top-3
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
