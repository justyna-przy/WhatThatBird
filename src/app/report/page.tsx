import { access } from "node:fs/promises";
import path from "node:path";
import { SiteNav } from "@/components/site-nav";
import { ReportPdfViewerShell } from "@/components/report-pdf-viewer-shell";

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

      <section className="mx-auto w-full max-w-[780px] px-5 py-5 md:px-8 md:py-6">
        {reportReady ? (
          <div className="overflow-hidden rounded-2xl border border-[#afc4ea] bg-card">
            <ReportPdfViewerShell fileUrl="/report.pdf" downloadUrl="/report.pdf" title="MicroBird paper" />
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
