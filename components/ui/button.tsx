import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "text-white hover:brightness-110",
  secondary: "hover:bg-[var(--theme-surface-strong)]",
  ghost: "hover:bg-[var(--theme-button-ghost-hover)]",
  destructive: "text-white hover:brightness-95",
  outline: "hover:bg-[var(--theme-surface-strong)]"
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
  icon: "h-10 w-10"
};

export function Button({ className, variant = "default", size = "md", type = "button", ...props }: ButtonProps) {
  const variantStyle: Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties> = {
    default: {
      background: "linear-gradient(90deg,var(--theme-accent-strong),color-mix(in srgb, var(--theme-accent) 86%, #d946ef 14%),var(--theme-accent))",
      boxShadow: "0 18px 50px var(--theme-accent-shadow)",
      color: "#fff"
    },
    secondary: {
      background: "var(--theme-button-secondary)",
      border: "1px solid var(--theme-border)",
      color: "var(--theme-text)"
    },
    ghost: {
      background: "transparent",
      color: "var(--theme-text-muted)"
    },
    destructive: {
      background: "#e11d48",
      color: "#fff",
      boxShadow: "0 18px 50px rgba(225,29,72,.24)"
    },
    outline: {
      background: "var(--theme-surface)",
      border: "1px solid var(--theme-border)",
      color: "var(--theme-text)"
    }
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition duration-200 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        variant === "ghost" ? "hover:text-[var(--theme-text)]" : "",
        sizeClasses[size],
        className
      )}
      style={variantStyle[variant]}
      {...props}
    />
  );
}
