/** Recolor layout accents while retaining each shade's lightness and contrast. */
export function paletteEnabled(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) && !['#18181b', '#171717', '#1a1a1a'].includes(color.toLowerCase());
}
export function recolorValue(original: string, accent: string): string {
  if (!paletteEnabled(accent)) return original;
  const raw = original.slice(1);
  const rgb = [0, 2, 4].map(i => parseInt(raw.slice(i, i + 2), 16) / 255);
  const max = Math.max(...rgb), min = Math.min(...rgb);
  if (max - min < 16 / 255) return original;
  const sourceLight = (max + min) / 2;
  const selected = [1, 3, 5].map(i => parseInt(accent.slice(i, i + 2), 16) / 255);
  const hi = Math.max(...selected), lo = Math.min(...selected), delta = hi - lo;
  let hue = 0;
  if (delta) {
    hue = hi === selected[0] ? ((selected[1] - selected[2]) / delta) % 6 : hi === selected[1] ? (selected[2] - selected[0]) / delta + 2 : (selected[0] - selected[1]) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const light = (hi + lo) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0;
  // Dark panels remain dark and pale washes remain pale; midtone accents follow the swatch.
  const targetLight = sourceLight < .28 || sourceLight > .82 ? sourceLight : light;
  return `hsl(${hue.toFixed(1)} ${(saturation * 100).toFixed(1)}% ${(targetLight * 100).toFixed(1)}%)`;
}
export function recolorExportHtml(html: string, accent: string): string {
  if (!paletteEnabled(accent)) return html;
  const recolor = (css: string) => css.replace(/#[0-9a-f]{6}\b/gi, value => recolorValue(value, accent));
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>|style="[^"]*"/gi, recolor);
}

const ORIGINAL_COLORS = ["004d40", "0066cc", "00b894", "0284c7", "0891b2", "0d9488", "0f172a", "0f3460", "10b981", "115e59", "15803d", "16213e", "166534", "1a1a2e", "1a472a", "1d4ed8", "1e1b4b", "1e293b", "1e3a5f", "1e40af", "2383e2", "2563eb", "334155", "374151", "3b82f6", "3e4451", "3fb950", "475569", "484f58", "4c1d95", "4f46e5", "57606a", "58a6ff", "61afef", "6366f1", "636d83", "64748b", "6b7280", "78350f", "7c3aed", "881337", "8b5cf6", "8b949e", "92400e", "94a3b8", "98c379", "9a3412", "b91c1c", "be185d", "c084fc", "c4a747", "c9d1d9", "cbd5e1", "d4af37", "dbeafe", "dc2626", "e5c07b", "e94560", "ea580c", "eab308", "ecfdf5", "eff6ff", "f43f5e", "f59e0b", "fbbf24", "fed7aa", "fefce8", "ff6b6b", "ffe4e6", "fff7ed", "fffbeb"];
export function templatePaletteCSS(selector: string, accent: string): string {
  if (!paletteEnabled(accent)) return '';
  return `${selector}{${ORIGINAL_COLORS.map(hex => `--resume-palette-${hex}:${recolorValue('#' + hex, accent)}`).join(';')}}`;
}

/** Shared by the interactive preview and HTML/PDF export, including monochrome layouts. */
export function legacyAccentCSS(scope: string, accent: string): string {
  if (!paletteEnabled(accent)) return '';
  const neutral = ['#000', '#000000', '#111', '#111111', '#171717', '#18181b', '#1a1a1a', '#222', '#222222', '#27272a', '#2d3436', '#0d1117', '#333', '#333333', '#37352f', '#1c1917', '#282c34'];
  const headings = ['h1', 'h2'].flatMap(tag => [
    `${scope} ${tag}:not([style*="color"])`,
    ...neutral.flatMap(hex => [`${scope} ${tag}[style*="color: ${hex};"]`, `${scope} ${tag}[style$="color: ${hex}"]`, `${scope} ${tag}[style*="color:${hex};"]`, `${scope} ${tag}[style$="color:${hex}"]`]),
  ]);
  const panels = ['#000', '#000000', '#18181b', '#1a1a1a', '#0d1117', '#161b22', '#2d3436', '#282c34'].flatMap(hex => ['background', 'background-color'].flatMap(property => [
    `${scope} [style*="${property}: ${hex};"]`, `${scope} [style$="${property}: ${hex}"]`,
    `${scope} [style*="${property}:${hex};"]`, `${scope} [style$="${property}:${hex}"]`,
  ]));
  const darkPanel = `color-mix(in srgb, ${accent} 60%, #111111)`;
  return `
    ${headings.join(',')} { color: color-mix(in srgb, ${accent} 78%, #171717) !important; }
    ${scope} .bg-black, ${panels.join(',')} { background-color: ${darkPanel} !important; }
    ${scope} h2, ${scope} [class~="border-b"], ${scope} .border-black {
      border-color: ${accent} !important;
    }
    ${scope} .text-white h1, ${scope} .text-white h2,
    ${scope} h1.text-white, ${scope} h2.text-white,
    ${scope} .bg-black h1, ${scope} .bg-black h2 { color: #fff !important; }
  `;
}
