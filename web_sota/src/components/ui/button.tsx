/** Minimal Button (shadcn-shaped props used by vendored pages, plain Tailwind). */
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "ghost" | "outline" | "secondary";
type Size = "default" | "sm";

const variants: Record<Variant, string> = {
  default: "bg-zinc-100 text-zinc-900 hover:bg-white",
  ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
  outline: "border border-zinc-700 text-zinc-300 hover:bg-zinc-800",
  secondary: "bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
};

const sizes: Record<Size, string> = {
  default: "px-4 py-2 text-sm",
  sm: "px-2.5 py-1 text-sm",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "default",
  size = "default",
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-lg font-medium transition-colors disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
}
