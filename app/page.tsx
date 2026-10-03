import Link from "next/link";
import {
  ArrowRight, ShieldCheck, Wallet, MessagesSquare, Vote, CalendarCheck,
  Car, DoorOpen, Sparkles, FileBarChart, Lock, HeartHandshake, CheckCircle2, Bell,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Reveal } from "@/components/landing/reveal";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Wallet, title: "Payments & Billing", body: "Automated maintenance cycles, one-tap UPI payments, instant receipts and a live collection ledger." },
  { icon: MessagesSquare, title: "Community Feed", body: "A structured, society-focused feed for announcements, issues, suggestions and appreciation — not another noisy group chat." },
  { icon: ShieldCheck, title: "Security & Visitors", body: "QR visitor passes, gate check-in/out, vehicle lookup with privacy-first masking and incident reporting." },
  { icon: Vote, title: "Governance & Polls", body: "Formal and informal polls, AGM agendas, quorum visibility — decisions that carry an audit trail." },
  { icon: CalendarCheck, title: "Facilities & Events", body: "Book the clubhouse or badminton court in seconds. RSVP and volunteer for community events." },
  { icon: Car, title: "Parking", body: "Slot assignment, vehicle registry and a polite, privacy-aware way to reach a blocked car's owner." },
  { icon: FileBarChart, title: "Reports & Transparency", body: "Residents see where money goes. Admins get collection, expense and engagement reports with CSV export." },
  { icon: Sparkles, title: "AI Assistant", body: "\"How much do I owe?\" \"Which contracts expire soon?\" — answers grounded in your community's real data." },
];

