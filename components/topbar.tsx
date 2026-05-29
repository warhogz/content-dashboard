import Link from "next/link";

export function Topbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#12070d]/78 backdrop-blur-2xl">
      <div className="page-shell flex h-20 items-center justify-center">
        <Link href="/" className="inline-flex items-center justify-center px-2 py-2 transition hover:opacity-90">
          <img src="/logo.svg" alt="Logo" className="h-10 w-auto sm:h-12" />
        </Link>
      </div>
    </header>
  );
}
