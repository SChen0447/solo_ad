import express from 'express';
import cors from 'cors';
import type { Artist, Work, Performance, SearchResult } from '../types';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const artists = new Map<string, Artist>();
const performances = new Map<string, Performance>();

let idCounter = 1;
const generateId = () => `id_${idCounter++}`;

const styleColors: Record<string, number> = {
  '摇滚': 0,
  '电子': 1,
  '爵士': 2,
  '民谣': 3,
  '嘻哈': 4,
  '古典': 5,
  '流行': 6,
  'R&B': 7,
  '独立': 8,
  '朋克': 9,
};

const seedData = () => {
  const sampleArtists: Artist[] = [
    {
      id: generateId(),
      name: '极光乐队',
      avatarUrl: 'https://picsum.photos/seed/aurora/200/200',
      styleTags: ['摇滚', '独立', '电子'],
      bio: '来自北方的独立摇滚乐队，以梦幻的合成器音色和有力的吉他riff著称。',
      works: [
        { id: generateId(), name: '夜空漫步', duration: 245, releaseDate: '2025-03-15', playUrl: '#', artistId: '' },
        { id: generateId(), name: '极光之舞', duration: 198, releaseDate: '2025-06-20', playUrl: '#', artistId: '' },
        { id: generateId(), name: '星河', duration: 312, releaseDate: '2025-09-10', playUrl: '#', artistId: '' },
      ],
    },
    {
      id: generateId(),
      name: '深蓝爵士',
      avatarUrl: 'https://picsum.photos/seed/deepblue/200/200',
      styleTags: ['爵士', '古典'],
      bio: '融合传统爵士与现代电子元素的音乐项目。',
      works: [
        { id: generateId(), name: '午夜蓝调', duration: 276, releaseDate: '2025-02-28', playUrl: '#', artistId: '' },
        { id: generateId(), name: '城市黄昏', duration: 224, releaseDate: '2025-07-15', playUrl: '#', artistId: '' },
      ],
    },
    {
      id: generateId(),
      name: '民谣诗人',
      avatarUrl: 'https://picsum.photos/seed/folksinger/200/200',
      styleTags: ['民谣', '独立'],
      bio: '用木吉他和口琴讲述城市故事的民谣歌手。',
      works: [
        { id: generateId(), name: '故乡的云', duration: 189, releaseDate: '2025-01-10', playUrl: '#', artistId: '' },
        { id: generateId(), name: '旅人歌', duration: 267, releaseDate: '2025-04-05', playUrl: '#', artistId: '' },
        { id: generateId(), name: '月光下', duration: 203, releaseDate: '2025-08-22', playUrl: '#', artistId: '' },
      ],
    },
    {
      id: generateId(),
      name: '电音风暴',
      avatarUrl: 'https://picsum.photos/seed/edmstorm/200/200',
      styleTags: ['电子', '流行'],
      bio: '高能电子舞曲制作人，多首单曲登上电子音乐排行榜。',
      works: [
        { id: generateId(), name: '脉冲', duration: 195, releaseDate: '2025-05-18', playUrl: '#', artistId: '' },
        { id: generateId(), name: '霓虹之夜', duration: 248, releaseDate: '2025-10-30', playUrl: '#', artistId: '' },
      ],
    },
    {
      id: generateId(),
      name: '嘻哈工厂',
      avatarUrl: 'https://picsum.photos/seed/hiphop/200/200',
      styleTags: ['嘻哈', 'R&B'],
      bio: '新生代说唱组合，歌词犀利，曲风多变。',
      works: [
        { id: generateId(), name: '城市节拍', duration: 215, releaseDate: '2025-03-08', playUrl: '#', artistId: '' },
        { id: generateId(), name: '逐梦者', duration: 238, releaseDate: '2025-11-15', playUrl: '#', artistId: '' },
      ],
    },
  ];

  sampleArtists.forEach(artist => {
    artist.works.forEach(work => {
      work.artistId = artist.id;
    });
    artists.set(artist.id, artist);
  });

  const samplePerformances: Performance[] = [
    { id: generateId(), artistId: sampleArtists[0].id, date: '2025-06-20', time: '20:00', venue: '星光剧场', notes: '专辑首发演出' },
    { id: generateId(), artistId: sampleArtists[0].id, date: '2025-06-20', time: '22:00', venue: '地下俱乐部', notes: 'after party' },
    { id: generateId(), artistId: sampleArtists[0].id, date: '2025-07-05', time: '19:30', venue: '音乐节主舞台', notes: '音乐节演出' },
    { id: generateId(), artistId: sampleArtists[1].id, date: '2025-06-22', time: '21:00', venue: '爵士酒吧', notes: '周末专场' },
    { id: generateId(), artistId: sampleArtists[2].id, date: '2025-06-25', time: '20:00', venue: 'livehouse', notes: '巡演首站' },
    { id: generateId(), artistId: sampleArtists[3].id, date: '2025-07-10', time: '23:00', venue: '电音俱乐部', notes: 'guest DJ set' },
    { id: generateId(), artistId: sampleArtists[4].id, date: '2025-07-15', time: '20:30', venue: '嘻哈空间', notes: '新专辑发布' },
  ];

  samplePerformances.forEach(p => performances.set(p.id, p));
};

