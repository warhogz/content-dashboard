import Link from "next/link";

const linkClass = "inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium text-white/78 transition hover:bg-white/7 hover:text-white";

export function Topbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#12070d]/70 backdrop-blur-2xl">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-semibold tracking-tight text-white">Content Cards</Link>
        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/" className={linkClass}>Публичный вид</Link>
          <Link href="/admin" className={linkClass}>Админка</Link>
          <Link href="/login" className={`${linkClass} border border-white/10 bg-white/6`}>Вход</Link>
        </div>
      </div>
    </header>
  );
}
