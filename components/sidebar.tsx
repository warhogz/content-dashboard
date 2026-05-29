import Link from "next/link";
import { LayoutDashboard, Settings, LogIn, Sparkles } from "lucide-react";
const nav=[{href:"/",label:"Публичный вид",icon:LayoutDashboard},{href:"/admin",label:"Админка",icon:Sparkles},{href:"/settings",label:"Настройки",icon:Settings},{href:"/login",label:"Вход",icon:LogIn}];
export function Sidebar(){
return <aside className="panel glow-border hidden h-fit p-3 lg:block">
<div className="mb-5 rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(70,10,38,.55),rgba(25,8,18,.7))] px-4 py-4 shadow-[0_0_40px_rgba(255,40,120,.08)]">
<div className="text-sm text-white/55">Content Cards</div>
<div className="mt-1 text-xl font-semibold text-white">Luxury Workspace</div>
</div>
<nav className="grid gap-2">
{nav.map(item=>{const Icon=item.icon; return <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-sm text-white/72 transition hover:border-pink-400/10 hover:bg-white/6 hover:text-white"><Icon className="h-4 w-4 text-pink-300/70"/>{item.label}</Link>})}
</nav></aside>}
