/**
 * Sanitize a hex color string before injecting it into a style attribute
 * or an SVG `fill=`/`stroke=`. Defends against CSS-injection vectors
 * from malformed wire payloads.
 *
 * Accepts `#RGB`, `#RRGGBB`, or `#RRGGBBAA`. Anything else falls back
 * to the caller-supplied default so the rendering pipeline always has
 * a usable colour.
 *
 * Extracted from `spora-plugin-team-graph-frontend/src/lib/mermaidSource.ts`
 * where it guarded inline `style="--palette-bg: ${color}"` injection
 * into Mermaid's `foreignObject` HTML.
 */
export function safeHex(color: string | null | undefined, fallback: string): string {
    if (typeof color !== 'string') return fallback
    return /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?([0-9A-Fa-f]{2})?$/.test(color)
        ? color
        : fallback
}
