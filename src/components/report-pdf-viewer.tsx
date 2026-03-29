"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type ReportPdfViewerProps = {
  fileUrl?: string;
  downloadUrl?: string;
  title?: string;
};

export function ReportPdfViewer({
  fileUrl = "/report.pdf",
  downloadUrl = "/report.pdf",
  title = "MicroBird paper",
}: ReportPdfViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(960);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? 960;
      setViewportWidth(nextWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const pageNumbers = useMemo(
    () => Array.from({ length: numPages }, (_, i) => i + 1),
    [numPages]
  );

  const baseWidth = Math.max(320, viewportWidth);
  const pageWidth = Math.max(320, Math.round(baseWidth * zoom));

  function onLoadSuccess(pdf: { numPages: number }) {
    setNumPages(pdf.numPages);
  }

  return (
    <div className="flex h-[calc(100svh-7rem)] flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[#c4d5f2] bg-[#eaf2ff] px-4 py-2">
        <p className="text-sm font-semibold text-[#0b235c]">{title}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[#b8caee] bg-white text-slate-700 hover:bg-slate-50"
            onClick={() => setZoom((prev) => Math.max(0.7, prev - 0.08))}
          >
            -
          </Button>
          <span className="min-w-14 text-center text-xs font-medium text-slate-700 tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-[#b8caee] bg-white text-slate-700 hover:bg-slate-50"
            onClick={() => setZoom((prev) => Math.min(1.5, prev + 0.08))}
          >
            +
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-[#b8caee] bg-white text-slate-700 hover:bg-slate-50"
            onClick={() => setZoom(1)}
          >
            Reset
          </Button>
          <a
            href={downloadUrl}
            download
            className="rounded-md bg-[#0f2c70] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#143a93]"
          >
            Download
          </a>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="flex-1 overflow-y-auto overflow-x-auto bg-white"
      >
        <Document
          file={fileUrl}
          onLoadSuccess={onLoadSuccess}
          loading={
            <div className="mx-auto max-w-xl rounded-xl border border-[#afc4ea] bg-white px-4 py-3 text-sm text-slate-600">
              Loading report...
            </div>
          }
          error={
            <div className="mx-auto max-w-xl rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Could not load the PDF.
            </div>
          }
        >
          <div className="flex w-full flex-col gap-4">
            {pageNumbers.map((pageNumber) => (
              <div key={pageNumber} className="overflow-hidden">
                <Page
                  pageNumber={pageNumber}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </div>
            ))}
          </div>
        </Document>
      </div>
    </div>
  );
}
