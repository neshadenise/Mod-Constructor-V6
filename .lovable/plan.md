# Secret Preview URL for Codex

Right now the published site (`modconstructorv6.lovable.app`) shows only the public landing page — the full creator UI is gated behind `detectAppMode()` returning `dev` or `desktop`. Codex can't see it from a normal browser.

I'll add a hard-to-guess URL that bypasses the public-web lock so Codex (or anyone with the link) can view the full app UI in a regular browser, without weakening the default public lock.

## What I'll build

**1. A secret unlock token**
- Random slug baked into the code: `codex-preview-8fK3nQ2vR7mL9xW4` (32 chars, unguessable).
- Not committed to any public README; only shared in chat with you.

**2. New route: `/_preview/$token`**
- File: `src/routes/_preview.$token.tsx`
- If the token matches the constant, it:
  - Sets a `localStorage` flag `mc.preview.unlocked = "1"`.
  - Redirects to `/`.
- If it doesn't match, redirects to `/` (silent — no hint the route exists).

**3. Update `detectAppMode()`**
- File: `src/lib/app-mode.ts`
- Before returning `"public-web"`, check `localStorage.getItem("mc.preview.unlocked") === "1"`. If set, return `"dev"` so the full app shell renders.
- SSR path is unchanged (still returns public landing) — the unlock is applied after hydration, same pattern as the existing deferred mode detection in `src/routes/index.tsx`.

**4. Give you the URL**
The final URL will be:
```
https://modconstructorv6.lovable.app/_preview/codex-preview-8fK3nQ2vR7mL9xW4
```
Visiting it once in any browser unlocks the full UI for that browser thereafter. To lock again: clear site data or run `localStorage.removeItem("mc.preview.unlocked")` in devtools.

## What I won't do

- No changes to `/mcp`, landing pages, or the `$.tsx` splat redirect.
- No server-side auth — this is a soft obscurity gate suitable for sharing UI, not for protecting secrets.
- No changes to any builder/store code.

## Confirm

- Happy with the token `codex-preview-8fK3nQ2vR7mL9xW4`, or want me to generate a different one (or accept one you provide)?
