/**
 * Default Icon Library — built-in read-only asset pack.
 *
 * Every entry is a metadata record. The visual is rendered by `IconArt`
 * from a shared painted-disc visual system (gradient background per
 * category + rim light + soft ambient shadow + crisp filled glyph),
 * so all ~200 icons feel like the same production pack.
 *
 * Future compatibility: when AI-generated painterly PNGs are added they
 * use the same `IconAsset` shape, with `kind = "generated"` and a `url`
 * field. Every icon picker, favorite list, and "Used By" panel is keyed
 * on `IconRef` so no UI redesign is needed to swap in raster art later.
 */

import {
  // Careers
  Stethoscope, HeartPulse, Ambulance, Syringe, Pill, Microscope, FlaskConical,
  GraduationCap, BookOpen, Presentation, School, Library,
  Shield, Siren, Gavel, Scale, Landmark, Building2, Building, Warehouse,
  Cpu, Monitor, Code2, Server, Wifi, Radio, Satellite,
  Briefcase, TrendingUp, LineChart, PieChart, Coins, DollarSign, CreditCard, Banknote,
  ShoppingBag, ShoppingCart, Store, Tag, Truck, Package as PackageIcon, PackageCheck,
  UtensilsCrossed, ChefHat, CookingPot, Wine, Coffee, Pizza, IceCream, Cake,
  Tractor, Sprout, Wheat, TreePine, TreeDeciduous, Leaf, Flower2,
  Palette, Brush, PenTool, Scissors, Camera, Film, Clapperboard, Music, Music2, Guitar, Mic, Mic2, Drum, Piano, Headphones,
  Newspaper, Tv, Rss, Megaphone, BookMarked,
  Car, Bus, Plane, Ship, Train, Bike, Fuel,
  Sparkles as SparklesIcon,
  HardHat, Hammer, Wrench, Ruler, Cog,
  Flag, Star as StarIcon, Award, Medal, Trophy, Crown,
  Swords, Rocket, Anchor, Compass, Map,
  HeartHandshake, Handshake, Users, Baby, Users2, UserRound, UserPlus, UserMinus, UserCheck, UserCog, User,
  Dumbbell, Bike as BikeIcon, Activity, ActivitySquare, HeartCrack, Heart, HeartHandshake as HeartHandshake2,
  Home, Bed, DoorOpen, Sofa, Bath, Cctv,
  Trees, Mountain, MountainSnow, Sunrise, Sunset, Sun, Moon, CloudRain, CloudSnow, Cloud, Wind, Snowflake, Rainbow,
  Waves, Fish, Bird, Bug, Dog, Cat, Rabbit, PawPrint, Squirrel, Turtle,
  BookMarked as BookMarkedIcon, BookOpenText, Feather,
  Zap, Flame, Droplet, Droplets, Bolt, Lightbulb,
  Watch, Timer, Hourglass, AlarmClock, Clock,
  Wand2, Skull, Ghost, Gem, Diamond,
  Puzzle, Dice5, Gamepad2, Joystick,
  Smartphone, Tablet, Laptop, Keyboard, Mouse, Printer, HardDrive,
  Beaker, TestTube, Atom, Dna, Telescope,
  Trophy as TrophyIcon, Ribbon, BadgeCheck, Key, KeyRound, Lock, LockKeyhole, Unlock, Vault,
  Gift, Egg, Cookie, Candy,
  Umbrella, Tent, Palmtree, Sailboat, Backpack,
  Glasses, Shirt, Watch as WatchIcon, Gem as GemIcon,
  Cross, Church, Zap as ZapIcon,
  Recycle, Wind as WindIcon, Globe, Globe2,
  Notebook, NotebookPen, PenLine, Pencil, Highlighter, Paperclip, ClipboardList,
  Search, Eye, Lightbulb as LightbulbIcon,
  MessageCircle, MessageSquare, Send, Mail, Phone,
  Baby as BabyIcon, HeartHandshake as HH,
  FolderHeart, Bookmark, Layers, Grid3x3,
  Fingerprint, Puzzle as PuzzleIcon,
  Rocket as RocketIcon, Orbit, Sparkle,
  ChevronsUp, Award as AwardIcon,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

/* ============================================================ */
/*   Shared types                                                */
/* ============================================================ */

export type IconCategory =
  | "careers"
  | "traits"
  | "skills"
  | "rewards"
  | "relationships"
  | "lifestyle"
  | "objects"
  | "worlds"
  | "notifications";

export const CATEGORY_LABEL: Record<IconCategory, string> = {
  careers: "Careers",
  traits: "Traits",
  skills: "Skills",
  rewards: "Rewards",
  relationships: "Relationships",
  lifestyle: "Lifestyle",
  objects: "Objects",
  worlds: "Worlds",
  notifications: "Notifications",
};

/** Category → base hue (h,s,l) used by the painted-disc renderer. */
export const CATEGORY_HUE: Record<IconCategory, { h: number; s: number; l: number }> = {
  careers: { h: 212, s: 78, l: 54 },        // deep blue
  traits: { h: 282, s: 62, l: 58 },         // violet
  skills: { h: 174, s: 62, l: 44 },         // teal
  rewards: { h: 42, s: 92, l: 56 },         // gold
  relationships: { h: 342, s: 74, l: 60 },  // rose
  lifestyle: { h: 152, s: 52, l: 46 },      // emerald
  objects: { h: 24, s: 74, l: 56 },         // amber-orange
  worlds: { h: 198, s: 74, l: 52 },         // sky
  notifications: { h: 12, s: 82, l: 58 },   // coral
};

export type IconAsset = {
  id: string;               // stable UID, e.g. "def.career.doctor"
  name: string;
  category: IconCategory;
  subcategory?: string;
  keywords: string[];       // search terms
  tags: string[];           // free-form ("emotional", "occult", "family")
  theme?: string;           // narrative anchor ("medical", "fantasy")
  version: string;
  usage?: string;           // recommended usage hint
  kind: "builtin" | "project" | "generated";
  glyph: LucideIcon;        // renderer input (builtin/generated share model)
  /** Optional url for raster variants (future AI-painted PNGs). */
  url?: string;
};

/** Reference stored on parent entities (careers, traits, …). */
export type IconRef = {
  kind: "builtin" | "project" | "generated";
  id: string;
};

/* ============================================================ */
/*   Icon catalog                                                */
/* ============================================================ */

const V = "1.0";

function make(
  id: string,
  name: string,
  category: IconCategory,
  glyph: LucideIcon,
  extra: Partial<Omit<IconAsset, "id" | "name" | "category" | "glyph" | "kind" | "version">> = {},
): IconAsset {
  return {
    id: `def.${id}`,
    name,
    category,
    glyph,
    kind: "builtin",
    version: V,
    keywords: extra.keywords ?? [],
    tags: extra.tags ?? [],
    subcategory: extra.subcategory,
    theme: extra.theme,
    usage: extra.usage,
  };
}

/* ---------- Careers (60) ---------- */
const CAREERS: IconAsset[] = [
  // Healthcare
  make("career.doctor", "Doctor", "careers", Stethoscope, { subcategory: "Healthcare", keywords: ["medical", "physician", "hospital"], tags: ["medical"] }),
  make("career.nurse", "Nurse", "careers", HeartPulse, { subcategory: "Healthcare", keywords: ["medical", "care"], tags: ["medical"] }),
  make("career.paramedic", "Paramedic", "careers", Ambulance, { subcategory: "Emergency", keywords: ["ems", "ambulance"], tags: ["emergency"] }),
  make("career.surgeon", "Surgeon", "careers", Syringe, { subcategory: "Healthcare", keywords: ["operate", "hospital"], tags: ["medical"] }),
  make("career.pharmacist", "Pharmacist", "careers", Pill, { subcategory: "Healthcare", keywords: ["pharmacy", "medicine"], tags: ["medical"] }),
  make("career.researcher", "Medical Researcher", "careers", Microscope, { subcategory: "Science", keywords: ["lab", "study"], tags: ["science"] }),
  make("career.chemist", "Chemist", "careers", FlaskConical, { subcategory: "Science", keywords: ["lab", "flask"], tags: ["science"] }),
  make("career.biologist", "Biologist", "careers", Dna, { subcategory: "Science", keywords: ["genetics", "life"], tags: ["science"] }),
  make("career.astronomer", "Astronomer", "careers", Telescope, { subcategory: "Science", keywords: ["space", "star"], tags: ["science"] }),
  make("career.physicist", "Physicist", "careers", Atom, { subcategory: "Science", keywords: ["particle", "energy"], tags: ["science"] }),

  // Education
  make("career.teacher", "Teacher", "careers", GraduationCap, { subcategory: "Education", keywords: ["school", "educator"], tags: ["education"] }),
  make("career.professor", "Professor", "careers", Presentation, { subcategory: "Education", keywords: ["lecture", "university"], tags: ["education"] }),
  make("career.principal", "Principal", "careers", School, { subcategory: "Education", keywords: ["headmaster", "admin"], tags: ["education"] }),
  make("career.librarian", "Librarian", "careers", Library, { subcategory: "Education", keywords: ["books", "archive"], tags: ["education"] }),

  // Emergency / Law
  make("career.police", "Police Officer", "careers", Shield, { subcategory: "Law", keywords: ["cop", "detective"], tags: ["law"] }),
  make("career.firefighter", "Firefighter", "careers", Siren, { subcategory: "Emergency", keywords: ["rescue", "fire"], tags: ["emergency"] }),
  make("career.lawyer", "Lawyer", "careers", Gavel, { subcategory: "Law", keywords: ["attorney", "court"], tags: ["law"] }),
  make("career.judge", "Judge", "careers", Scale, { subcategory: "Law", keywords: ["justice", "court"], tags: ["law"] }),
  make("career.politician", "Politician", "careers", Landmark, { subcategory: "Government", keywords: ["gov", "office"], tags: ["gov"] }),
  make("career.military", "Military Officer", "careers", Flag, { subcategory: "Military", keywords: ["army", "service"], tags: ["military"] }),

  // Engineering & Tech
  make("career.engineer", "Engineer", "careers", Cog, { subcategory: "Engineering", keywords: ["mechanical"], tags: ["stem"] }),
  make("career.developer", "Software Developer", "careers", Code2, { subcategory: "Tech", keywords: ["code", "programmer"], tags: ["stem"] }),
  make("career.itspecialist", "IT Specialist", "careers", Server, { subcategory: "Tech", keywords: ["server", "network"], tags: ["stem"] }),
  make("career.architect", "Architect", "careers", Ruler, { subcategory: "Architecture", keywords: ["design", "buildings"], tags: ["stem"] }),
  make("career.robotics", "Roboticist", "careers", Cpu, { subcategory: "Tech", keywords: ["ai", "robots"], tags: ["stem"] }),

  // Business / Finance
  make("career.executive", "Business Executive", "careers", Briefcase, { subcategory: "Business", keywords: ["office", "corporate"], tags: ["business"] }),
  make("career.investor", "Investor", "careers", TrendingUp, { subcategory: "Finance", keywords: ["stocks", "market"], tags: ["business"] }),
  make("career.analyst", "Financial Analyst", "careers", LineChart, { subcategory: "Finance", keywords: ["charts"], tags: ["business"] }),
  make("career.accountant", "Accountant", "careers", PieChart, { subcategory: "Finance", keywords: ["tax", "books"], tags: ["business"] }),
  make("career.banker", "Banker", "careers", Banknote, { subcategory: "Finance", keywords: ["money"], tags: ["business"] }),

  // Retail / Hospitality
  make("career.retail", "Retail Associate", "careers", ShoppingBag, { subcategory: "Retail", keywords: ["store"], tags: ["service"] }),
  make("career.cashier", "Cashier", "careers", CreditCard, { subcategory: "Retail", keywords: ["checkout"], tags: ["service"] }),
  make("career.shopowner", "Shop Owner", "careers", Store, { subcategory: "Retail", keywords: ["merchant"], tags: ["service"] }),
  make("career.hotel", "Hotel Manager", "careers", Building, { subcategory: "Hospitality", keywords: ["hospitality"], tags: ["service"] }),
  make("career.barista", "Barista", "careers", Coffee, { subcategory: "Culinary", keywords: ["cafe"], tags: ["service"] }),

  // Culinary
  make("career.chef", "Chef", "careers", ChefHat, { subcategory: "Culinary", keywords: ["kitchen", "cook"], tags: ["culinary"] }),
  make("career.baker", "Baker", "careers", Cake, { subcategory: "Culinary", keywords: ["pastry"], tags: ["culinary"] }),
  make("career.sommelier", "Sommelier", "careers", Wine, { subcategory: "Culinary", keywords: ["wine"], tags: ["culinary"] }),

  // Agriculture / Environment
  make("career.farmer", "Farmer", "careers", Tractor, { subcategory: "Agriculture", keywords: ["farm"], tags: ["nature"] }),
  make("career.gardener", "Gardener", "careers", Sprout, { subcategory: "Agriculture", keywords: ["plants"], tags: ["nature"] }),
  make("career.forester", "Forester", "careers", TreePine, { subcategory: "Environment", keywords: ["woods"], tags: ["nature"] }),
  make("career.ecologist", "Ecologist", "careers", Leaf, { subcategory: "Environment", keywords: ["environment"], tags: ["nature"] }),

  // Creative arts / entertainment
  make("career.painter", "Painter", "careers", Palette, { subcategory: "Arts", keywords: ["artist"], tags: ["creative"] }),
  make("career.illustrator", "Illustrator", "careers", Brush, { subcategory: "Arts", keywords: ["draw"], tags: ["creative"] }),
  make("career.designer", "Designer", "careers", PenTool, { subcategory: "Arts", keywords: ["graphic"], tags: ["creative"] }),
  make("career.photographer", "Photographer", "careers", Camera, { subcategory: "Media", keywords: ["photo"], tags: ["creative"] }),
  make("career.filmmaker", "Filmmaker", "careers", Clapperboard, { subcategory: "Media", keywords: ["film", "director"], tags: ["creative"] }),
  make("career.musician", "Musician", "careers", Music, { subcategory: "Music", keywords: ["band"], tags: ["creative"] }),
  make("career.singer", "Singer", "careers", Mic2, { subcategory: "Music", keywords: ["vocal"], tags: ["creative"] }),
  make("career.dj", "DJ", "careers", Headphones, { subcategory: "Music", keywords: ["mix"], tags: ["creative"] }),
  make("career.writer", "Writer", "careers", Feather, { subcategory: "Media", keywords: ["author", "novelist"], tags: ["creative"] }),
  make("career.journalist", "Journalist", "careers", Newspaper, { subcategory: "Media", keywords: ["news"], tags: ["creative"] }),
  make("career.broadcaster", "Broadcaster", "careers", Tv, { subcategory: "Media", keywords: ["tv"], tags: ["creative"] }),

  // Transportation
  make("career.driver", "Driver", "careers", Car, { subcategory: "Transport", keywords: ["taxi"], tags: ["transport"] }),
  make("career.pilot", "Pilot", "careers", Plane, { subcategory: "Transport", keywords: ["airline"], tags: ["transport"] }),
  make("career.captain", "Ship Captain", "careers", Ship, { subcategory: "Transport", keywords: ["sea"], tags: ["transport"] }),
  make("career.engineerTrain", "Train Engineer", "careers", Train, { subcategory: "Transport", keywords: ["rail"], tags: ["transport"] }),

  // Trades
  make("career.builder", "Construction Worker", "careers", HardHat, { subcategory: "Construction", keywords: ["build"], tags: ["trade"] }),
  make("career.carpenter", "Carpenter", "careers", Hammer, { subcategory: "Construction", keywords: ["wood"], tags: ["trade"] }),
  make("career.mechanic", "Mechanic", "careers", Wrench, { subcategory: "Construction", keywords: ["fix"], tags: ["trade"] }),

  // Other
  make("career.archaeologist", "Archaeologist", "careers", Compass, { subcategory: "Research", keywords: ["explore", "ancient"], tags: ["science"] }),
  make("career.athlete", "Athlete", "careers", Dumbbell, { subcategory: "Sports", keywords: ["fitness"], tags: ["sports"] }),
  make("career.coach", "Sports Coach", "careers", ActivitySquare, { subcategory: "Sports", keywords: ["train"], tags: ["sports"] }),
  make("career.freelancer", "Freelancer", "careers", Laptop, { subcategory: "Freelance", keywords: ["remote"], tags: ["business"] }),
  make("career.nonprofit", "Nonprofit Worker", "careers", HeartHandshake, { subcategory: "Nonprofit", keywords: ["charity"], tags: ["service"] }),
];

/* ---------- Traits (40) ---------- */
const TRAITS: IconAsset[] = [
  make("trait.cheerful", "Cheerful", "traits", SparklesIcon, { subcategory: "Emotional", keywords: ["happy"], tags: ["emotional"] }),
  make("trait.gloomy", "Gloomy", "traits", CloudRain, { subcategory: "Emotional", keywords: ["sad"], tags: ["emotional"] }),
  make("trait.hotheaded", "Hot-Headed", "traits", Flame, { subcategory: "Emotional", keywords: ["angry"], tags: ["emotional"] }),
  make("trait.calm", "Calm", "traits", Waves, { subcategory: "Emotional", keywords: ["zen"], tags: ["emotional"] }),
  make("trait.brave", "Brave", "traits", Shield, { subcategory: "Behavioral", keywords: ["courage"], tags: ["behavior"] }),
  make("trait.timid", "Timid", "traits", HeartCrack, { subcategory: "Behavioral", keywords: ["shy"], tags: ["behavior"] }),
  make("trait.outgoing", "Outgoing", "traits", Users, { subcategory: "Social", keywords: ["extrovert"], tags: ["social"] }),
  make("trait.loner", "Loner", "traits", UserRound, { subcategory: "Social", keywords: ["introvert"], tags: ["social"] }),
  make("trait.charismatic", "Charismatic", "traits", MessageCircle, { subcategory: "Social", keywords: ["charm"], tags: ["social"] }),
  make("trait.mean", "Mean", "traits", UserMinus, { subcategory: "Social", keywords: ["cruel"], tags: ["social"] }),
  make("trait.creative", "Creative", "traits", Palette, { subcategory: "Creative", keywords: ["art"], tags: ["creative"] }),
  make("trait.musical", "Musical", "traits", Music2, { subcategory: "Creative", keywords: ["music"], tags: ["creative"] }),
  make("trait.bookworm", "Bookworm", "traits", BookOpenText, { subcategory: "Intellectual", keywords: ["reader"], tags: ["intellect"] }),
  make("trait.genius", "Genius", "traits", LightbulbIcon, { subcategory: "Intellectual", keywords: ["smart"], tags: ["intellect"] }),
  make("trait.geek", "Geek", "traits", Gamepad2, { subcategory: "Intellectual", keywords: ["nerd"], tags: ["intellect"] }),
  make("trait.family", "Family-Oriented", "traits", Users2, { subcategory: "Family", keywords: ["kin"], tags: ["family"] }),
  make("trait.parent", "Great Parent", "traits", UserCheck, { subcategory: "Family", keywords: ["mom", "dad"], tags: ["family"] }),
  make("trait.romantic", "Romantic", "traits", Heart, { subcategory: "Relationships", keywords: ["love"], tags: ["romance"] }),
  make("trait.flirt", "Flirty", "traits", HH, { subcategory: "Relationships", keywords: ["date"], tags: ["romance"] }),
  make("trait.jealous", "Jealous", "traits", Eye, { subcategory: "Relationships", keywords: ["envy"], tags: ["romance"] }),
  make("trait.vampire", "Vampire", "traits", Skull, { subcategory: "Occult", keywords: ["undead"], tags: ["occult"] }),
  make("trait.witch", "Spellcaster", "traits", Wand2, { subcategory: "Occult", keywords: ["magic"], tags: ["occult"] }),
  make("trait.ghost", "Ghost", "traits", Ghost, { subcategory: "Occult", keywords: ["haunt"], tags: ["occult"] }),
  make("trait.mermaid", "Mermaid", "traits", Fish, { subcategory: "Occult", keywords: ["ocean"], tags: ["occult"] }),
  make("trait.alien", "Alien", "traits", Orbit, { subcategory: "Occult", keywords: ["space"], tags: ["occult"] }),
  make("trait.foodie", "Foodie", "traits", UtensilsCrossed, { subcategory: "Lifestyle", keywords: ["gourmet"], tags: ["lifestyle"] }),
  make("trait.activepersona", "Active", "traits", Activity, { subcategory: "Lifestyle", keywords: ["fitness"], tags: ["lifestyle"] }),
  make("trait.slob", "Slob", "traits", Cctv, { subcategory: "Lifestyle", keywords: ["messy"], tags: ["lifestyle"] }),
  make("trait.neat", "Neat", "traits", Grid3x3, { subcategory: "Lifestyle", keywords: ["clean"], tags: ["lifestyle"] }),
  make("trait.materialistic", "Materialistic", "traits", GemIcon, { subcategory: "Ambition", keywords: ["luxury"], tags: ["ambition"] }),
  make("trait.ambitious", "Ambitious", "traits", ChevronsUp, { subcategory: "Ambition", keywords: ["drive"], tags: ["ambition"] }),
  make("trait.lazy", "Lazy", "traits", Bed, { subcategory: "Ambition", keywords: ["rest"], tags: ["ambition"] }),
  make("trait.evil", "Evil", "traits", Skull, { subcategory: "Morality", keywords: ["villain"], tags: ["morality"] }),
  make("trait.good", "Good", "traits", BadgeCheck, { subcategory: "Morality", keywords: ["kind"], tags: ["morality"] }),
  make("trait.adventurer", "Adventurer", "traits", Compass, { subcategory: "Hobbies", keywords: ["explore"], tags: ["hobby"] }),
  make("trait.collector", "Collector", "traits", Layers, { subcategory: "Hobbies", keywords: ["hoard"], tags: ["hobby"] }),
  make("trait.gardenerT", "Green Thumb", "traits", Flower2, { subcategory: "Hobbies", keywords: ["plants"], tags: ["hobby"] }),
  make("trait.animallover", "Animal Lover", "traits", PawPrint, { subcategory: "Hobbies", keywords: ["pets"], tags: ["hobby"] }),
  make("trait.perfectionist", "Perfectionist", "traits", Ruler, { subcategory: "Character", keywords: ["exact"], tags: ["character"] }),
  make("trait.loyal", "Loyal", "traits", Handshake, { subcategory: "Character", keywords: ["true"], tags: ["character"] }),
];

/* ---------- Skills (25) ---------- */
const SKILLS: IconAsset[] = [
  make("skill.cooking", "Cooking", "skills", CookingPot, { keywords: ["kitchen"], tags: ["life"] }),
  make("skill.baking", "Baking", "skills", Cake, { keywords: ["pastry"], tags: ["life"] }),
  make("skill.mixology", "Mixology", "skills", Wine, { keywords: ["bar"], tags: ["life"] }),
  make("skill.programming", "Programming", "skills", Code2, { keywords: ["code"], tags: ["tech"] }),
  make("skill.robotics", "Robotics", "skills", Cpu, { keywords: ["robots"], tags: ["tech"] }),
  make("skill.rocket", "Rocket Science", "skills", RocketIcon, { keywords: ["space"], tags: ["tech"] }),
  make("skill.gardening", "Gardening", "skills", Sprout, { keywords: ["plants"], tags: ["life"] }),
  make("skill.logic", "Logic", "skills", Puzzle, { keywords: ["chess"], tags: ["mental"] }),
  make("skill.painting", "Painting", "skills", Palette, { keywords: ["easel"], tags: ["creative"] }),
  make("skill.photography", "Photography", "skills", Camera, { keywords: ["photo"], tags: ["creative"] }),
  make("skill.writing", "Writing", "skills", PenLine, { keywords: ["author"], tags: ["creative"] }),
  make("skill.guitar", "Guitar", "skills", Guitar, { keywords: ["music"], tags: ["creative"] }),
  make("skill.piano", "Piano", "skills", Piano, { keywords: ["music"], tags: ["creative"] }),
  make("skill.violin", "Violin", "skills", Music2, { keywords: ["strings"], tags: ["creative"] }),
  make("skill.singing", "Singing", "skills", Mic, { keywords: ["voice"], tags: ["creative"] }),
  make("skill.dj", "DJ Mixing", "skills", Headphones, { keywords: ["mix"], tags: ["creative"] }),
  make("skill.fitness", "Fitness", "skills", Dumbbell, { keywords: ["gym"], tags: ["physical"] }),
  make("skill.handiness", "Handiness", "skills", Wrench, { keywords: ["repair"], tags: ["life"] }),
  make("skill.charisma", "Charisma", "skills", MessageCircle, { keywords: ["talk"], tags: ["social"] }),
  make("skill.parenting", "Parenting", "skills", Baby, { keywords: ["family"], tags: ["life"] }),
  make("skill.fabrication", "Fabrication", "skills", Cog, { keywords: ["craft"], tags: ["creative"] }),
  make("skill.wellness", "Wellness", "skills", Activity, { keywords: ["yoga"], tags: ["physical"] }),
  make("skill.research", "Research", "skills", Search, { keywords: ["study"], tags: ["mental"] }),
  make("skill.archaeology", "Archaeology", "skills", Compass, { keywords: ["dig"], tags: ["mental"] }),
  make("skill.comedy", "Comedy", "skills", Sparkle, { keywords: ["jokes"], tags: ["social"] }),
  make("skill.fishing", "Fishing", "skills", Fish, { keywords: ["angling"], tags: ["outdoor"] }),
];

/* ---------- Rewards (18) ---------- */
const REWARDS: IconAsset[] = [
  make("reward.money", "Simoleons", "rewards", DollarSign, { keywords: ["cash"], tags: ["money"] }),
  make("reward.bill", "Cash Bundle", "rewards", Banknote, { keywords: ["bills"], tags: ["money"] }),
  make("reward.coins", "Coins", "rewards", Coins, { keywords: ["gold"], tags: ["money"] }),
  make("reward.badge", "Badge", "rewards", BadgeCheck, { keywords: ["proof"], tags: ["badge"] }),
  make("reward.ribbon", "Ribbon", "rewards", Ribbon, { keywords: ["merit"], tags: ["badge"] }),
  make("reward.medal", "Medal", "rewards", Medal, { keywords: ["honor"], tags: ["badge"] }),
  make("reward.trophy", "Trophy", "rewards", Trophy, { keywords: ["cup"], tags: ["trophy"] }),
  make("reward.crown", "Crown", "rewards", Crown, { keywords: ["royal"], tags: ["trophy"] }),
  make("reward.star", "Star", "rewards", StarIcon, { keywords: ["rating"], tags: ["achievement"] }),
  make("reward.gem", "Gem", "rewards", Gem, { keywords: ["jewel"], tags: ["luxury"] }),
  make("reward.diamond", "Diamond", "rewards", Diamond, { keywords: ["rare"], tags: ["luxury"] }),
  make("reward.gift", "Gift", "rewards", Gift, { keywords: ["present"], tags: ["gift"] }),
  make("reward.key", "Key", "rewards", KeyRound, { keywords: ["unlock"], tags: ["unlock"] }),
  make("reward.vault", "Vault", "rewards", Vault, { keywords: ["safe"], tags: ["unlock"] }),
  make("reward.unlock", "Unlock", "rewards", Unlock, { keywords: ["open"], tags: ["unlock"] }),
  make("reward.trophy2", "Championship", "rewards", TrophyIcon, { keywords: ["win"], tags: ["trophy"] }),
  make("reward.award", "Achievement", "rewards", AwardIcon, { keywords: ["done"], tags: ["achievement"] }),
  make("reward.certificate", "Certificate", "rewards", Award, { keywords: ["diploma"], tags: ["badge"] }),
];

/* ---------- Relationships (14) ---------- */
const RELATIONSHIPS: IconAsset[] = [
  make("rel.friendship", "Friendship", "relationships", Handshake, { keywords: ["friend"], tags: ["friendly"] }),
  make("rel.bestfriend", "Best Friend", "relationships", HeartHandshake, { keywords: ["bff"], tags: ["friendly"] }),
  make("rel.romance", "Romance", "relationships", Heart, { keywords: ["love"], tags: ["romance"] }),
  make("rel.soulmate", "Soulmate", "relationships", Heart, { keywords: ["destiny"], tags: ["romance"] }),
  make("rel.marriage", "Marriage", "relationships", HeartHandshake, { keywords: ["wed"], tags: ["family"] }),
  make("rel.breakup", "Breakup", "relationships", HeartCrack, { keywords: ["split"], tags: ["romance"] }),
  make("rel.family", "Family", "relationships", Users2, { keywords: ["kin"], tags: ["family"] }),
  make("rel.parent", "Parent", "relationships", UserCog, { keywords: ["mom", "dad"], tags: ["family"] }),
  make("rel.sibling", "Sibling", "relationships", Users, { keywords: ["brother", "sister"], tags: ["family"] }),
  make("rel.baby", "Baby", "relationships", BabyIcon, { keywords: ["newborn"], tags: ["family"] }),
  make("rel.adoption", "Adoption", "relationships", UserPlus, { keywords: ["foster"], tags: ["family"] }),
  make("rel.mentor", "Mentor", "relationships", GraduationCap, { keywords: ["guide"], tags: ["friendly"] }),
  make("rel.enemy", "Enemy", "relationships", Swords, { keywords: ["foe"], tags: ["hostile"] }),
  make("rel.milestone", "Social Milestone", "relationships", Sparkle, { keywords: ["event"], tags: ["milestone"] }),
];

/* ---------- Lifestyle / Worlds (26) ---------- */
const LIFESTYLE: IconAsset[] = [
  make("life.home", "Home", "lifestyle", Home, { keywords: ["house"], tags: ["home"] }),
  make("life.apartment", "Apartment", "lifestyle", Building2, { keywords: ["condo"], tags: ["home"] }),
  make("life.tiny", "Tiny Home", "lifestyle", DoorOpen, { keywords: ["small"], tags: ["home"] }),
  make("life.cabin", "Cabin", "lifestyle", TreeDeciduous, { keywords: ["woods"], tags: ["home"] }),
  make("life.castle", "Castle", "lifestyle", Landmark, { keywords: ["royal"], tags: ["home"] }),
  make("life.bed", "Bedroom", "lifestyle", Bed, { keywords: ["sleep"], tags: ["home"] }),
  make("life.sofa", "Living Room", "lifestyle", Sofa, { keywords: ["lounge"], tags: ["home"] }),
  make("life.bath", "Bathroom", "lifestyle", Bath, { keywords: ["shower"], tags: ["home"] }),
  make("life.school", "School", "lifestyle", School, { keywords: ["class"], tags: ["public"] }),
  make("life.hospital", "Hospital", "lifestyle", Cross, { keywords: ["clinic"], tags: ["public"] }),
  make("life.library", "Library", "lifestyle", Library, { keywords: ["books"], tags: ["public"] }),
  make("life.museum", "Museum", "lifestyle", BookMarkedIcon, { keywords: ["exhibit"], tags: ["public"] }),
  make("life.restaurant", "Restaurant", "lifestyle", UtensilsCrossed, { keywords: ["dining"], tags: ["public"] }),
  make("life.cafe", "Café", "lifestyle", Coffee, { keywords: ["coffee"], tags: ["public"] }),
  make("life.gym", "Gym", "lifestyle", Dumbbell, { keywords: ["workout"], tags: ["public"] }),
  make("life.church", "Chapel", "lifestyle", Church, { keywords: ["temple"], tags: ["public"] }),
  make("life.park", "Park", "lifestyle", Trees, { keywords: ["outdoors"], tags: ["nature"] }),
  make("life.beach", "Beach", "lifestyle", Palmtree, { keywords: ["ocean"], tags: ["nature"] }),
  make("life.mountains", "Mountains", "lifestyle", MountainSnow, { keywords: ["peaks"], tags: ["nature"] }),
  make("life.forest", "Forest", "lifestyle", Trees, { keywords: ["woods"], tags: ["nature"] }),
  make("life.desert", "Desert", "lifestyle", Sun, { keywords: ["sand"], tags: ["nature"] }),
  make("life.city", "City", "lifestyle", Building, { keywords: ["urban"], tags: ["public"] }),
  make("life.vacation", "Vacation", "lifestyle", Tent, { keywords: ["travel"], tags: ["nature"] }),
  make("life.travel", "Travel", "lifestyle", Plane, { keywords: ["flight"], tags: ["nature"] }),
  make("life.luxury", "Luxury Getaway", "lifestyle", Umbrella, { keywords: ["resort"], tags: ["nature"] }),
  make("life.world", "World", "lifestyle", Globe, { keywords: ["earth"], tags: ["nature"] }),
];

/* ---------- Objects (30) ---------- */
const OBJECTS: IconAsset[] = [
  make("obj.book", "Book", "objects", BookOpen, { keywords: ["read"], tags: ["reading"] }),
  make("obj.notebook", "Notebook", "objects", Notebook, { keywords: ["journal"], tags: ["office"] }),
  make("obj.computer", "Computer", "objects", Monitor, { keywords: ["desktop"], tags: ["tech"] }),
  make("obj.laptop", "Laptop", "objects", Laptop, { keywords: ["portable"], tags: ["tech"] }),
  make("obj.phone", "Phone", "objects", Smartphone, { keywords: ["mobile"], tags: ["tech"] }),
  make("obj.tablet", "Tablet", "objects", Tablet, { keywords: ["ipad"], tags: ["tech"] }),
  make("obj.keyboard", "Keyboard", "objects", Keyboard, { keywords: ["type"], tags: ["tech"] }),
  make("obj.mouse", "Mouse", "objects", Mouse, { keywords: ["pointer"], tags: ["tech"] }),
  make("obj.printer", "Printer", "objects", Printer, { keywords: ["paper"], tags: ["office"] }),
  make("obj.tools", "Tools", "objects", Wrench, { keywords: ["repair"], tags: ["craft"] }),
  make("obj.hammer", "Hammer", "objects", Hammer, { keywords: ["build"], tags: ["craft"] }),
  make("obj.pan", "Cookware", "objects", CookingPot, { keywords: ["kitchen"], tags: ["cook"] }),
  make("obj.plant", "Plant", "objects", Sprout, { keywords: ["green"], tags: ["nature"] }),
  make("obj.flower", "Flower", "objects", Flower2, { keywords: ["bloom"], tags: ["nature"] }),
  make("obj.crystal", "Crystal", "objects", Gem, { keywords: ["stone"], tags: ["magic"] }),
  make("obj.potion", "Potion", "objects", FlaskConical, { keywords: ["brew"], tags: ["magic"] }),
  make("obj.car", "Car", "objects", Car, { keywords: ["vehicle"], tags: ["transport"] }),
  make("obj.bike", "Bicycle", "objects", Bike, { keywords: ["cycle"], tags: ["transport"] }),
  make("obj.boat", "Boat", "objects", Sailboat, { keywords: ["sea"], tags: ["transport"] }),
  make("obj.guitar2", "Guitar", "objects", Guitar, { keywords: ["music"], tags: ["music"] }),
  make("obj.piano2", "Piano", "objects", Piano, { keywords: ["keys"], tags: ["music"] }),
  make("obj.drums", "Drums", "objects", Drum, { keywords: ["beat"], tags: ["music"] }),
  make("obj.microscope", "Microscope", "objects", Microscope, { keywords: ["science"], tags: ["science"] }),
  make("obj.beaker", "Beaker", "objects", Beaker, { keywords: ["lab"], tags: ["science"] }),
  make("obj.testtube", "Test Tube", "objects", TestTube, { keywords: ["lab"], tags: ["science"] }),
  make("obj.dumbbell", "Dumbbell", "objects", Dumbbell, { keywords: ["gym"], tags: ["sports"] }),
  make("obj.dice", "Dice", "objects", Dice5, { keywords: ["game"], tags: ["hobby"] }),
  make("obj.puzzle", "Puzzle", "objects", PuzzleIcon, { keywords: ["puzzle"], tags: ["hobby"] }),
  make("obj.controller", "Controller", "objects", Joystick, { keywords: ["gaming"], tags: ["hobby"] }),
  make("obj.wand", "Magic Wand", "objects", Wand2, { keywords: ["magic"], tags: ["magic"] }),
];

/* ---------- Worlds / Weather (14) ---------- */
const WORLDS: IconAsset[] = [
  make("world.sunrise", "Sunrise", "worlds", Sunrise, { keywords: ["dawn"], tags: ["weather"] }),
  make("world.sunset", "Sunset", "worlds", Sunset, { keywords: ["dusk"], tags: ["weather"] }),
  make("world.day", "Sunny", "worlds", Sun, { keywords: ["clear"], tags: ["weather"] }),
  make("world.night", "Night", "worlds", Moon, { keywords: ["dark"], tags: ["weather"] }),
  make("world.rain", "Rain", "worlds", CloudRain, { keywords: ["wet"], tags: ["weather"] }),
  make("world.snow", "Snow", "worlds", CloudSnow, { keywords: ["cold"], tags: ["weather"] }),
  make("world.cloudy", "Cloudy", "worlds", Cloud, { keywords: ["overcast"], tags: ["weather"] }),
  make("world.wind", "Windy", "worlds", Wind, { keywords: ["breeze"], tags: ["weather"] }),
  make("world.flake", "Snowflake", "worlds", Snowflake, { keywords: ["winter"], tags: ["weather"] }),
  make("world.rainbow", "Rainbow", "worlds", Rainbow, { keywords: ["color"], tags: ["weather"] }),
  make("world.storm", "Storm", "worlds", Zap, { keywords: ["thunder"], tags: ["weather"] }),
  make("world.map", "Map", "worlds", Map, { keywords: ["region"], tags: ["region"] }),
  make("world.mountain", "Mountain", "worlds", Mountain, { keywords: ["peak"], tags: ["region"] }),
  make("world.globe", "Globe", "worlds", Globe2, { keywords: ["planet"], tags: ["region"] }),
];

/* ---------- Notifications / UX (18) ---------- */
const NOTIFS: IconAsset[] = [
  make("notif.bell", "Notification", "notifications", MessageSquare, { keywords: ["alert"], tags: ["ui"] }),
  make("notif.mail", "Mail", "notifications", Mail, { keywords: ["message"], tags: ["ui"] }),
  make("notif.chat", "Chat", "notifications", MessageCircle, { keywords: ["talk"], tags: ["ui"] }),
  make("notif.send", "Sent", "notifications", Send, { keywords: ["reply"], tags: ["ui"] }),
  make("notif.phone", "Call", "notifications", Phone, { keywords: ["ring"], tags: ["ui"] }),
  make("notif.alarm", "Alarm", "notifications", AlarmClock, { keywords: ["wake"], tags: ["ui"] }),
  make("notif.clock", "Clock", "notifications", Clock, { keywords: ["time"], tags: ["ui"] }),
  make("notif.timer", "Timer", "notifications", Timer, { keywords: ["count"], tags: ["ui"] }),
  make("notif.hourglass", "Hourglass", "notifications", Hourglass, { keywords: ["wait"], tags: ["ui"] }),
  make("notif.watch", "Watch", "notifications", Watch, { keywords: ["wear"], tags: ["ui"] }),
  make("notif.megaphone", "Announcement", "notifications", Megaphone, { keywords: ["shout"], tags: ["ui"] }),
  make("notif.rss", "Feed", "notifications", Rss, { keywords: ["news"], tags: ["ui"] }),
  make("notif.bolt", "Boost", "notifications", Bolt, { keywords: ["power"], tags: ["ui"] }),
  make("notif.spark", "Spark", "notifications", SparklesIcon, { keywords: ["magic"], tags: ["ui"] }),
  make("notif.info", "Info", "notifications", LightbulbIcon, { keywords: ["hint"], tags: ["ui"] }),
  make("notif.eye", "Watching", "notifications", Eye, { keywords: ["view"], tags: ["ui"] }),
  make("notif.tag", "Tag", "notifications", Tag, { keywords: ["label"], tags: ["ui"] }),
  make("notif.pin", "Pinned", "notifications", Bookmark, { keywords: ["save"], tags: ["ui"] }),
];

/* ============================================================ */

export const DEFAULT_ICONS: IconAsset[] = [
  ...CAREERS,
  ...TRAITS,
  ...SKILLS,
  ...REWARDS,
  ...RELATIONSHIPS,
  ...LIFESTYLE,
  ...OBJECTS,
  ...WORLDS,
  ...NOTIFS,
];

export const DEFAULT_ICONS_BY_ID: Record<string, IconAsset> = Object.fromEntries(
  DEFAULT_ICONS.map((i) => [i.id, i]),
);

export function findBuiltin(id: string): IconAsset | undefined {
  return DEFAULT_ICONS_BY_ID[id];
}

/* ---------- User state for the library ---------- */

const LS_FAV = "mc.icons.favorites";
const LS_RECENT = "mc.icons.recent";
const LS_COLLECTIONS = "mc.icons.collections";

export type IconCollection = { id: string; name: string; iconIds: string[]; createdAt: string };

function readLS<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(k: string, v: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(v));
}

export const iconLibraryState = {
  getFavorites: (): string[] => readLS<string[]>(LS_FAV, []),
  setFavorites: (ids: string[]) => writeLS(LS_FAV, ids),
  getRecent: (): string[] => readLS<string[]>(LS_RECENT, []),
  pushRecent: (id: string) => {
    const cur = readLS<string[]>(LS_RECENT, []);
    const next = [id, ...cur.filter((x) => x !== id)].slice(0, 24);
    writeLS(LS_RECENT, next);
  },
  getCollections: (): IconCollection[] => readLS<IconCollection[]>(LS_COLLECTIONS, []),
  setCollections: (c: IconCollection[]) => writeLS(LS_COLLECTIONS, c),
};
