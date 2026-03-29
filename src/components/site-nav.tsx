import Link from "next/link";
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
        "mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 md:px-8 md:py-7",
        className
      )}
    >
      <Link
        href="/"
        className={cn(
          "font-nav-lora text-base font-medium tracking-normal transition-colors duration-200 md:text-lg",
          light ? "text-white hover:text-[#0a1b39]" : "text-white hover:text-[#0a1b39]"
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
              light ? "text-white hover:text-[#0a1b39]" : "text-white hover:text-[#0a1b39]"
            )}
          >
            {link.label}
          </Link>
        ))}
        <a
          href="https://github.com/justyna-przy"
          target="_blank"
          rel="noreferrer"
          className={cn(
            "font-nav-lora font-medium transition-colors duration-200",
            light ? "text-white hover:text-[#0a1b39]" : "text-white hover:text-[#0a1b39]"
          )}
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}
