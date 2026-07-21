import { Link } from "@tanstack/react-router";
import { ExternalLink, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { LOCKED_MESSAGE, PATREON_URL } from "@/lib/app-mode";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/about", label: "About" },
  { to: "/credits", label: "Credits" },
  { to: "/support", label: "Support" },
] as const;

export function LandingLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Surface a toast if we were redirected here from a locked internal route.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem("mc:locked-redirect") === "1") {
        sessionStorage.removeItem("mc:locked-redirect");
        toast.message("Desktop only", { description: LOCKED_MESSAGE, duration: 7000 });
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-neutral-100 antialiased selection:bg-[#e6ff5a] selection:text-black">
      {/* Ambient background wash matching cover palette */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 40% at 15% 0%, rgba(180,110,50,0.28) 0%, transparent 60%)," +
            "radial-gradient(45% 35% at 90% 10%, rgba(230,90,180,0.22) 0%, transparent 65%)," +
            "radial-gradient(60% 45% at 70% 90%, rgba(120,60,180,0.20) 0%, transparent 65%)," +
            "linear-gradient(180deg, #0a0a0f 0%, #0a0a0f 100%)",
        }}
      />

      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl text-black font-black shadow-lg shadow-black/40"
              style={{ background: "linear-gradient(135deg,#e6ff5a 0%,#ff5cb0 60%,#a05cff 100%)" }}
            >
              M
            </span>
            <div className="leading-none">
              <div className="text-[15px] font-extrabold tracking-tight">Mod Constructor V6</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 mt-0.5">
                by NeshaDenise Sims
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-white bg-white/5" }}
                inactiveProps={{ className: "text-neutral-300 hover:text-white hover:bg-white/5" }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              >
                {n.label}
              </Link>
            ))}
            <a
              href={PATREON_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-[#ff5cb0] px-3.5 py-1.5 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Patreon <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </nav>

          <button
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-neutral-200"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0a0a0f]/95">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-neutral-200 hover:bg-white/5"
                >
                  {n.label}
                </Link>
              ))}
              <a
                href={PATREON_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#ff5cb0] px-3 py-2 text-sm font-semibold text-black"
              >
                Visit Patreon <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 mt-24">
      <div className="mx-auto max-w-6xl px-5 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 place-items-center rounded-lg text-black font-black text-sm"
              style={{ background: "linear-gradient(135deg,#e6ff5a 0%,#ff5cb0 60%,#a05cff 100%)" }}
            >
              M
            </span>
            <span className="font-extrabold">Mod Constructor V6</span>
          </div>
          <p className="mt-3 text-sm text-neutral-400 max-w-md">
            An independent community-created desktop tool for building Sims 4 gameplay mods.
            Not affiliated with or endorsed by Electronic Arts or Maxis.
          </p>
          <p className="mt-3 text-xs text-neutral-500 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Desktop app · offline-first
          </p>
        </div>
        <FooterCol title="Explore" links={[
          { label: "Features", to: "/features" },
          { label: "About", to: "/about" },
          { label: "Support", to: "/support" },
        ]} />
        <FooterCol title="Legal & Credits" links={[
          { label: "Credits & Acknowledgements", to: "/credits" },
          { label: "Privacy", to: "/privacy" },
        ]}
          extra={
            <a
              href={PATREON_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-sm text-[#ff8ec9] hover:text-[#ff5cb0]"
            >
              Patreon <ExternalLink className="h-3.5 w-3.5" />
            </a>
          }
        />
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-5 py-5 text-xs text-neutral-500 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} NeshaDenise Sims.</span>
          <span>The Sims™ is a trademark of Electronic Arts Inc.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
  extra,
}: {
  title: string;
  links: { label: string; to: "/" | "/about" | "/features" | "/credits" | "/privacy" | "/support" }[];
  extra?: ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">{title}</div>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-neutral-300 hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
        {extra && <li>{extra}</li>}
      </ul>
    </div>
  );
}
