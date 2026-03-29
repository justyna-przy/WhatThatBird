import Link from "next/link";
import { Github } from "lucide-react";
import { GITHUB_LINKS, NAV_LINKS, SITE_NAME } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[#afc4ea] bg-card/95">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-6 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#0b235c]">{SITE_NAME}</p>
          <p className="text-xs text-slate-600">Microjoule-range embedded bird-call classification on MAX78002</p>
          <p className="text-xs text-slate-500">© {year} Justyna Przyborska</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-nav-lora text-[#0a1b39] transition-colors duration-200 hover:text-[#2f63d9]"
            >
              {link.label}
            </Link>
          ))}

          <a
            href={GITHUB_LINKS.webApp}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            title="GitHub"
            className="inline-flex items-center justify-center text-[#0a1b39] transition-colors duration-200 hover:text-[#2f63d9]"
          >
            <Github className="h-4 w-4" />
            <span className="sr-only">GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
