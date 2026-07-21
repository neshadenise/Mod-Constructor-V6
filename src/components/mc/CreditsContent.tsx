import { ExternalLink, Heart, ShieldAlert } from "lucide-react";
import { CREDITS, CATEGORY_LABEL, INDEPENDENCE_NOTICE, AUTHOR, type CreditEntry } from "@/lib/credits";

function EntryCard({ e }: { e: CreditEntry }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABEL[e.category]}
          </div>
          <h3 className="text-sm font-bold">{e.name}</h3>
        </div>
        {e.officialSourceUrl && (
          <a
            href={e.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer external"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-[var(--blue)] hover:bg-accent"
          >
            <ExternalLink className="h-3 w-3" />
            Official source
          </a>
        )}
      </header>

      <p className="mt-2 text-xs text-muted-foreground">{e.descriptionOfUse}</p>

      {e.usedAs.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Used as
          </div>
          <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
            {e.usedAs.map((u, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(e.permissionNotes || e.attributionRequirements) && (
        <div className="mt-3 space-y-1 rounded-md bg-muted/40 p-2 text-[11px] leading-snug">
          {e.attributionRequirements && (
            <div>
              <span className="font-semibold">Attribution: </span>
              <span className="text-muted-foreground">{e.attributionRequirements}</span>
            </div>
          )}
          {e.permissionNotes && (
            <div>
              <span className="font-semibold">Permissions: </span>
              <span className="text-muted-foreground">{e.permissionNotes}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10.5px] text-muted-foreground">
        {e.licenseOrTermsUrl && (
          <a
            href={e.licenseOrTermsUrl}
            target="_blank"
            rel="noopener noreferrer external"
            className="inline-flex items-center gap-1 hover:underline"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            License / terms
          </a>
        )}
        <span>Last reviewed: {e.lastReviewedDate}</span>
      </div>
    </article>
  );
}

export function CreditsContent({ showInternal = false }: { showInternal?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--orange)]/40 bg-[var(--orange)]/5 p-3">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--orange)]" />
          <div>
            <div className="text-xs font-semibold">Independence Notice</div>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {INDEPENDENCE_NOTICE}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Heart className="h-3.5 w-3.5 text-[var(--violet)]" />
          This app created by {AUTHOR}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          The sections below list external work that inspired or informed Mod
          Constructor V6. Attribution is factual only and does not imply
          endorsement.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {CREDITS.map((e) => (
          <EntryCard key={e.name} e={e} />
        ))}
      </div>

      {showInternal && (
        <details className="rounded-lg border border-dashed border-border bg-card p-3">
          <summary className="cursor-pointer text-[11px] font-semibold text-muted-foreground">
            Maintainer view — shipped material audit
          </summary>
          <div className="mt-2 space-y-2 text-[11px]">
            {CREDITS.map((e) => {
              const m = e._internalIncludesShippedMaterial;
              const flags = [
                ["code", m.code],
                ["data", m.data],
                ["assets", m.assets],
                ["schemas", m.schemas],
                ["files", m.files],
              ] as const;
              return (
                <div key={e.name} className="rounded-md border border-border bg-background p-2">
                  <div className="font-semibold">{e.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {flags.map(([k, v]) => (
                      <span
                        key={k}
                        className={
                          "rounded-full border px-1.5 py-0.5 text-[10px] font-medium " +
                          (v
                            ? "border-[var(--teal)]/40 bg-[var(--teal)]/10 text-[var(--teal)]"
                            : "border-border bg-muted text-muted-foreground")
                        }
                      >
                        {k}: {v ? "included" : "not included"}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 text-muted-foreground">{m.notes}</div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
