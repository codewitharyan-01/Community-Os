import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";

export type Column<T> = {
  key: string;
  header: string;
  /** Desktop table cell render */
  render?: (row: T) => React.ReactNode;
  /** Mobile card primary/secondary text */
  mobilePrimary?: (row: T) => React.ReactNode;
  mobileSecondary?: (row: T) => React.ReactNode;
  mobileRight?: (row: T) => React.ReactNode;
  className?: string;
};

/**
 * Responsive data table: real <table> on md+ screens, stacked cards on mobile.
 * No desktop table ever breaks mobile UX.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  mobileTitle,
  empty,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  mobileTitle: (row: T) => React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <>
      {/* Desktop */}
      <div className={cn("hidden md:block overflow-x-auto rounded-xl border border-[var(--border)]", className)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--subtle)]">
              {columns.map((c) => (
                <th key={c.key} className="text-left font-medium text-xs text-muted-foreground px-4 py-2.5 whitespace-nowrap">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--subtle)] transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                    {c.render ? c.render(row) : (row as Record<string, unknown>)[c.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2.5">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-[var(--border)] bg-card shadow-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">{mobileTitle(row)}</div>
              {columns.find((c) => c.mobileRight)?.mobileRight?.(row)}
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
              {columns
                .filter((c) => c.key !== (columns.find((c) => c.mobileRight)?.key ?? ""))
                .map((c) =>
                  c.mobilePrimary || c.mobileSecondary ? (
                    <div key={c.key} className="min-w-0">
                      <p className="text-2xs text-muted-foreground">{c.header}</p>
                      <div className="text-[13px] mt-0.5 truncate">{c.mobilePrimary?.(row) ?? c.mobileSecondary?.(row)}</div>
                    </div>
                  ) : null
                )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export { StatusBadge };
