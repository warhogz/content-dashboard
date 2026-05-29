import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-gradient-to-r from-rose-500 via-fuchsia-500 to-pink-500 text-white hover:brightness-110 shadow-[0_18px_50px_rgba(244,63,94,0.30)]",
  secondary: "bg-white/7 text-white hover:bg-white/10 border border-white/10",
  ghost: "bg-transparent text-white/78 hover:bg-white/8 hover:text-white",
  destructive: "bg-rose-500 text-white hover:bg-rose-600",
  outline: "border border-white/10 bg-white/5 text-white hover:bg-white/9"
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
  icon: "h-10 w-10"
};

export function Button({ className, variant = "default", size = "md", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition duration-200 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
