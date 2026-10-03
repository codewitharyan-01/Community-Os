import { cn } from "@/lib/utils";
import { STATUS_TONE } from "@/lib/constants";
import { humanize } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  green: "bg-[var(--status-green-bg)] text-[var(--status-green)]",
  red: "bg-[var(--status-red-bg)] text-[var(--status-red)]",
  orange: "bg-[var(--status-orange-bg)] text-[var(--status-orange)]",
  blue: "bg-[var(--status-blue-bg)] text-[var(--status-blue)]",
  gray: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export function Badge({
  tone = "gray",
  className,
  children,
}: {
  tone?: "green" | "red" | "orange" | "blue" | "gray" | "black";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium whitespace-nowrap",
        tone === "black" ? "bg-[#0a0a0a] text-white" : toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Status badge that maps a status string to its tone automatically. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = STATUS_TONE[status] ?? "gray";
  return <Badge tone={tone}>{label ?? humanize(status)}</Badge>;
}
