// COMMUNITY OS logo — two architectural blocks forming a subtle "C".
// Pure SVG: works in black, white, favicon and app icon.

export function Logo({ className, color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
      <rect width="32" height="32" rx="8" fill={color} />
      {/* top block */}
      <rect x="9" y="9" width="14" height="5.5" rx="1.2" fill="var(--background,#fff)" />
      {/* bottom block */}
      <rect x="9" y="17.5" width="14" height="5.5" rx="1.2" fill="var(--background,#fff)" />
      {/* connecting spine */}
      <rect x="9" y="12.6" width="4.6" height="6.8" fill="var(--background,#fff)" />
    </svg>
  );
}

export function LogoInverse({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0a0a0a" />
      <rect x="9" y="9" width="14" height="5.5" rx="1.2" fill="#fff" />
      <rect x="9" y="17.5" width="14" height="5.5" rx="1.2" fill="#fff" />
      <rect x="9" y="12.6" width="4.6" height="6.8" fill="#fff" />
    </svg>
  );
}
