/**
 * Credits & Acknowledgements data for Mod Constructor V6.
 *
 * Factual attribution only. This file is the single source of truth for
 * every credits surface — the Help menu dialog, Settings → About, the
 * README, and the packaged app's legal/about documentation. Do NOT
 * hardcode names, URLs, or attribution language elsewhere in the app.
 *
 * Nothing here implies endorsement, sponsorship, partnership,
 * affiliation, or official approval by any third party.
 */

export type CreditCategory =
  | "project-inspiration"
  | "technical-reference"
  | "authoring"
  | "other";

export interface CreditEntry {
  /** Person, project, or organization being credited. */
  name: string;
  /** Broad category of contribution. */
  category: CreditCategory;
  /** How their work was used, in plain language. */
  descriptionOfUse: string;
  /** Bulleted list of the specific ways this reference was consulted. */
  usedAs: string[];
  /** Official homepage / repository / resource URL. Opens externally. */
  officialSourceUrl?: string;
  /** URL to license terms when publicly available. */
  licenseOrTermsUrl?: string;
  /** Notes about any permissions that were requested or granted. */
  permissionNotes?: string;
  /** Attribution language required or requested by the source, if any. */
  attributionRequirements?: string;
  /** Files or components in this app derived from this source. */
  includedFilesOrComponents: string[];
  /** ISO date the entry was last verified by the maintainer. */
  lastReviewedDate: string;
  /**
   * Developer-only. Explicitly documents whether any code, data, assets,
   * schemas, or files from this source ship inside the application.
   * Rendered in a maintainer-facing view, not in end-user credits.
   */
  _internalIncludesShippedMaterial: {
    code: boolean;
    data: boolean;
    assets: boolean;
    schemas: boolean;
    files: boolean;
    notes: string;
  };
}

export const AUTHOR = "neshadenise";

export const INDEPENDENCE_NOTICE =
  "Mod Constructor V6 is an independent community-created tool. It is not affiliated with, endorsed by, sponsored by, or officially supported by Electronic Arts, Maxis, Zerbu, or Lot 51. All third-party names and trademarks belong to their respective owners.";

export const CREDITS: CreditEntry[] = [
  {
    name: "Zerbu — The Sims 4 Mod Constructor",
    category: "project-inspiration",
    descriptionOfUse:
      "Mod Constructor V6 acknowledges Zerbu's original Sims 4 Mod Constructor, which established an accessible visual workflow for creating Sims 4 traits, aspirations, interactions, careers, and other tuning-based mod content.",
    usedAs: [
      "Historical and conceptual inspiration",
      "Reference for common creator workflows",
      "Reference for how technical Sims tuning concepts can be presented to non-programmers",
      "Compatibility and migration reference where applicable",
    ],
    officialSourceUrl: "https://github.com/Zerbu/Mod-Constructor-5",
    permissionNotes:
      "No claim is made that Zerbu contributed code, assets, templates, or direct development support to Mod Constructor V6.",
    includedFilesOrComponents: [],
    lastReviewedDate: "2026-07-21",
    _internalIncludesShippedMaterial: {
      code: false,
      data: false,
      assets: false,
      schemas: false,
      files: false,
      notes:
        "Referenced conceptually only. No source files, tuning payloads, or assets from Zerbu's Mod Constructor are bundled or redistributed.",
    },
  },
  {
    name: "Lot 51 — TDESC resources",
    category: "technical-reference",
    descriptionOfUse:
      "Mod Constructor V6 acknowledges Lot 51's public TDESC resources as an external reference used to understand Sims 4 tuning descriptions, available fields, resource relationships, and game-version changes.",
    usedAs: [
      "Tuning-schema reference",
      "Field-definition reference",
      "Game-version compatibility reference",
      "Source reviewed when designing validation and update workflows",
    ],
    officialSourceUrl: "https://lot51.cc/tdesc",
    permissionNotes:
      "Lot 51 files are not bundled, mirrored, redistributed, or automatically downloaded. No claim is made that Lot 51 powers, maintains, verifies, or officially supports Mod Constructor V6.",
    includedFilesOrComponents: [],
    lastReviewedDate: "2026-07-21",
    _internalIncludesShippedMaterial: {
      code: false,
      data: false,
      assets: false,
      schemas: false,
      files: false,
      notes:
        "Referenced externally only. No TDESC files or derived schemas from Lot 51 are bundled with the application.",
    },
  },
  {
    name: AUTHOR,
    category: "authoring",
    descriptionOfUse: "This app created by neshadenise.",
    usedAs: ["Design, implementation, and maintenance of Mod Constructor V6"],
    includedFilesOrComponents: ["Entire application"],
    lastReviewedDate: "2026-07-21",
    _internalIncludesShippedMaterial: {
      code: true,
      data: true,
      assets: true,
      schemas: true,
      files: true,
      notes: "Primary author of shipped code, built-in templates, and assets.",
    },
  },
];

export const CATEGORY_LABEL: Record<CreditCategory, string> = {
  "project-inspiration": "Project Inspiration",
  "technical-reference": "Technical Reference",
  authoring: "Authoring",
  other: "Other",
};
