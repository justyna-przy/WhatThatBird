"use client";

import dynamic from "next/dynamic";

type ReportPdfViewerShellProps = {
  fileUrl?: string;
  downloadUrl?: string;
  title?: string;
};

const ReportPdfViewer = dynamic(
  () => import("@/components/report-pdf-viewer").then((mod) => mod.ReportPdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100svh-7rem)] bg-white p-6">
        <div className="mx-auto max-w-xl rounded-xl border border-[#afc4ea] bg-white px-4 py-3 text-sm text-slate-600">
          Loading report viewer...
        </div>
      </div>
    ),
  }
);

export function ReportPdfViewerShell({
  fileUrl = "/report.pdf",
  downloadUrl = "/report.pdf",
  title = "MicroBird paper",
}: ReportPdfViewerShellProps) {
  return <ReportPdfViewer fileUrl={fileUrl} downloadUrl={downloadUrl} title={title} />;
}
