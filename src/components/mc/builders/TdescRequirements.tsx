/**
 * TDESC requirement checklist.
 *
 * Shows, for the record being edited, which tunables the class actually
 * requires and which are still empty, with a link to the published schema on
 * the Lot51 TDESC browser.
 */

import { AlertTriangle, Check, ExternalLink } from "lucide-react";
import { TDESC_SPECS, tdescDocUrl, type TdescFieldStatus, type TdescResourceKey } from "@/lib/gamedata/required-fields";
import { cn } from "@/lib/utils";

interface Props {
  resource: TdescResourceKey;
  statuses: TdescFieldStatus[];
  className?: string;
}

export function TdescRequirements({ resource, statuses, className }: Props) {
  const spec = TDESC_SPECS[resource];
  const missingRequired = statuses.filter((s) => !s.present && s.level === "required");
  const missingOptional = statuses.filter((s) => !s.present && s.level === "recommended");

  return (
    <section className={cn("rounded-lg border border-border bg-card/60 p-4", className)}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Tuning requirements · {spec.className}</h3>
          <p className="text-xs text-muted-foreground">{spec.summary}</p>
        </div>
        <a
          href={tdescDocUrl(spec.className)}
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
        >
          Schema <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      <ul className="space-y-1.5">
        {statuses.map((s) => (
          <li key={s.field} className="flex items-start gap-2 text-xs">
            {s.present ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            ) : (
              <AlertTriangle
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  s.level === "required" ? "text-destructive" : "text-muted-foreground",
                )}
              />
            )}
            <span className={cn(s.present ? "text-muted-foreground" : "text-foreground")}>
              <span className="font-medium">{s.label}</span>{" "}
              <code className="text-[10px] text-muted-foreground">{s.field}</code>
              {!s.present && <span className="block text-muted-foreground">{s.why}</span>}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">
        {missingRequired.length
          ? `${missingRequired.length} required tunable(s) missing — this resource is left out of the package until they are filled in.`
          : missingOptional.length
            ? `Ready to export. ${missingOptional.length} recommended tunable(s) still empty.`
            : "Ready to export — every tunable this class requires is filled in."}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Field list follows the {spec.className} tuning description on{" "}
        <a href={tdescDocUrl(spec.className)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          tdesc.lot51.cc
        </a>
        ; module <code>{spec.module}</code>.
      </p>
    </section>
  );
}
