import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-6xl font-semibold tracking-tight num">404</p>
        <h1 className="text-lg font-semibold tracking-tight mt-4">Page not found</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link href="/" className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[#0a0a0a] text-white text-sm font-medium hover:bg-[#262626] transition-colors">
            Back to home
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
