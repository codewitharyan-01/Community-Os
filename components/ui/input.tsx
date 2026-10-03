import { cn } from "@/lib/utils";

const baseField =
  "w-full h-10 rounded-[10px] border border-[var(--border-strong)] bg-white px-3 text-sm placeholder:text-[#a3a3a0] transition-shadow focus:border-[#0a0a0a] focus:ring-2 focus:ring-[rgba(10,10,10,0.08)] focus:outline-none disabled:opacity-60";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseField, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseField, "h-auto min-h-[90px] py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseField, "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23737373%22 stroke-width=%222.5%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block text-2xs text-muted-foreground mt-1">{hint}</span>}
      {error && <span className="block text-2xs text-[var(--status-red)] mt-1">{error}</span>}
    </label>
  );
}
