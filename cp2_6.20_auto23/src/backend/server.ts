import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

export interface Track {
  id: string;
  artistId: string;
  name: string;
  duration: number;
  releaseDate: string;
  playLink: string;
}

export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  styleTags: string[];
  bio: string;
}

export interface Show {
  id: string;
  artistId: string;
  date: string;
  time: string;
  venue: string;
  notes: string;
}

const artists = new Map<string, Artist>();
const tracks = new Map<string, Track>();
const shows = new Map<string, Show>();

const genId = () => Math.random().toString(36).substring(2, 10);

const seedStyleColors: Record<string, string> = {
  'Indie Rock': '#ff6b6b',
  'Electronic': '#4ecdc4',
  'Hip Hop': '#ffe66d',
  'Jazz': '#a29bfe',
  'Folk': '#fd79a8',
  'Synthwave': '#74b9ff',
  'Ambient': '#00b894',
  'R&B': '#e17055',
  'Punk': '#d63031',
  'Dream Pop': '#0984e3',
};

const seedData = () => {
  const artistData: Artist[] = [
    { id: genId(), name: 'Luna Eclipse', avatarUrl: 'https://picsum.photos/seed/luna/200', styleTags: ['Indie Rock', 'Dream Pop'], bio: '来自上海的四人独立摇滚乐队，成立于2019年。以梦幻迷离的吉他音色和情绪化的歌词著称。' },
    { id: genId(), name: 'Neon Pulse', avatarUrl: 'https://picsum.photos/seed/neon/200', styleTags: ['Electronic', 'Synthwave'], bio: '电子音乐制作人双人组，80年代复古合成器与现代电子节拍的完美融合。' },
    { id: genId(), name: 'Midnight Poet', avatarUrl: 'https://picsum.photos/seed/poet/200', styleTags: ['Hip Hop', 'R&B'], bio: '独立说唱歌手，以诗意的歌词和爵士采样的Beat闻名地下音乐圈。' },
    { id: genId(), name: 'Velvet Sound', avatarUrl: 'https://picsum.photos/seed/velvet/200', styleTags: ['Jazz', 'Ambient'], bio: '爵士融合项目，探索氛围音乐与传统爵士的边界。' },
    { id: genId(), name: 'Aurora Fields', avatarUrl: 'https://picsum.photos/seed/aurora/200', styleTags: ['Folk', 'Dream Pop'], bio: '民谣创作人，擅长用原声吉他和细腻的人声讲述故事。' },
  ];

  artistData.forEach(a => artists.set(a.id, a));

  const today = new Date();
  const addDays = (d: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().split('T')[0];
  };

  const trackData: Track[] = [
    { id: genId(), artistId: artistData[0].id, name: 'Crescent Moon', duration: 234, releaseDate: addDays(-30), playLink: 'https://example.com/crescent' },
    { id: genId(), artistId: artistData[0].id, name: 'Silver Tide', duration: 198, releaseDate: addDays(14), playLink: 'https://example.com/silver' },
    { id: genId(), artistId: artistData[0].id, name: 'Echo Chamber', duration: 267, releaseDate: addDays(30), playLink: 'https://example.com/echo' },
    { id: genId(), artistId: artistData[1].id, name: 'Retro Drive', duration: 212, releaseDate: addDays(-60), playLink: 'https://example.com/retro' },
    { id: genId(), artistId: artistData[1].id, name: 'Digital Sunset', duration: 245, releaseDate: addDays(7), playLink: 'https://example.com/digital' },
    { id: genId(), artistId: artistData[2].id, name: 'Urban Haiku', duration: 189, releaseDate: addDays(-14), playLink: 'https://example.com/urban' },
    { id: genId(), artistId: artistData[2].id, name: 'Midnight Verse', duration: 223, releaseDate: addDays(45), playLink: 'https://example.com/verse' },
    { id: genId(), artistId: artistData[3].id, name: 'Blue Mirage', duration: 312, releaseDate: addDays(0), playLink: 'https://example.com/blue' },
    { id: genId(), artistId: artistData[4].id, name: 'Wildflower', duration: 201, releaseDate: addDays(20), playLink: 'https://example.com/wild' },
  ];
  trackData.forEach(t => tracks.set(t.id, t));

  const showData: Show[] = [
    { id: genId(), artistId: artistData[0].id, date: addDays(14), time: '20:00', venue: 'MAO Livehouse 上海', notes: '专辑首发演出' },
    { id: genId(), artistId: artistData[0].id, date: addDays(30), time: '19:30', venue: '愚公移山 北京', notes: '' },
    { id: genId(), artistId: artistData[0].id, date: addDays(30), time: '21:30', venue: '糖果 TANGO 北京', notes: '当日第二场，注意衔接' },
    { id: genId(), artistId: artistData[1].id, date: addDays(7), time: '22:00', venue: 'Celia 上海', notes: '电子夜场专场' },
    { id: genId(), artistId: artistData[1].id, date: addDays(25), time: '20:30', venue: 'DADA 北京', notes: '' },
    { id: genId(), artistId: artistData[2].id, date: addDays(0), time: '21:00', venue: 'ARKHAM 上海', notes: '' },
    { id: genId(), artistId: artistData[2].id, date: addDays(45), time: '20:00', venue: '小酒馆 成都', notes: '联合专场' },
    { id: genId(), artistId: artistData[3].id, date: addDays(0), time: '19:00', venue: 'Blue Note 上海', notes: '' },
    { id: genId(), artistId: artistData[4].id, date: addDays(20), time: '20:00', venue: '育音堂 上海', notes: '' },
  ];
  showData.forEach(s => shows.set(s.id, s));
};

