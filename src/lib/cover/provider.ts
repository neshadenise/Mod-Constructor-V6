/**
 * Provider-agnostic cover image generation.
 *
 * The UI only ever talks to `generateCover()`. Swapping in another image
 * service later means registering a new provider here — no UI changes.
 */
import { generateArt } from "@/lib/ai-art";

export interface CoverProvider {
  id: string;
  label: string;
  /** Returns a PNG/JPEG data URL. */
  generate(prompt: string): Promise<string>;
}

const lovableAi: CoverProvider = {
  id: "lovable-ai",
  label: "Lovable AI",
  generate: (prompt) => generateArt(prompt),
};

const providers = new Map<string, CoverProvider>([[lovableAi.id, lovableAi]]);
let activeId = lovableAi.id;

export function registerCoverProvider(provider: CoverProvider) {
  providers.set(provider.id, provider);
}

export function listCoverProviders(): CoverProvider[] {
  return [...providers.values()];
}

export function setActiveCoverProvider(id: string) {
  if (providers.has(id)) activeId = id;
}

export function activeCoverProvider(): CoverProvider {
  return providers.get(activeId) ?? lovableAi;
}

/* ------------------------------ result cache ---------------------------- */

const cache = new Map<string, string>();

export async function generateCover(prompt: string): Promise<{ dataUrl: string; provider: string }> {
  const provider = activeCoverProvider();
  const key = `${provider.id}::${prompt}`;
  const hit = cache.get(key);
  if (hit) return { dataUrl: hit, provider: provider.id };
  const dataUrl = await provider.generate(prompt);
  cache.set(key, dataUrl);
  if (cache.size > 24) cache.delete(cache.keys().next().value as string);
  return { dataUrl, provider: provider.id };
}
