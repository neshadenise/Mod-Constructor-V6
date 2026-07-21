import { Link } from "@tanstack/react-router";
import { ExternalLink, Mail, MessageCircle, HelpCircle } from "lucide-react";
import { PATREON_URL } from "@/lib/app-mode";

function PageHeader({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-20 pb-8 text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e6ff5a]">{eyebrow}</div>
      <h1
        className="mt-3 text-4xl md:text-5xl font-black tracking-tight"
        style={{ fontFamily: '"Fredoka", "Inter", system-ui, sans-serif' }}
      >
        {title}
      </h1>
      {lead && <p className="mt-4 text-neutral-400 text-lg">{lead}</p>}
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 space-y-5 text-neutral-300 leading-relaxed [&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-neutral-100 [&_h3]:mt-6 [&_h3]:mb-1 [&_h3]:font-semibold [&_h3]:text-neutral-100 [&_a]:text-[#ff8ec9] [&_a:hover]:text-[#ff5cb0] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-neutral-300">
      {children}
    </div>
  );
}

export function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Independent, offline-first, creator-focused."
        lead="Mod Constructor V6 is a desktop workspace for Sims 4 gameplay mod creators."
      />
      <Prose>
        <p>
          Mod Constructor V6 is a standalone desktop application for authoring Sims 4 gameplay
          content — careers, traits, aspirations, notifications, and reusable templates — without
          hand-writing raw XML tuning.
        </p>
        <p>
          The workspace runs entirely on your machine. Projects live in a portable{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-[13px]">.mcbundle.json</code> file
          you can back up, share, and reopen at any time. Optional online updates can pull framework
          releases from lot51.cc when you choose to check.
        </p>
        <h2>Who it's for</h2>
        <ul>
          <li>Creators who want to focus on gameplay design, not tuning syntax.</li>
          <li>Modders who want validation, previewing, and packaging in one place.</li>
          <li>Teams sharing project bundles across Windows and macOS.</li>
        </ul>
        <h2>What it isn't</h2>
        <ul>
          <li>It isn't a browser-hosted editor. This website is an information and download page.</li>
          <li>
            It isn't affiliated with Electronic Arts or Maxis. The Sims™ is a trademark of
            Electronic Arts Inc.
          </li>
        </ul>
      </Prose>
    </>
  );
}

