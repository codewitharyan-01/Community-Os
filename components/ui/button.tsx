import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-[#0a0a0a] text-white hover:bg-[#262626] active:scale-[0.98] disabled:hover:bg-[#0a0a0a]",
  secondary: "bg-white text-foreground border border-[var(--border-strong)] hover:bg-[var(--muted)] active:scale-[0.98]",
  ghost: "bg-transparent text-foreground hover:bg-[var(--muted)] active:scale-[0.98]",
  danger: "bg-[var(--status-red)] text-white hover:bg-[#a91e16] active:scale-[0.98]",
  subtle: "bg-[var(--muted)] text-foreground hover:bg-[#ececea] active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-[10px] gap-2",
  lg: "h-12 px-6 text-[15px] rounded-xl gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 select-none",
        "disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
