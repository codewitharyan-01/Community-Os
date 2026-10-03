import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import { SectionTitle } from "@/components/ui/card";

export { SectionTitle };

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "green" | "red" | "orange";
  href?: string;
  className?: string;
}) {
  const inner = (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-card shadow-card p-4 sm:p-5 h-full transition-shadow",
        href && "hover:shadow-pop transition-shadow",
        className
      )}
    >
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p
        className={cn(
          "text-[22px] sm:text-2xl font-semibold tracking-tight mt-1.5 num",
          tone === "green" && "text-[var(--status-green)]",
          tone === "red" && "text-[var(--status-red)]",
          tone === "orange" && "text-[var(--status-orange)]"
        )}
      >
        {value}
      </p>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
  return href ? (
    <a href={href} className="block h-full">
      {inner}
    </a>
  ) : (
    inner
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6", className)}>
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0 no-print">{action}</div>}
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: { title: string; meta?: string; body?: string; active?: boolean; last?: boolean }[];
}) {
  return (
    <ol className="relative ml-1.5">
      {items.map((item, i) => (
        <li key={i} className="relative pl-6 pb-5 last:pb-0">
          {!item.last && <span className="absolute left-[5px] top-3.5 bottom-0 w-px bg-[var(--border)]" aria-hidden />}
          <span
            className={cn(
              "absolute left-0 top-1 w-[11px] h-[11px] rounded-full border-2",
              item.active ? "bg-[#0a0a0a] border-[#0a0a0a]" : "bg-white border-[var(--border-strong)]"
            )}
            aria-hidden
          />
          <p className={cn("text-sm", item.active ? "font-medium" : "text-muted-foreground")}>{item.title}</p>
          {item.meta && <p className="text-2xs text-muted-foreground mt-0.5">{item.meta}</p>}
          {item.body && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.body}</p>}
        </li>
      ))}
    </ol>
  );
}

export function Progress({ value, className, tone = "black" }: { value: number; className?: string; tone?: "black" | "green" | "orange" | "red" | "blue" }) {
  const colors = {
    black: "bg-[#0a0a0a]",
    green: "bg-[var(--status-green)]",
    orange: "bg-[var(--status-orange)]",
    red: "bg-[var(--status-red)]",
    blue: "bg-[var(--status-blue)]",
  };
  return (
    <div className={cn("h-1.5 rounded-full bg-[var(--muted)] overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export { StatusBadge };
