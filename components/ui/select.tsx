import * as React from "react";
import { cn } from "@/lib/utils";
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
return (
<div className="relative">
<select {...props}
className={cn(
"h-11 w-full appearance-none rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(45,10,26,.78),rgba(24,8,18,.82))] px-4 pr-11 text-sm text-white outline-none transition backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,.22)] [color-scheme:dark] focus:border-pink-400/30 focus:ring-4 focus:ring-pink-500/10 hover:border-pink-300/20",
props.className
)}>
{props.children}
</select>
<div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/45">⌄</div>
</div>);
}
