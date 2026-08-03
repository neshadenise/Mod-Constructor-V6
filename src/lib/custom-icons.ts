/**
 * Custom icon library — AI-generated and uploaded artwork.
 *
 * Entries live alongside the built-in Default Library and are exposed to
 * every picker through the same `IconAsset` shape, so an AI icon can be
 * used anywhere a built-in icon can. Stored locally (offline-first);
 * the desktop build swaps the backing store for real files.
 */

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { IconAsset, IconCategory } from "./icon-library";

const LS_KEY = "mc.icons.custom.v1";

export interface CustomIcon {
  id: string;
  name: string;
  category: IconCategory;
  /** PNG data URL. */
  dataUrl: string;
  prompt?: string;
  source: "ai" | "upload";
  createdAt: number;
}

let cache: CustomIcon[] | null = null;
const listeners = new Set<() => void>();

function read(): CustomIcon[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    cache = raw ? (JSON.parse(raw) as CustomIcon[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: CustomIcon[]) {
  cache = next;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* quota — keep in memory for this session */
  }
  for (const l of Array.from(listeners)) l();
}

export function listCustomIcons(): CustomIcon[] {
  return read();
}

export function findCustomIcon(id: string): CustomIcon | undefined {
  return read().find((i) => i.id === id);
}

export function addCustomIcon(init: Omit<CustomIcon, "id" | "createdAt">): CustomIcon {
  const icon: CustomIcon = {
    ...init,
    id: `gen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  write([icon, ...read()]);
  return icon;
}

export function removeCustomIcon(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function renameCustomIcon(id: string, name: string) {
  write(read().map((i) => (i.id === id ? { ...i, name } : i)));
}

/** Adapt a custom icon to the shared IconAsset contract. */
export function toIconAsset(icon: CustomIcon): IconAsset {
  return {
    id: icon.id,
    name: icon.name,
    category: icon.category,
    keywords: [icon.name.toLowerCase(), icon.source],
    tags: [icon.source === "ai" ? "ai-generated" : "uploaded"],
    version: "1.0",
    kind: "generated",
    glyph: Sparkles,
    url: icon.dataUrl,
  };
}

/** Subscribe to the custom library (re-renders on add/remove/rename). */
export function useCustomIcons(): CustomIcon[] {
  const [items, setItems] = useState<CustomIcon[]>([]);
  useEffect(() => {
    const sync = () => setItems([...read()]);
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return items;
}
