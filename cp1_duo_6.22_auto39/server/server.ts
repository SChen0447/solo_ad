import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

export interface Song {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  duration: number;
  notes: string;
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let songs: Song[] = [
  {
    id: uuidv4(),
    name: 'Smells Like Teen Spirit',
    artist: 'Nirvana',
    bpm: 116,
    duration: 301,
    notes: '经典垃圾摇滚，注意副歌部分的爆发力'
  },
  {
    id: uuidv4(),
    name: 'Bohemian Rhapsody',
    artist: 'Queen',
    bpm: 72,
    duration: 354,
    notes: '歌剧式段落，多声部配合'
  },
  {
    id: uuidv4(),
    name: 'Hotel California',
    artist: 'Eagles',
    bpm: 75,
    duration: 390,
    notes: '经典吉他solo，注意节奏稳定性'
  },
  {
    id: uuidv4(),
    name: 'Sweet Child O Mine',
    artist: "Guns N' Roses",
    bpm: 125,
    duration: 356,
    notes: '标志性riff开场，注意速度'
  }
];

app.get('/api/songs', (_req, res) => {
  res.json(songs);
});

app.post('/api/songs', (req, res) => {
  const { name, artist, bpm, duration, notes } = req.body;
  
  if (!name || !bpm) {
    return res.status(400).json({ error: '曲名和BPM为必填项' });
  }

  const newSong: Song = {
    id: uuidv4(),
    name,
    artist: artist || '',
    bpm: Number(bpm),
    duration: Number(duration) || 0,
    notes: notes || ''
  };

  songs.push(newSong);
  res.status(201).json(newSong);
});

app.put('/api/songs/:id', (req, res) => {
  const { id } = req.params;
  const index = songs.findIndex(song => song.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '曲目不存在' });
  }

  songs[index] = {
    ...songs[index],
    ...req.body,
    id
  };

  res.json(songs[index]);
});

app.delete('/api/songs/:id', (req, res) => {
  const { id } = req.params;
  const index = songs.findIndex(song => song.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '曲目不存在' });
  }

  songs.splice(index, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
