export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeWithMs(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00.000';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function parseTimestampPlaceholders(content: string): { text: string; timestamps: number[] } {
  const regex = /#(\d+:\d+(?:\.\d+)?)#/g;
  const timestamps: number[] = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const timeStr = match[1];
    const parts = timeStr.split(':');
    const mins = parseInt(parts[0], 10);
    const secs = parseFloat(parts[1]);
    timestamps.push(mins * 60 + secs);
  }
  
  return { text: content, timestamps };
}

export function replaceTimestampsWithLinks(
  content: string,
  onTimestampClick: (time: number) => void
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const regex = /#(\d+:\d+(?:\.\d+)?)#/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(content.slice(lastIndex, match.index)));
    }
    
    const timeStr = match[1];
    const parts = timeStr.split(':');
    const mins = parseInt(parts[0], 10);
    const secs = parseFloat(parts[1]);
    const totalSeconds = mins * 60 + secs;
    
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = match[0];
    link.style.color = '#4A90D9';
    link.style.textDecoration = 'underline';
    link.style.cursor = 'pointer';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      onTimestampClick(totalSeconds);
    });
    
    fragment.appendChild(link);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    fragment.appendChild(document.createTextNode(content.slice(lastIndex)));
  }

  return fragment;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function createAudioContext(): AudioContext {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  return new AC();
}