export function FeaturesPage() {
  const groups = [
    {
      title: "Content Builders",
      items: [
        ["Career Builder", "Ranks, uniforms, WFH events, salary curves, and every V5 message override."],
        ["Trait Builder", "Personality and gameplay traits with buffs, voice effects, aging blocks, and social replacements."],
        ["Aspiration Builder", "Multi-tier aspirations with milestones and rewards."],
      ],
    },
    {
      title: "Assets & Presentation",
      items: [
        ["Notification Library", "Life-sim styled popups with reusable templates."],
        ["Icon Library", "200+ original in-app icons plus custom uploads."],
        ["Live Game-Style Preview", "See notifications and CAS-style panels as you edit."],
      ],
    },
    {
      title: "Project Organization",
      items: [
        ["Reusable Templates & Snippets", "Start from curated scaffolds or save your own."],
        ["Validation Center", "Automatic checks for missing fields and broken references."],
        ["Project Bundle Import/Export", "Portable .mcbundle.json for backup and sharing."],
      ],
    },
    {
      title: "Optional Assistance",
      items: [
        [
          "ChatGPT-assisted bundle authoring",
          "Use the optional ChatGPT connector to help create and organize editable Mod Constructor project bundles. ChatGPT does not compile finished Sims 4 packages and does not access your local desktop projects automatically.",
        ],
      ],
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Features"
        title="Everything you need to ship polished gameplay mods."
        lead="Ten focused tools that turn gameplay ideas into installable Sims 4 content."
      />
      <div className="mx-auto max-w-4xl px-5 pb-16 space-y-10">
        {groups.map((g) => (
          <section key={g.title}>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff8ec9]">
              {g.title}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {g.items.map(([title, body]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                >
                  <div className="font-bold text-neutral-100">{title}</div>
                  <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
        <div className="pt-6 text-center">
          <a
            href={PATREON_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff5cb0] px-5 py-3 text-sm font-bold text-black transition hover:brightness-110"
          >
            Download on Patreon <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </>
  );
}

export function CreditsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Credits & Acknowledgements"
        title="Standing on shoulders."
        lead="Mod Constructor V6 exists thanks to the work of prior mod tooling authors and community frameworks."
      />
      <Prose>
        <h2>Created by</h2>
        <p>
          <strong>NeshaDenise Sims</strong> — design, direction, and creator of Mod Constructor V6.
        </p>
        <h2>Community foundations</h2>
        <ul>
          <li>
            <strong>Zerbu</strong> — original Mod Constructor series (V1–V5), which established the
            conceptual language of guided Sims 4 mod construction that V6 builds on.
          </li>
          <li>
            <strong>Lot 51 (lot51.cc)</strong> — Core Library framework and mod hosting infrastructure
            that many gameplay mods depend on.
          </li>
        </ul>
        <h2>Trademarks</h2>
        <p>
          The Sims™ is a trademark of Electronic Arts Inc. Mod Constructor V6 is an independent
          community-created tool and is not affiliated with or endorsed by Electronic Arts or Maxis.
        </p>
        <h2>Thanks</h2>
        <p>
          To every creator who tested early builds, filed issues, and shared their gameplay ideas —
          the app is better because of you.
        </p>
      </Prose>
    </>
  );
}

export function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy"
        title="What we do — and don't — collect."
        lead="Mod Constructor V6 is designed to run offline. Your projects belong to you."
      />
      <Prose>
        <h2>This website</h2>
        <p>
          This public site (
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-[13px]">/</code>,{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-[13px]">/features</code>,{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-[13px]">/about</code>,{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-[13px]">/credits</code>,{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-[13px]">/privacy</code>, and{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-[13px]">/support</code>) is a static
          information page. It does not ask you to sign in and does not require an account.
        </p>
        <h2>The desktop application</h2>
        <ul>
          <li>
            Projects, assets, templates, and settings are stored locally on your machine in a
            portable <code className="rounded bg-white/5 px-1.5 py-0.5 text-[13px]">.mcbundle.json</code>{" "}
            file and the app's local storage.
          </li>
          <li>The app is offline-first. No project data is transmitted anywhere by default.</li>
          <li>
            Optional lot51.cc update checks are opt-in and only exchange the minimum needed to
            retrieve framework release information.
          </li>
          <li>
            The optional ChatGPT connector sends only what you explicitly send it. It does not access
            your local files or projects automatically.
          </li>
        </ul>
        <h2>Patreon</h2>
        <p>
          Downloads and account management happen on Patreon under Patreon's own terms and privacy
          policy. See{" "}
          <a href={PATREON_URL} target="_blank" rel="noreferrer noopener">
            NeshaDenise Sims on Patreon
          </a>
          .
        </p>
      </Prose>
    </>
  );
}

export function SupportPage() {
  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Get help & stay in the loop."
        lead="Downloads, updates, and creator communication happen on Patreon."
      />
      <div className="mx-auto max-w-3xl px-5 pb-16 grid gap-4 sm:grid-cols-2">
        <SupportCard
          icon={MessageCircle}
          title="Patreon community"
          body="Release notes, development updates, community posts, and optional early access are posted on Patreon."
          cta="Visit Patreon"
          href={PATREON_URL}
          external
        />
        <SupportCard
          icon={HelpCircle}
          title="Feature overview"
          body="New to Mod Constructor V6? The Features page is the quickest tour of what's in the box."
          cta="View features"
          href="/features"
        />
        <SupportCard
          icon={Mail}
          title="Bug reports & feedback"
          body="Please send bug reports, ideas, and feedback through Patreon posts or DMs — that's where updates are coordinated."
          cta="Contact on Patreon"
          href={PATREON_URL}
          external
        />
        <SupportCard
          icon={HelpCircle}
          title="Credits & attribution"
          body="See who and what makes Mod Constructor V6 possible."
          cta="View credits"
          href="/credits"
        />
      </div>
    </>
  );
}

function SupportCard({
  icon: Icon,
  title,
  body,
  cta,
  href,
  external,
}: {
  icon: typeof Mail;
  title: string;
  body: string;
  cta: string;
  href: string;
  external?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col">
      <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-[#e6ff5a]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 font-bold text-neutral-100">{title}</div>
      <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed flex-1">{body}</p>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#ff8ec9] hover:text-[#ff5cb0]"
        >
          {cta} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : (
        <Link
          to={href as "/features" | "/credits"}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#ff8ec9] hover:text-[#ff5cb0]"
        >
          {cta} →
        </Link>
      )}
    </div>
  );
}
