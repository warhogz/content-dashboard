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
      <div className="page-shell grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-3 sm:h-24">
        <div aria-hidden className="justify-self-start" />
        <Link href="/" className="inline-flex items-center justify-center px-2 py-2 transition hover:opacity-90">
          <img src="/logo.svg" alt="Logo" className="h-14 w-auto sm:h-[4.5rem]" />
        </Link>
        <div className="justify-self-end">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