seedData();

const calculateStyleSimilarity = (tags1: string[], tags2: string[]): number => {
  if (tags1.length === 0 || tags2.length === 0) return 0;
  const set1 = new Set(tags1);
  let common = 0;
  tags2.forEach(tag => {
    if (set1.has(tag)) common++;
  });
  return (common / Math.max(tags1.length, tags2.length)) * 100;
};

app.get('/api/artists', (req, res) => {
  const list = Array.from(artists.values());
  res.json(list);
});

app.get('/api/artists/:id', (req, res) => {
  const artist = artists.get(req.params.id);
  if (!artist) {
    res.status(404).json({ error: 'Artist not found' });
    return;
  }
  res.json(artist);
});

app.post('/api/artists', (req, res) => {
  const { name, avatarUrl, styleTags, bio } = req.body;
  const id = generateId();
  const newArtist: Artist = {
    id,
    name,
    avatarUrl: avatarUrl || '',
    styleTags: styleTags || [],
    bio: bio || '',
    works: [],
  };
  artists.set(id, newArtist);
  res.status(201).json(newArtist);
});

app.put('/api/artists/:id', (req, res) => {
  const artist = artists.get(req.params.id);
  if (!artist) {
    res.status(404).json({ error: 'Artist not found' });
    return;
  }
  const { name, avatarUrl, styleTags, bio } = req.body;
  if (name !== undefined) artist.name = name;
  if (avatarUrl !== undefined) artist.avatarUrl = avatarUrl;
  if (styleTags !== undefined) artist.styleTags = styleTags;
  if (bio !== undefined) artist.bio = bio;
  res.json(artist);
});

