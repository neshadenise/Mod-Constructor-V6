/**
 * Automatic prompt construction for career cover art.
 *
 * The creator never has to describe the image: everything is derived from the
 * career document. Advanced users can override individual knobs (mood, time of
 * day, camera…) and the prompt is rebuilt deterministically from those.
 */

export interface CoverPromptContext {
  careerName: string;
  careerDescription?: string;
  branchName?: string;
  branchDescription?: string;
  category?: string;
  careerType?: string;
  /** Rank titles, used to infer the promotion arc. */
  promotionTitles?: string[];
  skills?: string[];
  traits?: string[];
  rewards?: string[];
  events?: string[];
  objects?: string[];
  workOutfit?: string;
}

export interface CoverPromptOptions {
  sceneFocus?: string;
  simCount?: number;
  timeOfDay?: string;
  setting?: "Indoor" | "Outdoor" | "Auto";
  mood?: string;
  cameraAngle?: string;
  environment?: string;
  clothingStyle?: string;
  diversity?: string;
  props?: string;
  weather?: string;
  lighting?: string;
  extra?: string;
}

export const MOODS = [
  "Auto",
  "Creative",
  "Serious",
  "Elegant",
  "Chaotic",
  "Professional",
  "Luxury",
  "High Energy",
  "Friendly",
  "Corporate",
  "Scientific",
  "Dark",
  "Bright",
];

export const CAMERA_ANGLES = [
  "Cinematic wide promotional framing",
  "Medium-wide three-quarter view",
  "Slightly elevated establishing shot",
  "Low wide hero angle",
];

export const TIMES_OF_DAY = ["Auto", "Morning", "Midday", "Golden hour", "Evening", "Night"];

/** Keyword → { environment, action, mood } inference table. */
const CAREER_HINTS: { match: RegExp; env: string; action: string; mood: string; props: string }[] = [
  { match: /doctor|medic|nurse|hospital|surgeon/i, env: "a busy modern hospital ward", action: "examining a patient, reading charts and preparing equipment", mood: "Serious", props: "monitors, charts, medical trolleys" },
  { match: /chef|cook|culinary|restaurant|barista/i, env: "a bustling professional restaurant kitchen", action: "cooking on the line, plating dishes and calling orders", mood: "High Energy", props: "pans, ticket rail, prep stations" },
  { match: /photo/i, env: "a modern photography studio", action: "shooting a model while assistants adjust lighting rigs", mood: "Creative", props: "softboxes, tripods, backdrops" },
  { match: /dance|dancer|choreo/i, env: "a mirrored dance rehearsal studio", action: "rehearsing choreography mid-movement", mood: "High Energy", props: "barres, speakers, water bottles" },
  { match: /police|detective|law enforcement/i, env: "a city police station and street front", action: "directing traffic and reviewing a case board", mood: "Serious", props: "radios, cruisers, case boards" },
  { match: /lawyer|judge|court/i, env: "a wood-panelled courtroom", action: "presenting to the bench while clerks organise files", mood: "Elegant", props: "case files, gavel, benches" },
  { match: /teacher|school|educat|professor/i, env: "a bright classroom", action: "writing on the board while students work at desks", mood: "Friendly", props: "whiteboard, desks, posters" },
  { match: /engineer|tech|program|software|hacker/i, env: "an open-plan tech office", action: "debugging on multiple monitors and sketching on a glass wall", mood: "Corporate", props: "monitors, servers, whiteboards" },
  { match: /scien|lab|research|astro|space|navigator/i, env: "a research laboratory with instrument banks", action: "running experiments and reading live telemetry", mood: "Scientific", props: "consoles, samples, holo-displays" },
  { match: /music|singer|record|band|dj/i, env: "a recording studio control room", action: "tracking vocals while an engineer rides the console", mood: "Creative", props: "mixing desk, mics, monitors" },
  { match: /paint|art|sculpt|design/i, env: "a light-filled artist studio", action: "painting at an easel while assistants prepare materials", mood: "Creative", props: "canvases, brushes, pigment jars" },
  { match: /farm|garden|ranch/i, env: "a working farm at the edge of the fields", action: "harvesting crops and loading crates", mood: "Bright", props: "crates, tools, tractor" },
  { match: /mechanic|repair|garage/i, env: "an auto repair garage", action: "repairing a vehicle on a lift with tools in hand", mood: "Professional", props: "lifts, toolboxes, parts" },
  { match: /pilot|airline|aviat|airport/i, env: "an airport apron and cockpit", action: "running pre-flight checks with ground crew", mood: "Professional", props: "aircraft, checklists, ground carts" },
  { match: /journalis|report|news|writer/i, env: "a newsroom and city street", action: "interviewing a source while a colleague films", mood: "High Energy", props: "microphones, cameras, notebooks" },
  { match: /stream|influenc|content|social/i, env: "a colourful home studio", action: "recording content with ring lights and a live chat on screen", mood: "Bright", props: "ring light, capture rig, mics" },
  { match: /salon|stylist|beauty|hair|tattoo/i, env: "a stylish salon", action: "styling a client mid-appointment", mood: "Elegant", props: "chairs, mirrors, product shelves" },
  { match: /construct|builder|architect/i, env: "an active construction site", action: "framing a structure and reviewing plans", mood: "Professional", props: "scaffolding, plans, power tools" },
  { match: /business|corporate|executive|finance|sales/i, env: "a downtown corporate office", action: "presenting figures to colleagues around a table", mood: "Corporate", props: "screens, charts, laptops" },
  { match: /retail|store|warehouse|delivery/i, env: "a busy retail floor and stockroom", action: "restocking shelves and helping customers", mood: "Friendly", props: "shelving, carts, boxes" },
  { match: /actor|film|movie|theat/i, env: "a working movie set", action: "performing a take while crew handle lights and boom", mood: "Creative", props: "cameras, marks, lighting rigs" },
  { match: /athlet|sport|fitness|coach/i, env: "a training facility", action: "coaching a session mid-drill", mood: "High Energy", props: "equipment, cones, benches" },
  { match: /military|soldier|army/i, env: "a training base", action: "running a field exercise", mood: "Serious", props: "vehicles, gear, radios" },
];

