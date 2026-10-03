import { avatarStyle, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Avatar({
  name,
  hue = 0,
  size = "md",
  className,
}: {
  name: string;
  hue?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-20 h-20 text-xl",
  };
  return (
    <span
      aria-hidden
      className={cn("inline-flex items-center justify-center rounded-full font-semibold select-none shrink-0", sizes[size], className)}
      style={avatarStyle(hue)}
    >
      {initials(name)}
    </span>
  );
}