app.delete('/api/artists/:id', (req, res) => {
  const deleted = artists.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Artist not found' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/artists/:id/works', (req, res) => {
  const artist = artists.get(req.params.id);
  if (!artist) {
    res.status(404).json({ error: 'Artist not found' });
    return;
  }
  const { name, duration, releaseDate, playUrl } = req.body;
  const id = generateId();
  const newWork: Work = {
    id,
    name,
    duration,
    releaseDate,
    playUrl: playUrl || '#',
    artistId: artist.id,
  };
  artist.works.push(newWork);
  res.status(201).json(newWork);
});

app.put('/api/artists/:artistId/works/:workId', (req, res) => {
  const artist = artists.get(req.params.artistId);
  if (!artist) {
    res.status(404).json({ error: 'Artist not found' });
    return;
  }
  const work = artist.works.find(w => w.id === req.params.workId);
  if (!work) {
    res.status(404).json({ error: 'Work not found' });
    return;
  }
  const { name, duration, releaseDate, playUrl } = req.body;
  if (name !== undefined) work.name = name;
  if (duration !== undefined) work.duration = duration;
  if (releaseDate !== undefined) work.releaseDate = releaseDate;
  if (playUrl !== undefined) work.playUrl = playUrl;
  res.json(work);
});

app.delete('/api/artists/:artistId/works/:workId', (req, res) => {
  const artist = artists.get(req.params.artistId);
  if (!artist) {
    res.status(404).json({ error: 'Artist not found' });
    return;
  }
  const idx = artist.works.findIndex(w => w.id === req.params.workId);
  if (idx === -1) {
    res.status(404).json({ error: 'Work not found' });
    return;
  }
  artist.works.splice(idx, 1);
  res.json({ success: true });
});

app.get('/api/performances', (req, res) => {
  const { artistId, date } = req.query;
  let list = Array.from(performances.values());
  if (artistId) {
    list = list.filter(p => p.artistId === artistId);
  }
  if (date) {
    list = list.filter(p => p.date === date);
  }
  res.json(list);
});

app.post('/api/performances', (req, res) => {
  const { artistId, date, time, venue, notes } = req.body;
  const id = generateId();
  const newPerf: Performance = {
    id,
    artistId,
    date,
    time,
    venue,
    notes: notes || '',
  };
  performances.set(id, newPerf);
  res.status(201).json(newPerf);
});

app.put('/api/performances/:id', (req, res) => {
  const perf = performances.get(req.params.id);
  if (!perf) {
    res.status(404).json({ error: 'Performance not found' });
    return;
  }
  const { date, time, venue, notes } = req.body;
  if (date !== undefined) perf.date = date;
  if (time !== undefined) perf.time = time;
  if (venue !== undefined) perf.venue = venue;
  if (notes !== undefined) perf.notes = notes;
  res.json(perf);
});

app.delete('/api/performances/:id', (req, res) => {
  const deleted = performances.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Performance not found' });
    return;
  }
  res.json({ success: true });
});

app.get('/api/search', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  if (!query) {
    res.json([]);
    return;
  }

  const results: SearchResult[] = [];

  artists.forEach(artist => {
    const nameMatch = artist.name.toLowerCase().indexOf(query);
    if (nameMatch !== -1) {
      results.push({
        type: 'artist',
        id: artist.id,
        name: artist.name,
        matchScore: 100 - nameMatch,
      });
    }

    artist.works.forEach(work => {
      const workMatch = work.name.toLowerCase().indexOf(query);
      if (workMatch !== -1) {
        results.push({
          type: 'work',
          id: work.id,
          name: work.name,
          artistId: artist.id,
          artistName: artist.name,
          matchScore: 80 - workMatch,
        });
      }
    });
  });

  results.sort((a, b) => b.matchScore - a.matchScore);
  res.json(results.slice(0, 20));
});

app.get('/api/artists/:id/similarity', (req, res) => {
  const artist = artists.get(req.params.id);
  if (!artist) {
    res.status(404).json({ error: 'Artist not found' });
    return;
  }

  const similarWorks: { workA: Work; workB: Work; similarity: number }[] = [];
  const allWorks: Work[] = [];

  artists.forEach(a => {
    a.works.forEach(w => allWorks.push(w));
  });

  const currentArtistWorks = artist.works;

  for (let i = 0; i < allWorks.length; i++) {
    for (let j = i + 1; j < allWorks.length; j++) {
      const workA = allWorks[i];
      const workB = allWorks[j];
      const artistA = artists.get(workA.artistId);
      const artistB = artists.get(workB.artistId);
      if (!artistA || !artistB) continue;

      const similarity = calculateStyleSimilarity(artistA.styleTags, artistB.styleTags);
      if (similarity > 0) {
        const inCurrentArtist = workA.artistId === artist.id || workB.artistId === artist.id;
        if (inCurrentArtist || similarity >= 50) {
          similarWorks.push({ workA, workB, similarity });
        }
      }
    }
  }

  res.json({
    works: currentArtistWorks,
    relatedWorks: allWorks.filter(w => w.artistId !== artist.id).slice(0, 10),
    connections: similarWorks,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
