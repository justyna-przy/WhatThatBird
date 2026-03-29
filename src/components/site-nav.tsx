import Link from "next/link";
import { Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS, OWNER_HANDLE } from "@/lib/site";

type SiteNavProps = {
  light?: boolean;
  className?: string;
};

export function SiteNav({ light = false, className }: SiteNavProps) {
  return (
    <header
      className={cn(
        "flex w-full items-center justify-between gap-4 px-5 py-5 md:px-8 md:py-7",
        className
      )}
    >
      <Link
        href="/"
        className={cn(
          "font-nav-lora text-base font-medium tracking-normal transition-colors duration-200 md:text-lg",
          light ? "text-white hover:text-[#0a1b39]" : "text-[#0a1b39] hover:text-[#2f63d9]"
        )}
      >
        {OWNER_HANDLE}
      </Link>

      <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 text-base md:gap-x-8 md:text-lg">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "font-nav-lora font-medium transition-colors duration-200",
              light ? "text-white hover:text-[#0a1b39]" : "text-[#0a1b39] hover:text-[#2f63d9]"
            )}
          >
            {link.label}
          </Link>
        ))}
        <a
          href="https://github.com/justyna-przy"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          title="GitHub"
          className={cn(
            "inline-flex items-center justify-center transition-colors duration-200",
            light ? "text-white hover:text-[#0a1b39]" : "text-[#0a1b39] hover:text-[#2f63d9]"
          )}
        >
          <Github className="h-5 w-5" />
          <span className="sr-only">GitHub</span>
        </a>
      </nav>
    </header>
  );
}
