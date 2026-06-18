export function renderMarkdown(md: string): string {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/gis, (match) => `<ol>${match}</ol>`);

  html = html.replace(/^[-*+]\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/gis, (match) => {
    if (match.includes('<ol>') || match.includes('</ol>')) return match;
    return `<ul>${match}</ul>`;
  });

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  html = html.replace(/\n\s*\n/g, '</p><p>');
  html = html.replace(/^(?!<[hou]|<l|<p|<s|<e)/gim, (m) => m);

  const lines = html.split('\n');
  const wrapped = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|ol|ul|li|p|\/)/i.test(trimmed)) return line;
      return `<p>${trimmed}</p>`;
    })
    .join('\n');

  return `<div class="markdown-body">${wrapped}</div>`;
}

export function stripMarkdown(md: string): string {
  if (!md) return '';
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
}

export function excerpt(text: string, maxLen: number = 60): string {
  const plain = stripMarkdown(text);
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen) + '...';
}

export function relativeTime(isoString: string | null): string {
  if (!isoString) return '';
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = now - then;
  if (diff < 0) return '刚刚';

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;

  return formatDate(isoString);
}

export function formatDate(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
