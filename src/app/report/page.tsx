import { access } from "node:fs/promises";
import path from "node:path";
import { SiteNav } from "@/components/site-nav";
import { GITHUB_LINKS } from "@/lib/site";

async function hasReportPdf() {
  try {
    await access(path.join(process.cwd(), "public", "report.pdf"));
    return true;
  } catch {
    return false;
  }
}

export default async function ReportPage() {
  const reportReady = await hasReportPdf();

  return (
    <main className="min-h-screen bg-background text-slate-900">
      <SiteNav className="border-b border-slate-200 bg-card/90 backdrop-blur" />

      <section className="mx-auto w-full max-w-6xl px-6 py-12 md:px-8">
        <p className="text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">Paper</p>
        <h1 className="mt-3 text-4xl text-[#0b235c] md:text-6xl">Report</h1>
        <p className="mt-4 max-w-3xl text-slate-700 md:text-lg">
          This report documents MicroBird: model design, dataset curation, QAT workflow, firmware integration, and
          measured performance on MAX78002.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {reportReady ? (
            <a
              href="/report.pdf"
              download
              className="rounded-full bg-[#0f2c70] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#143a93]"
            >
              Download PDF
            </a>
          ) : (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-700">
              Add <code className="rounded bg-amber-100 px-1.5 py-0.5">public/report.pdf</code> to enable download
            </span>
          )}

          <a
            href={GITHUB_LINKS.webApp}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            Web app repository
          </a>
          <a
            href={GITHUB_LINKS.firmware}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            Firmware repository
          </a>
        </div>

        <div className="mt-10 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
          <h2 className="text-3xl text-[#0b235c]">Abstract</h2>
          <p className="mt-4 text-slate-700">
            MicroBird is a complete end-to-end embedded bird-call classification system for Irish species monitoring.
            It combines regional dataset curation, 64x128 log-mel preprocessing, quantization-aware training, and
            MAX78002 deployment. The best validated model reaches 83.01% top-1 validation accuracy, with
            hardware-tested inference at 3.5 ms and 15.3 µJ on the CNN accelerator.
          </p>
        </div>

        {reportReady && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-card shadow-sm">
            <iframe title="Project report PDF" src="/report.pdf#view=FitH" className="h-[70vh] w-full" />
          </div>
        )}
      </section>
    </main>
  );
}
