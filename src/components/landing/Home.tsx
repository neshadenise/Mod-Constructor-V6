import { Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, Sparkles, Trophy, Bell, Image as ImageIcon, Eye, Layers, ShieldCheck, Package, MessageSquareCode, ExternalLink, Download, Monitor } from "lucide-react";
import heroAsset from "@/assets/neshadenise-hero.png.asset.json";
import { PATREON_URL } from "@/lib/app-mode";

export function LandingHome() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <DownloadCTA />
      <AboutCreator />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 pt-16 pb-20 md:pt-24 md:pb-28 grid gap-12 md:grid-cols-2 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e6ff5a]/30 bg-[#e6ff5a]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e6ff5a]">
            <Monitor className="h-3.5 w-3.5" /> Standalone desktop application
          </div>
          <h1
            className="mt-5 text-5xl md:text-6xl font-black leading-[1.02] tracking-tight"
            style={{ fontFamily: '"Fredoka", "Inter", system-ui, sans-serif' }}
          >
            <span className="block">Mod Constructor</span>
            <span
              className="block bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg,#e6ff5a 0%,#ff5cb0 55%,#a05cff 100%)" }}
            >
              V6
            </span>
          </h1>
          <p className="mt-5 text-xl md:text-2xl font-semibold text-neutral-100 max-w-xl">
            Build deeper Sims 4 gameplay without writing raw tuning by hand.
          </p>
          <p className="mt-4 text-[15px] text-neutral-400 max-w-xl">
            Create careers, traits, aspirations, notifications, icons, and reusable project templates
            in one guided desktop workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={PATREON_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff5cb0] px-5 py-3 text-sm font-bold text-black shadow-lg shadow-[#ff5cb0]/20 transition hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              Download on Patreon
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
            <Link
              to="/features"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-neutral-100 transition hover:bg-white/[0.08]"
            >
              Explore Features <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 flex items-center gap-4 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Windows & macOS
            </span>
            <span>·</span>
            <span>Offline-first</span>
            <span>·</span>
            <span>No account required</span>
          </div>
        </div>

        {/* Framed hero art (right column) — the uploaded Patreon cover */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-6 rounded-[36px] blur-2xl opacity-60"
            style={{
              background:
                "radial-gradient(60% 60% at 30% 30%, rgba(230,255,90,0.25), transparent 70%)," +
                "radial-gradient(50% 60% at 80% 60%, rgba(255,92,176,0.30), transparent 70%)," +
                "radial-gradient(40% 60% at 60% 90%, rgba(160,92,255,0.30), transparent 70%)",
            }}
          />
          <div
            className="relative overflow-hidden rounded-2xl border-2"
            style={{
              borderImage: "linear-gradient(135deg,#e6ff5a,#ff5cb0,#a05cff) 1",
              boxShadow: "0 30px 80px -20px rgba(255,92,176,0.35), 0 20px 40px -20px rgba(160,92,255,0.35)",
            }}
          >
            <img
              src={heroAsset.url}
              alt="NeshaDenise Sims — Mod Constructor cover art"
              className="w-full h-auto block"
              loading="eager"
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10 rounded-2xl" />
          </div>
          <div className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Cover art · NeshaDenise Sims
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Briefcase,
    title: "Guided Career Builder",
    body: "Author full careers with ranks, uniforms, WFH events, salary curves, and every V5 message override — with sensible defaults for creators who don't code.",
    accent: "#e6ff5a",
  },
  {
    icon: Sparkles,
    title: "Trait Builder",
    body: "Personality and gameplay traits with age gates, emotional buffs, voice effects, aging blocks, and social interaction replacements.",
    accent: "#ff5cb0",
  },
  {
    icon: Trophy,
    title: "Aspiration Builder",
    body: "Design multi-tier aspirations with milestones, rewards, and gameplay hooks that plug straight into a project bundle.",
    accent: "#a05cff",
  },
  {
    icon: Bell,
    title: "Notification Library",
    body: "Compose life-sim styled popups with reusable templates for careers, traits, and aspirations — previewed in a game-inspired preview pane.",
    accent: "#5cd6ff",
  },
  {
    icon: ImageIcon,
    title: "Built-in Icon Library",
    body: "Over 200 original in-house icons ready to drop into careers, traits, aspirations, and notifications — plus upload your own art.",
    accent: "#e6ff5a",
  },
  {
    icon: Eye,
    title: "Live Game-Style Preview",
    body: "See how notifications, CAS cards, and career panels will read in-game while you edit — no compile round-trip.",
    accent: "#ff5cb0",
  },
  {
    icon: Layers,
    title: "Reusable Templates & Snippets",
    body: "Start from curated starter templates or save your own patterns as reusable scaffolds across future projects.",
    accent: "#a05cff",
  },
  {
    icon: ShieldCheck,
    title: "Validation & Project Organization",
    body: "Automatic checks for missing fields, broken references, and structural issues — so builds ship clean.",
    accent: "#5cd6ff",
  },
  {
    icon: Package,
    title: "Project Bundle Import & Export",
    body: "Portable `.mcbundle.json` files let you share, back up, and reload full projects — careers, traits, assets, and all.",
    accent: "#e6ff5a",
  },
  {
    icon: MessageSquareCode,
    title: "ChatGPT-assisted authoring",
    body: "Use the optional ChatGPT connector to help create and organize editable Mod Constructor project bundles.",
    accent: "#ff5cb0",
  },
];

