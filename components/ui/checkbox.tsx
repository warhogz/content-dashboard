import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function Checkbox({ className, ...props }: Props) {
  return (
    <input
      type="checkbox"
      {...props}
      className={cn("h-4 w-4 rounded focus:ring-[var(--theme-input-ring)]", className)}
      style={{
        borderColor: "var(--theme-border)",
        background: "var(--theme-surface)",
        color: "var(--theme-accent-strong)"
      }}
    />
  );
}
