import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function BrandMark({ href = "/", size = "md" }: { href?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { box: "w-6 h-6", text: "text-sm" },
    md: { box: "w-7 h-7", text: "text-[15px]" },
    lg: { box: "w-9 h-9", text: "text-lg" },
  };
  const s = sizes[size];
  return (
    <Link href={href} className="flex items-center gap-2.5 group" aria-label="Community OS home">
      <Logo className={`${s.box} transition-transform group-hover:scale-105`} />
      <span className={`${s.text} font-semibold tracking-tight`}>
        Community<span className="text-muted-foreground font-medium"> OS</span>
      </span>
    </Link>
  );
}