function FeatureGrid() {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e6ff5a]">What's inside</div>
          <h2
            className="mt-3 text-3xl md:text-4xl font-black tracking-tight"
            style={{ fontFamily: '"Fredoka", "Inter", system-ui, sans-serif' }}
          >
            A studio for gameplay mods, not a code editor.
          </h2>
          <p className="mt-3 text-neutral-400">
            Every builder is designed for creators who want to ship polished content — not fight XML.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  accent,
}: {
  icon: typeof Briefcase;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <div
      className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/20 hover:bg-white/[0.04]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px opacity-70"
        style={{ background: `linear-gradient(90deg,transparent, ${accent}80, transparent)` }}
      />
      <div
        className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"
        style={{ background: `${accent}18`, color: accent }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-bold text-neutral-100">{title}</h3>
      <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">{body}</p>
    </div>
  );
}

function DownloadCTA() {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div
          className="relative overflow-hidden rounded-3xl border border-white/10 p-8 md:p-12"
          style={{
            background:
              "radial-gradient(80% 100% at 0% 0%, rgba(230,255,90,0.10), transparent 60%)," +
              "radial-gradient(80% 100% at 100% 100%, rgba(255,92,176,0.12), transparent 60%)," +
              "linear-gradient(180deg,#111017 0%, #0d0c14 100%)",
          }}
        >
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff8ec9]">
                Get Mod Constructor V6
              </div>
              <h2
                className="mt-2 text-3xl md:text-4xl font-black tracking-tight"
                style={{ fontFamily: '"Fredoka", "Inter", system-ui, sans-serif' }}
              >
                Downloads live on Patreon.
              </h2>
              <p className="mt-3 text-neutral-300 max-w-xl">
                Downloads, release notes, development updates, and optional early access are available
                through NeshaDenise Sims on Patreon.
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Patreon support helps fund development. Finished work is not intended to remain
                permanently paywalled.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <a
                href={PATREON_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff5cb0] px-5 py-3 text-sm font-bold text-black shadow-lg shadow-[#ff5cb0]/20 transition hover:brightness-110"
              >
                <Download className="h-4 w-4" />
                Visit NeshaDenise Sims on Patreon
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
              <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                Windows & macOS · Standalone desktop
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutCreator() {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-4xl px-5 py-20 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a05cff]">The creator</div>
        <h2
          className="mt-3 text-3xl md:text-4xl font-black tracking-tight"
          style={{ fontFamily: '"Fredoka", "Inter", system-ui, sans-serif' }}
        >
          About NeshaDenise Sims
        </h2>
        <p className="mt-4 text-neutral-300 max-w-2xl mx-auto">
          NeshaDenise Sims creates free gameplay mods for The Sims 4. Patreon support helps fund
          development and may provide optional early access; finished work is not intended to remain
          permanently paywalled.
        </p>
      </div>
    </section>
  );
}