const DEMO_LINKS = [
  { role: "Resident", email: "resident@demo.local", pass: "demo123", href: "/api/demo-login/resident", note: "Pay dues, report issues, invite visitors, vote" },
  { role: "Admin", email: "admin@demo.local", pass: "admin123", href: "/api/demo-login/admin", note: "Billing engine, issue queue, polls, transparency" },
  { role: "Accountant", email: "accountant@demo.local", pass: "accountant123", href: "/api/demo-login/accountant", note: "Expenses, ledger, budgets, reports" },
  { role: "Security", email: "security@demo.local", pass: "security123", href: "/api/demo-login/security", note: "Gate desk: check-ins, vehicle lookup, SOS" },
  { role: "Vendor", email: "vendor@demo.local", pass: "vendor123", href: "/api/demo-login/vendor", note: "Assigned tasks and invoices" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0a0a0a]">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[var(--border)]">
        <div className="container-wide h-16 flex items-center justify-between">
          <BrandMark />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#product" className="hover:text-foreground transition-colors">Product</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#transparency" className="hover:text-foreground transition-colors">Transparency</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Demo</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="secondary" size="sm">Sign in</Button>
            </Link>
            <Link href="#demo" className="hidden sm:block">
              <Button size="sm">Enter demo <ArrowRight className="w-3.5 h-3.5" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-wide pt-16 sm:pt-24 pb-14">
          <Reveal>
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground mb-5">
              The operating system for residential communities
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="text-[38px] leading-[1.05] sm:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] max-w-4xl">
              Run your entire community from one intelligent place.
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Payments. Maintenance. Communication. Security. Governance.
              <span className="text-foreground font-medium"> All connected.</span>
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/api/demo-login/resident">
                <Button size="lg">One-tap resident demo <ArrowRight className="w-4 h-4" /></Button>
              </Link>
              <Link href="/api/demo-login/admin">
                <Button size="lg" variant="secondary">One-tap admin demo</Button>
              </Link>
              <Link href="#demo" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
                all roles
              </Link>
            </div>
          </Reveal>

          {/* Product mock */}
          <Reveal delay={0.24} className="mt-14 sm:mt-20">
            <HeroMock />
          </Reveal>
        </div>
      </section>

      {/* Problem → Solution */}
      <section id="product" className="border-t border-[var(--border)] bg-[var(--subtle)]">
        <div className="container-wide py-20 sm:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <Reveal>
              <p className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground mb-4">The problem</p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
                Communities run like businesses — on spreadsheets and WhatsApp.
              </h2>
              <ul className="mt-8 space-y-4 text-sm text-muted-foreground leading-relaxed">
                <li className="flex gap-3"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#0a0a0a] shrink-0" />Maintenance collected by hand, tracked in Excel, chased over calls.</li>
                <li className="flex gap-3"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#0a0a0a] shrink-0" />Complaints lost in chat noise. Nobody knows who is handling what.</li>
                <li className="flex gap-3"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#0a0a0a] shrink-0" />Zero financial visibility — &ldquo;where did our money go?&rdquo;</li>
                <li className="flex gap-3"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#0a0a0a] shrink-0" />Visitor registers, parking disputes, paper notices, missed AGMs.</li>
              </ul>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground mb-4">The solution</p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
                One platform. Every workflow. Full trust.
              </h2>
              <div className="mt-8 grid sm:grid-cols-2 gap-3">
                {[
                  { icon: Wallet, t: "Pay in one tap" },
                  { icon: MessagesSquare, t: "Report & discuss" },
                  { icon: DoorOpen, t: "Manage visitors" },
                  { icon: Vote, t: "Decide together" },
                  { icon: FileBarChart, t: "See the money" },
                  { icon: Sparkles, t: "Let AI watch the radar" },
                ].map((x) => (
                  <div key={x.t} className="flex items-center gap-3 rounded-xl bg-white border border-[var(--border)] px-4 py-3.5 shadow-card">
                    <x.icon className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0" />
                    <span className="text-sm font-medium">{x.t}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="border-t border-[var(--border)]">
        <div className="container-wide py-20 sm:py-28">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-2xl">
              Everything your community needs. Nothing it doesn&rsquo;t.
            </h2>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.04}>
                <div className="group h-full rounded-xl border border-[var(--border)] p-5 hover:shadow-pop transition-shadow bg-white">
                  <div className="w-9 h-9 rounded-lg bg-[#0a0a0a] text-white flex items-center justify-center mb-4">
                    <f.icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight">{f.title}</h3>
                  <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency + trust */}
      <section id="transparency" className="border-t border-[var(--border)] bg-[#0a0a0a] text-white">
        <div className="container-wide py-20 sm:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <p className="text-xs font-medium tracking-[0.14em] uppercase text-white/50 mb-4">Transparency, built in</p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
                Trust is a feature, not a promise.
              </h2>
              <p className="mt-6 text-white/60 leading-relaxed max-w-lg">
                Every payment, expense and approval leaves an audit trail. Residents see monthly
                money-in and money-out summaries. Committees get defensible records. Privacy is
                respected by design — masked contacts, scoped visibility, consent-aware data.
              </p>
              <div className="mt-8 grid sm:grid-cols-3 gap-6">
                {[
                  { icon: Lock, t: "Privacy-first" },
                  { icon: FileBarChart, t: "Audit everything" },
                  { icon: HeartHandshake, t: "Resident-first UX" },
                ].map((x) => (
                  <div key={x.t}>
                    <x.icon className="w-5 h-5 text-white/70" />
                    <p className="text-sm font-medium mt-2.5">{x.t}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
                <p className="text-xs text-white/50 uppercase tracking-[0.14em]">Monthly summary · Green Heights</p>
                <div className="mt-6 space-y-4">
                  {[
                    { label: "Money in", value: "₹4,21,000", w: "84%", c: "bg-white" },
                    { label: "Money out", value: "₹3,68,500", w: "73%", c: "bg-white/60" },
                    { label: "Collection rate", value: "87.3%", w: "87%", c: "bg-emerald-400" },
                  ].map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/70">{r.label}</span>
                        <span className="font-semibold num">{r.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10">
                        <div className={`h-full rounded-full ${r.c}`} style={{ width: r.w }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-7 pt-6 border-t border-white/10 space-y-2.5 text-sm">
                  {["Security — ₹1,20,000", "Electricity — ₹72,000", "Cleaning — ₹43,000", "Repairs — ₹38,000"].map((l) => (
                    <div key={l} className="flex items-center gap-2.5 text-white/60">
                      <CheckCircle2 className="w-4 h-4 text-white/40" /> {l}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Demo accounts */}
      <section id="demo" className="border-t border-[var(--border)]">
        <div className="container-wide py-20 sm:py-28">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Try every role, right now.</h2>
            <p className="mt-4 text-muted-foreground max-w-xl leading-relaxed">
              The demo ships fully seeded: 3 towers, 120 units, invoices, live issues, polls, events and
              a gate desk. Tap a persona — you&rsquo;re in instantly, no form. Data is real SQLite; actions really work.
            </p>
          </Reveal>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_LINKS.map((d, i) => (
              <Reveal key={d.role} delay={i * 0.04}>
                <Link
                  href={d.href}
                  className="group block h-full rounded-xl border border-[var(--border)] p-5 hover:shadow-pop hover:border-[var(--border-strong)] transition-all bg-white"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{d.role}</span>
                    <span className="text-2xs font-medium text-muted-foreground group-hover:text-foreground">One-tap →</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{d.note}</p>
                  <p className="mt-4 text-2xs font-mono text-muted-foreground bg-[var(--muted)] rounded-md px-2 py-1 inline-block">
                    {d.email} · {d.pass}
                  </p>
                </Link>
              </Reveal>
            ))}
            <Reveal delay={0.2}>
              <Link href="/login" className="group block h-full rounded-xl border-2 border-dashed border-[var(--border-strong)] p-5 hover:border-[#0a0a0a] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Manual sign-in</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Use any seeded account with email &amp; password.</p>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--border)] bg-[var(--subtle)]">
        <div className="container-wide py-20 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-[var(--border)] bg-white rounded-full px-3.5 py-1.5 shadow-card mb-6">
              <Bell className="w-3.5 h-3.5" /> Installable as an app · works offline for browsing
            </div>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight">
              Your community deserves an OS.
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/api/demo-login/resident"><Button size="lg">Enter Resident Demo <ArrowRight className="w-4 h-4" /></Button></Link>
              <Link href="/api/demo-login/admin"><Button size="lg" variant="secondary">Enter Admin Demo</Button></Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]">
        <div className="container-wide py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandMark size="sm" />
          <p className="text-xs text-muted-foreground">
            Local demo build · compliance-ready architecture — production deployment requires jurisdiction-specific legal review.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="/demo/investor" className="hover:text-foreground transition-colors">Investor view</Link>
            <span>© {new Date().getFullYear()} Community OS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroMock() {
  return (
    <div className="relative rounded-2xl border border-[var(--border)] bg-white shadow-pop overflow-hidden">
      <div className="h-10 border-b border-[var(--border)] flex items-center px-4 gap-1.5 bg-[var(--subtle)]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#e4e4e1]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#e4e4e1]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#e4e4e1]" />
        <span className="ml-3 text-2xs text-muted-foreground">community-os · resident home</span>
      </div>
      <div className="grid md:grid-cols-5">
        {/* sidebar */}
        <div className="hidden md:flex md:col-span-1 border-r border-[var(--border)] flex-col gap-1 p-3 bg-[var(--subtle)]">
          {["Home", "Community", "Payments", "Services", "Profile"].map((x, i) => (
            <div key={x} className={`text-xs px-3 py-1.5 rounded-lg ${i === 0 ? "bg-[#0a0a0a] text-white font-medium" : "text-muted-foreground"}`}>{x}</div>
          ))}
        </div>
        {/* main */}
        <div className="md:col-span-4 p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg sm:text-xl font-semibold tracking-tight">Good morning, Aryan.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Here&rsquo;s what needs your attention today.</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[var(--muted)]" />
          </div>
          <div className="mt-5 rounded-xl bg-[#0a0a0a] text-white p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/60">Maintenance due</p>
              <p className="text-2xl font-semibold mt-1 num">₹2,500</p>
              <p className="text-xs text-white/50 mt-1">Due 10 October · A-402</p>
            </div>
            <span className="text-xs font-medium bg-white text-[#0a0a0a] rounded-lg px-3.5 py-2">Pay now</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] p-4">
              <p className="text-xs text-muted-foreground">Trending issue</p>
              <p className="text-[13px] font-medium mt-1.5 leading-snug">Water leakage — Block B basement</p>
              <p className="text-2xs text-muted-foreground mt-1">47 votes · 13 comments · in progress</p>
              <div className="mt-2.5 h-1 rounded-full bg-[var(--muted)]"><div className="h-full w-2/3 rounded-full bg-[var(--status-blue)]" /></div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4">
              <p className="text-xs text-muted-foreground">Upcoming event</p>
              <p className="text-[13px] font-medium mt-1.5 leading-snug">Diwali Celebration</p>
              <p className="text-2xs text-muted-foreground mt-1">Saturday · 7:00 PM · Clubhouse</p>
              <div className="mt-2.5 flex -space-x-1.5">
                {[0, 1, 2, 3].map((i) => <span key={i} className="w-5 h-5 rounded-full border-2 border-white bg-[#e8e8e6]" />)}
                <span className="text-2xs text-muted-foreground self-center ml-2.5">+142 going</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {["Pay", "Report", "Visitor", "Book"].map((q) => (
              <div key={q} className="rounded-lg border border-[var(--border)] py-2.5 text-center text-2xs font-medium text-muted-foreground">{q}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