function hint(ctx: CoverPromptContext) {
  const hay = [ctx.careerName, ctx.branchName, ctx.category, ctx.careerDescription]
    .filter(Boolean)
    .join(" ");
  return (
    CAREER_HINTS.find((h) => h.match.test(hay)) ?? {
      env: "a believable workplace matching the profession",
      action: "actively working, mid-task, interacting naturally",
      mood: "Professional",
      props: "profession-appropriate tools and equipment",
    }
  );
}

/** Style rules applied to every generated cover. */
export const COVER_STYLE_RULES = [
  "promotional key art for a life simulation game",
  "stylized realistic 3D characters in the spirit of life-sim games, original characters only",
  "not concept art, not a digital painting, not anime, not an illustration",
  "characters must not resemble any existing game's promotional characters",
  "diverse ages, ethnicities and body types, expressive and alive, profession-appropriate clothing",
  "landscape orientation, wide cinematic composition, medium distance, never a close-up portrait",
  "characters occupy roughly 60-75% of the frame with generous padding around the subjects so the frame can be cropped without cutting anyone off",
  "nobody posing at the camera — a candid moment in the middle of work",
  "no text, no logos, no UI, no borders, no speech bubbles, no watermarks, no copyrighted or branded assets",
].join("; ");

export function buildCoverPrompt(
  ctx: CoverPromptContext,
  options: CoverPromptOptions = {},
): string {
  const h = hint(ctx);
  const subject = ctx.branchName ? `${ctx.careerName} — ${ctx.branchName}` : ctx.careerName;
  const count = options.simCount ?? 3;
  const mood = options.mood && options.mood !== "Auto" ? options.mood : h.mood;
  const env = options.environment?.trim() || h.env;
  const focus = options.sceneFocus?.trim() || h.action;
  const camera = options.cameraAngle || CAMERA_ANGLES[0];

  const bits: string[] = [
    `A ${mood.toLowerCase()} life-simulation scene showing ${count} original Sim-like characters working as ${subject || "professionals"} in ${env}.`,
    `They are ${focus}.`,
  ];

  if (ctx.branchDescription) bits.push(`Career path focus: ${ctx.branchDescription}.`);
  else if (ctx.careerDescription) bits.push(`Career context: ${ctx.careerDescription}.`);

  if (ctx.promotionTitles?.length)
    bits.push(`Progression from ${ctx.promotionTitles[0]} up to ${ctx.promotionTitles[ctx.promotionTitles.length - 1]}.`);
  if (ctx.skills?.length) bits.push(`Skills on display: ${ctx.skills.slice(0, 4).join(", ")}.`);
  if (ctx.traits?.length) bits.push(`Personality of the workers: ${ctx.traits.slice(0, 3).join(", ")}.`);
  if (ctx.rewards?.length) bits.push(`Career rewards visible in the space: ${ctx.rewards.slice(0, 3).join(", ")}.`);
  if (ctx.events?.length) bits.push(`Hint at career events like ${ctx.events.slice(0, 2).join(" and ")}.`);
  if (ctx.workOutfit) bits.push(`Work outfit: ${ctx.workOutfit}.`);

  bits.push(`Props: ${options.props?.trim() || h.props}.`);
  if (options.setting && options.setting !== "Auto") bits.push(`${options.setting} setting.`);
  if (options.timeOfDay && options.timeOfDay !== "Auto") bits.push(`${options.timeOfDay}.`);
  if (options.weather?.trim()) bits.push(`Weather: ${options.weather.trim()}.`);
  bits.push(options.lighting?.trim() || "Soft cinematic key lighting with warm bounce.");
  if (options.clothingStyle?.trim()) bits.push(`Clothing style: ${options.clothingStyle.trim()}.`);
  bits.push(options.diversity?.trim() || "Cast is diverse in age, ethnicity and body type.");
  bits.push(`${camera}.`);
  if (options.extra?.trim()) bits.push(options.extra.trim());

  bits.push(COVER_STYLE_RULES + ".");
  return bits.join(" ");
}
