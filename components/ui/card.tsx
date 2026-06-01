import { cn } from "@/lib/utils";
import * as React from "react";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("rounded-[28px] backdrop-blur-2xl", className)} style={{ border: "1px solid var(--theme-border)", background: "var(--theme-surface)", boxShadow: "var(--theme-shadow-lift)", ...props.style }} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("p-5 pb-3 sm:p-6 sm:pb-4", className)} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...props} className={cn("text-base font-semibold tracking-tight", className)} style={{ color: "var(--theme-text)", ...props.style }} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={cn("text-sm leading-6", className)} style={{ color: "var(--theme-text-muted)", ...props.style }} />;
}
