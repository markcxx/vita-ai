/**
 * Brand color constants for non-CSS contexts.
 *
 * Use these in PDF/HTML export pipelines and any place where Tailwind
 * classes / CSS variables are unavailable. For all in-browser UI, use
 * Tailwind `brand` classes (`bg-brand`, `text-brand`, etc.) instead.
 *
 * Default brand: black. These constants reflect the LIGHT mode
 * values since exports always render on a white background.
 */

export const BRAND_COLORS = {
  brand: '#18181B',
  brandHover: '#09090B',
  brandMuted: '#F4F4F5',
  brandForeground: '#FFFFFF',
} as const;

export const BRAND_GRADIENT = {
  from: '#18181B',
  to: '#09090B',
} as const;
