export const RESIDENT_COLORS = [
  '#1e3a5f',
  '#2d7d9a',
  '#e8961e',
  '#6b46c1',
  '#38a169',
  '#e53e3e',
  '#d69e2e',
  '#3182ce',
];

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2);
  }
  return words.map((w) => w[0]).join('');
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function getPercentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export function generateColor(index: number): string {
  return RESIDENT_COLORS[index % RESIDENT_COLORS.length];
}
