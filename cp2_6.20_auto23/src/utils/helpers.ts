import { Show, Track, Artist } from '../types';

export const getArtistColor = (styleTags: string[], colors: Record<string, string>) => {
  if (styleTags.length === 0) return '#6c63ff';
  return colors[styleTags[0]] || '#6c63ff';
};

export const formatDuration = (sec: number) => {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const formatDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
};

export const formatDateCN = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

export const getCountdown = (iso: string) => {
  if (!iso) return { days: 0, hours: 0, past: true };
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, past: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return { days, hours, past: false };
};

export const getConflicts = (shows: Show[]): Map<string, Set<string>> => {
  const byArtistDate = new Map<string, Show[]>();
  shows.forEach(s => {
    const key = `${s.artistId}|${s.date}`;
    if (!byArtistDate.has(key)) byArtistDate.set(key, []);
    byArtistDate.get(key)!.push(s);
  });
  const conflicts = new Map<string, Set<string>>();
  byArtistDate.forEach(list => {
    if (list.length >= 2) {
      list.forEach(s => {
        if (!conflicts.has(s.id)) conflicts.set(s.id, new Set());
        list.forEach(other => {
          if (other.id !== s.id) conflicts.get(s.id)!.add(other.id);
        });
      });
    }
  });
  return conflicts;
};

export const getLatestReleaseDate = (artistTracks: Track[]) => {
  if (artistTracks.length === 0) return null;
  const sorted = [...artistTracks].sort(
    (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  );
  return sorted[0].releaseDate;
};

export const computeStyleSimilarity = (a: Artist, b: Artist): number => {
  if (a.styleTags.length === 0 || b.styleTags.length === 0) return 0;
  const setA = new Set(a.styleTags);
  let intersection = 0;
  b.styleTags.forEach(t => setA.has(t) && intersection++);
  const union = new Set([...a.styleTags, ...b.styleTags]).size;
  return Math.round((intersection / union) * 100);
};

export const computeTrackSimilarity = (aTags: string[], bTags: string[]): number => {
  if (aTags.length === 0 || bTags.length === 0) return 0;
  const setA = new Set(aTags);
  let intersection = 0;
  bTags.forEach(t => setA.has(t) && intersection++);
  const union = new Set([...aTags, ...bTags]).size;
  return Math.round((intersection / union) * 100);
};