seedData();

app.get('/api/artists', (_req: Request, res: Response) => {
  setTimeout(() => res.json(Array.from(artists.values())), 500);
});

app.get('/api/artists/:id', (req: Request, res: Response) => {
  const artist = artists.get(req.params.id);
  if (!artist) return res.status(404).json({ error: 'Artist not found' });
  res.json(artist);
});

app.post('/api/artists', (req: Request, res: Response) => {
  const { name, avatarUrl, styleTags, bio } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = genId();
  const artist: Artist = { id, name, avatarUrl: avatarUrl || '', styleTags: styleTags || [], bio: bio || '' };
  artists.set(id, artist);
  res.status(201).json(artist);
});

app.put('/api/artists/:id', (req: Request, res: Response) => {
  const existing = artists.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Artist not found' });
  const updated = { ...existing, ...req.body, id: req.params.id };
  artists.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/artists/:id', (req: Request, res: Response) => {
  const deleted = artists.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Artist not found' });
  Array.from(tracks.values()).filter(t => t.artistId === req.params.id).forEach(t => tracks.delete(t.id));
  Array.from(shows.values()).filter(s => s.artistId === req.params.id).forEach(s => shows.delete(s.id));
  res.json({ success: true });
});

app.get('/api/artists/:id/tracks', (req: Request, res: Response) => {
  const artistTracks = Array.from(tracks.values()).filter(t => t.artistId === req.params.id);
  res.json(artistTracks);
});

app.post('/api/tracks', (req: Request, res: Response) => {
  const { artistId, name, duration, releaseDate, playLink } = req.body;
  if (!artistId || !name) return res.status(400).json({ error: 'Missing fields' });
  const id = genId();
  const track: Track = { id, artistId, name, duration: duration || 0, releaseDate: releaseDate || '', playLink: playLink || '' };
  tracks.set(id, track);
  res.status(201).json(track);
});

app.put('/api/tracks/:id', (req: Request, res: Response) => {
  const existing = tracks.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Track not found' });
  const updated = { ...existing, ...req.body, id: req.params.id };
  tracks.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/tracks/:id', (req: Request, res: Response) => {
  const deleted = tracks.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Track not found' });
  res.json({ success: true });
});

app.get('/api/shows', (_req: Request, res: Response) => {
  res.json(Array.from(shows.values()));
});

app.get('/api/artists/:id/shows', (req: Request, res: Response) => {
  const artistShows = Array.from(shows.values()).filter(s => s.artistId === req.params.id);
  res.json(artistShows);
});

app.post('/api/shows', (req: Request, res: Response) => {
  const { artistId, date, time, venue, notes } = req.body;
  if (!artistId || !date || !time || !venue) return res.status(400).json({ error: 'Missing fields' });
  const id = genId();
  const show: Show = { id, artistId, date, time, venue, notes: notes || '' };
  shows.set(id, show);
  res.status(201).json(show);
});

app.put('/api/shows/:id', (req: Request, res: Response) => {
  const existing = shows.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Show not found' });
  const updated = { ...existing, ...req.body, id: req.params.id };
  shows.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/shows/:id', (req: Request, res: Response) => {
  const deleted = shows.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Show not found' });
  res.json({ success: true });
});

app.get('/api/search', (req: Request, res: Response) => {
  const q = (req.query.q as string || '').toLowerCase().trim();
  if (!q) return res.json({ artists: [], tracks: [] });

  const matchedArtists = Array.from(artists.values())
    .map(a => ({ artist: a, score: a.name.toLowerCase().includes(q) ? a.name.toLowerCase() === q ? 100 : 80 : 0 }))
    .filter(r => r.score > 0);

  const matchedTracks: { track: Track; score: number; artist: Artist | undefined }[] = [];
  tracks.forEach(track => {
    let score = 0;
    const nameMatch = track.name.toLowerCase().includes(q);
    if (nameMatch) score = track.name.toLowerCase() === q ? 100 : 70;
    if (score > 0) {
      matchedTracks.push({ track, score, artist: artists.get(track.artistId) });
    }
  });

  const combined = [
    ...matchedArtists.map(r => ({ type: 'artist' as const, data: r.artist, score: r.score })),
    ...matchedTracks.map(r => ({ type: 'track' as const, data: r.track, score: r.score, artist: r.artist })),
  ].sort((a, b) => b.score - a.score);

  res.json({ results: combined.slice(0, 20) });
});

app.get('/api/style-tags', (_req: Request, res: Response) => {
  const tagSet = new Set<string>();
  artists.forEach(a => a.styleTags.forEach(t => tagSet.add(t)));
  res.json({ tags: Array.from(tagSet), colors: seedStyleColors });
});

app.listen(PORT, () => {
  console.log(`Music Label API running on http://localhost:${PORT}`);
});
