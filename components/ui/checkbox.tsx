import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function Checkbox({ className, ...props }: Props) {
  return (
    <input
      type="checkbox"
      {...props}
      className={cn("h-4 w-4 rounded border-white/20 bg-white/5 text-rose-500 focus:ring-rose-500/30", className)}
    />
  );
}
