import { access } from "node:fs/promises";
import path from "node:path";
import { SiteNav } from "@/components/site-nav";

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

      <section className="mx-auto w-full max-w-[1120px] px-5 py-5 md:px-8 md:py-6">
        {reportReady ? (
          <div className="overflow-hidden rounded-2xl border border-[#afc4ea] bg-card">
            <div className="flex items-center justify-between border-b border-[#afc4ea] bg-[#f3f7ff] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#0b235c]">MicroBird Final Report</p>
                <p className="text-xs text-slate-600">Clean Scrollable PDF View</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/report.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[#b8caee] bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50"
                >
                  Open
                </a>
                <a
                  href="/report.pdf"
                  download
                  className="rounded-md bg-[#0f2c70] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#143a93]"
                >
                  Download
                </a>
              </div>
            </div>

            <div className="relative h-[calc(100svh-11rem)] overflow-hidden bg-slate-100">
              <iframe
                title="MicroBird report PDF"
                src="/report.pdf#zoom=100&view=FitH"
                className="h-[calc(100svh-11rem+64px)] w-[calc(100%+16px)] -translate-x-[8px] -translate-y-[64px] border-0 bg-slate-100"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Add <code className="rounded bg-amber-100 px-1.5 py-0.5">public/report.pdf</code> to show the embedded
            report view.
          </div>
        )}
      </section>
    </main>
  );
}
