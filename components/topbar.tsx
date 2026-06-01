import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function Topbar() {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-2xl"
      style={{
        borderBottom: "1px solid var(--theme-topbar-border)",
        background: "var(--theme-topbar-bg)"
      }}
    >
      <div className="page-shell relative flex h-20 items-center justify-center sm:h-24">
        <Link href="/" className="inline-flex items-center justify-center px-2 py-2 transition hover:opacity-90">
          <img src="/logo.svg" alt="Logo" className="h-14 w-auto sm:h-[4.5rem]" />
        </Link>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 sm:right-6">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
