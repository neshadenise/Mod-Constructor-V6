/**
 * IconArt — shared painterly renderer for the Default Icon Library.
 *
 * Every icon in the pack is rendered by this component so the whole
 * library shares one visual language:
 *
 *   • soft radial gradient disc (category hue, single top-left light)
 *   • rim light highlight along top-left arc
 *   • ambient shadow drop bottom-right
 *   • crisp filled glyph with subtle inner highlight
 *   • transparent background, no text, no borders, no watermarks
 *   • rendered from SVG so it stays sharp from 16 → 128 px
 *
 * All raster/AI variants (`kind: "generated"`, `url` present) render the
 * PNG straight from the URL. Every consumer uses the same `<IconArt />`,
 * so the picker, previews and inspectors need zero changes when painted
 * PNGs are dropped in later.
 */

import type { CSSProperties } from "react";
import type { IconAsset } from "@/lib/icon-library";
import { CATEGORY_HUE } from "@/lib/icon-library";

export function IconArt({
  icon,
  size = 48,
  className,
  style,
  rounded = true,
}: {
  icon: IconAsset;
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** false → glyph only, no disc (for chip/inline uses). */
  rounded?: boolean;
}) {
  // Generated raster variants short-circuit to <img>. Metadata identical.
  if (icon.url) {
    return (
      <img
        src={icon.url}
        alt={icon.name}
        width={size}
        height={size}
        className={className}
        style={{ display: "block", ...style }}
      />
    );
  }

  const hue = CATEGORY_HUE[icon.category];
  // The gradient tokens: light face, mid, deep shadow.
  const light = `hsl(${hue.h} ${hue.s}% ${Math.min(hue.l + 22, 88)}%)`;
  const mid = `hsl(${hue.h} ${hue.s}% ${hue.l}%)`;
  const deep = `hsl(${hue.h} ${Math.min(hue.s + 6, 100)}% ${Math.max(hue.l - 22, 14)}%)`;
  const rim = `hsl(${hue.h} 80% 92%)`;

  // Stable per-icon suffix so multiple IconArts on one page don't collide.
  const uid = icon.id.replace(/[^a-zA-Z0-9]/g, "");
  const bgId = `iconbg-${uid}`;
  const rimId = `iconrim-${uid}`;
  const glowId = `iconglow-${uid}`;

  const Glyph = icon.glyph;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", ...style }}
      role="img"
      aria-label={icon.name}
    >
      <defs>
        <radialGradient id={bgId} cx="30%" cy="26%" r="80%">
          <stop offset="0%" stopColor={light} />
          <stop offset="55%" stopColor={mid} />
          <stop offset="100%" stopColor={deep} />
        </radialGradient>
        <radialGradient id={rimId} cx="30%" cy="24%" r="55%">
          <stop offset="0%" stopColor={rim} stopOpacity="0.55" />
          <stop offset="70%" stopColor={rim} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft ambient shadow beneath the disc */}
      <ellipse cx="32" cy="58" rx="22" ry="3.2" fill="#000" opacity="0.18" />

      {rounded && (
        <>
          {/* Base painted disc */}
          <circle cx="32" cy="32" r="28" fill={`url(#${bgId})`} />
          {/* Rim light — top-left arc */}
          <circle cx="32" cy="32" r="28" fill={`url(#${rimId})`} />
          {/* Inner highlight glow just under the glyph */}
          <circle cx="32" cy="32" r="20" fill={`url(#${glowId})`} />
          {/* Faint inner ring for depth */}
          <circle
            cx="32"
            cy="32"
            r="27.4"
            fill="none"
            stroke={deep}
            strokeOpacity="0.35"
            strokeWidth="0.8"
          />
        </>
      )}

      {/* Glyph — rendered as filled silhouette with subtle drop shadow.
          We render the lucide component into a nested group so its
          existing stroke geometry receives a crisp uniform fill. */}
      <g
        transform="translate(16 16)"
        style={{
          filter: rounded
            ? "drop-shadow(0 1.2px 0.4px rgba(0,0,0,0.28))"
            : undefined,
        }}
      >
        <Glyph
          width={32}
          height={32}
          color="#ffffff"
          strokeWidth={2}
          absoluteStrokeWidth
          style={{ opacity: 0.98 }}
        />
      </g>
    </svg>
  );
}
