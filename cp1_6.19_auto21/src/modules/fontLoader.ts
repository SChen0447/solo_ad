import type { FontMeta, FontCategory, FontWeight } from '@/types';

const FONTS_DATA: FontMeta[] = [
  { family: 'Inter', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Roboto', category: 'sans-serif', weights: [100, 300, 400, 500, 700, 900] },
  { family: 'Noto Sans', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Open Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800] },
  { family: 'Lato', category: 'sans-serif', weights: [100, 300, 400, 700, 900] },
  { family: 'Poppins', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Montserrat', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Source Sans 3', category: 'sans-serif', weights: [200, 300, 400, 600, 700, 900] },
  { family: 'Space Grotesk', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800, 900] },
  { family: 'Merriweather', category: 'serif', weights: [300, 400, 700, 900] },
  { family: 'Lora', category: 'serif', weights: [400, 500, 600, 700] },
  { family: 'Georgia', category: 'serif', weights: [400, 700] },
  { family: 'Noto Serif', category: 'serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Crimson Pro', category: 'serif', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Libre Baskerville', category: 'serif', weights: [400, 700] },
  { family: 'DM Serif Display', category: 'display', weights: [400] },
  { family: 'Fraunces', category: 'display', weights: [100, 300, 400, 500, 600, 700, 900] },
  { family: 'JetBrains Mono', category: 'monospace', weights: [100, 200, 300, 400, 500, 600, 700, 800] },
  { family: 'IBM Plex Mono', category: 'monospace', weights: [100, 200, 300, 400, 500, 600, 700] },
  { family: 'Roboto Mono', category: 'monospace', weights: [100, 300, 400, 500, 700] },
];

export const ALL_FONTS: FontMeta[] = FONTS_DATA;

const loadedFonts = new Set<string>();

export function loadGoogleFont(family: string): void {
  if (loadedFonts.has(family)) return;
  loadedFonts.add(family);

  const existingLink = document.querySelector<HTMLLinkElement>(
    `link[data-font-family="${family}"]`
  );
  if (existingLink) return;

  const encodedFamily = family.replace(/\s+/g, '+');
  const weights = ALL_FONTS.find(f => f.family === family)?.weights ?? [400, 700];
  const weightStr = weights.map(w => `1,${w}`).join(';');

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weightStr}&display=swap`;
  link.setAttribute('data-font-family', family);
  document.head.appendChild(link);
}

export function getFontsByCategory(category: FontCategory | 'all'): FontMeta[] {
  if (category === 'all') return ALL_FONTS;
  return ALL_FONTS.filter(f => f.category === category);
}

export function searchFonts(query: string): FontMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_FONTS;
  return ALL_FONTS.filter(
    f =>
      f.family.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
  );
}

export function getFontWeights(family: string): FontWeight[] {
  return ALL_FONTS.find(f => f.family === family)?.weights ?? [400, 700];
}
