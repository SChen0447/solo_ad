import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

type MoodType = 'happy' | 'calm' | 'sad' | 'angry' | 'excited' | 'tired';

interface Song {
  id: string;
  title: string;
  artist: string;
  albumCoverUrl: string;
  genre: string;
  moods: MoodType[];
  reason: Record<MoodType, string>;
}

interface FeedbackEntry {
  songId: string;
  mood: MoodType;
  liked: boolean;
  timestamp: number;
}

interface FavoriteEntry {
  id: string;
  songId: string;
  title: string;
  artist: string;
  albumCoverUrl: string;
}

const moodReasons: Record<MoodType, Record<string, string>> = {
  happy: {
    pop: '轻快节奏让你心情飞扬',
    dance: '欢快节拍延续好心情',
    rnb: '柔和旋律让你放松愉悦',
    rock: '活力旋律释放快乐能量',
    electronic: '动感节拍带动情绪',
    folk: '清新曲风让你轻松自在',
    jazz: '轻快爵士增添愉悦氛围',
    hiphop: '活力节奏提升好心情',
    soul: '温暖音色抚慰心灵',
    classical: '优雅旋律带来内心喜悦',
    indie: '独立曲风陪你感受美好',
    alternative: '独特音色激发好心情',
    bossa: '慵懒节拍让你悠然自得',
    blues: '轻快蓝调扫走阴霾',
  },
  calm: {
    pop: '舒缓流行带来宁静时光',
    dance: '轻柔节拍让你心平气和',
    rnb: '丝滑节奏帮你放松身心',
    rock: '柔和旋律带来内心平静',
    electronic: '空灵音色营造安静氛围',
    folk: '质朴旋律带你回归宁静',
    jazz: '爵士旋律让心灵沉淀',
    hiphop: '轻声吟唱抚平烦躁',
    soul: '灵魂乐音温暖你的内心',
    classical: '古典乐章带来深度放松',
    indie: '独立小调陪你静享时光',
    alternative: '另类音色营造安静空间',
    bossa: '波萨诺瓦让你彻底放松',
    blues: '低沉蓝调带你进入宁静',
  },
  sad: {
    pop: '温柔旋律陪伴你度过低落',
    dance: '轻快节拍慢慢驱散忧伤',
    rnb: '深情曲调理解你的心情',
    rock: '低沉音色与你的情绪共振',
    electronic: '迷幻音色带你走出低谷',
    folk: '民谣旋律温暖你的心',
    jazz: '忧郁爵士陪你静享感伤',
    hiphop: '真实歌词说出你的心声',
    soul: '灵魂深处的声音懂你',
    classical: '深情乐章陪你感受情绪',
    indie: '独立旋律与你共鸣',
    alternative: '另类曲风释放内心忧伤',
    bossa: '慵懒旋律温柔拥抱你',
    blues: '蓝调旋律与忧伤同行',
  },
  angry: {
    pop: '有力旋律帮你释放情绪',
    dance: '强烈节拍发泄你的怒火',
    rnb: '深沉曲调化解内心愤怒',
    rock: '摇滚力量释放不羁能量',
    electronic: '重低音节拍宣泄情绪',
    folk: '质朴旋律平复心情',
    jazz: '激烈爵士释放内心压力',
    hiphop: '说唱力量表达你的态度',
    soul: '灵魂乐音平息内心风暴',
    classical: '激昂乐章释放你的能量',
    indie: '独立曲风发泄不满情绪',
    alternative: '另类音色释放内心愤怒',
    bossa: '轻柔旋律帮你冷静下来',
    blues: '蓝调节奏带走你的怒气',
  },
  excited: {
    pop: '活力流行点燃你的热情',
    dance: '动感舞曲让你尽情嗨',
    rnb: '节奏蓝调激发你的活力',
    rock: '摇滚激情燃烧你的细胞',
    electronic: '电子节拍让你嗨到爆',
    folk: '欢快民谣带来兴奋感',
    jazz: '动感爵士让你活力满满',
    hiphop: '说唱节拍激发你的斗志',
    soul: '灵魂乐释放你的热情',
    classical: '激昂乐章点燃你的激情',
    indie: '独立摇滚释放你的能量',
    alternative: '另类节拍让你热血沸腾',
    bossa: '热情旋律点燃你的活力',
    blues: '蓝调节奏带动你的情绪',
  },
  tired: {
    pop: '轻柔旋律帮你恢复精力',
    dance: '舒缓节拍慢慢唤醒你',
    rnb: '丝滑旋律让你放松充电',
    rock: '轻摇滚帮你提神醒脑',
    electronic: '空灵电子带你放松身心',
    folk: '安静民谣让你恢复能量',
    jazz: '慵懒爵士帮你解乏',
    hiphop: '低沉说唱陪你休息',
    soul: '温暖灵魂乐抚慰疲惫',
    classical: '舒缓乐章帮你恢复精力',
    indie: '独立小调让你安然休息',
    alternative: '轻柔另类帮你放松充电',
    bossa: '波萨诺瓦让你彻底放松',
    blues: '轻柔蓝调帮你恢复能量',
  },
};

const songs: Song[] = [
  { id: '1', title: '阳光彩虹小白马', artist: '大张伟', albumCoverUrl: '', genre: 'pop', moods: ['happy', 'excited'], reason: moodReasons },
  { id: '2', title: '晴天', artist: '周杰伦', albumCoverUrl: '', genre: 'pop', moods: ['happy', 'calm'], reason: moodReasons },
  { id: '3', title: '小幸运', artist: '田馥甄', albumCoverUrl: '', genre: 'pop', moods: ['happy', 'calm'], reason: moodReasons },
  { id: '4', title: '起风了', artist: '买辣椒也用券', albumCoverUrl: '', genre: 'folk', moods: ['calm', 'sad'], reason: moodReasons },
  { id: '5', title: '南山南', artist: '马頔', albumCoverUrl: '', genre: 'folk', moods: ['sad', 'calm'], reason: moodReasons },
  { id: '6', title: '消愁', artist: '毛不易', albumCoverUrl: '', genre: 'folk', moods: ['sad', 'tired'], reason: moodReasons },
  { id: '7', title: '倔强', artist: '五月天', albumCoverUrl: '', genre: 'rock', moods: ['angry', 'excited'], reason: moodReasons },
  { id: '8', title: '海阔天空', artist: 'Beyond', albumCoverUrl: '', genre: 'rock', moods: ['excited', 'angry'], reason: moodReasons },
  { id: '9', title: '光辉岁月', artist: 'Beyond', albumCoverUrl: '', genre: 'rock', moods: ['excited', 'happy'], reason: moodReasons },
  { id: '10', title: 'Faded', artist: 'Alan Walker', albumCoverUrl: '', genre: 'electronic', moods: ['calm', 'sad'], reason: moodReasons },
  { id: '11', title: 'Titanium', artist: 'David Guetta', albumCoverUrl: '', genre: 'electronic', moods: ['excited', 'angry'], reason: moodReasons },
  { id: '12', title: 'Closer', artist: 'The Chainsmokers', albumCoverUrl: '', genre: 'electronic', moods: ['excited', 'happy'], reason: moodReasons },
  { id: '13', title: 'Take Five', artist: 'Dave Brubeck', albumCoverUrl: '', genre: 'jazz', moods: ['calm', 'happy'], reason: moodReasons },
  { id: '14', title: 'So What', artist: 'Miles Davis', albumCoverUrl: '', genre: 'jazz', moods: ['calm', 'tired'], reason: moodReasons },
  { id: '15', title: 'Blue in Green', artist: 'Miles Davis', albumCoverUrl: '', genre: 'jazz', moods: ['sad', 'calm'], reason: moodReasons },
  { id: '16', title: 'Lose Yourself', artist: 'Eminem', albumCoverUrl: '', genre: 'hiphop', moods: ['angry', 'excited'], reason: moodReasons },
  { id: '17', title: 'Humble', artist: 'Kendrick Lamar', albumCoverUrl: '', genre: 'hiphop', moods: ['angry', 'excited'], reason: moodReasons },
  { id: '18', title: 'God\'s Plan', artist: 'Drake', albumCoverUrl: '', genre: 'hiphop', moods: ['happy', 'calm'], reason: moodReasons },
  { id: '19', title: 'No One', artist: 'Alicia Keys', albumCoverUrl: '', genre: 'soul', moods: ['happy', 'calm'], reason: moodReasons },
  { id: '20', title: 'Superstition', artist: 'Stevie Wonder', albumCoverUrl: '', genre: 'soul', moods: ['happy', 'excited'], reason: moodReasons },
  { id: '21', title: 'Ain\'t No Sunshine', artist: 'Bill Withers', albumCoverUrl: '', genre: 'soul', moods: ['sad', 'tired'], reason: moodReasons },
  { id: '22', title: '月光奏鸣曲', artist: '贝多芬', albumCoverUrl: '', genre: 'classical', moods: ['sad', 'calm'], reason: moodReasons },
  { id: '23', title: '四季·春', artist: '维瓦尔第', albumCoverUrl: '', genre: 'classical', moods: ['happy', 'calm'], reason: moodReasons },
  { id: '24', title: '卡农', artist: '帕赫贝尔', albumCoverUrl: '', genre: 'classical', moods: ['calm', 'tired'], reason: moodReasons },
  { id: '25', title: 'Creep', artist: 'Radiohead', albumCoverUrl: '', genre: 'alternative', moods: ['sad', 'angry'], reason: moodReasons },
  { id: '26', title: 'Smells Like Teen Spirit', artist: 'Nirvana', albumCoverUrl: '', genre: 'alternative', moods: ['angry', 'excited'], reason: moodReasons },
  { id: '27', title: 'Fix You', artist: 'Coldplay', albumCoverUrl: '', genre: 'alternative', moods: ['sad', 'tired'], reason: moodReasons },
  { id: '28', title: 'The Girl from Ipanema', artist: 'Stan Getz', albumCoverUrl: '', genre: 'bossa', moods: ['calm', 'happy'], reason: moodReasons },
  { id: '29', title: 'Desafinado', artist: 'João Gilberto', albumCoverUrl: '', genre: 'bossa', moods: ['calm', 'tired'], reason: moodReasons },
  { id: '30', title: 'Blue Moon', artist: 'Billie Holiday', albumCoverUrl: '', genre: 'blues', moods: ['sad', 'tired'], reason: moodReasons },
  { id: '31', title: 'The Thrill Is Gone', artist: 'B.B. King', albumCoverUrl: '', genre: 'blues', moods: ['sad', 'calm'], reason: moodReasons },
  { id: '32', title: 'Rolling in the Deep', artist: 'Adele', albumCoverUrl: '', genre: 'soul', moods: ['angry', 'sad'], reason: moodReasons },
  { id: '33', title: 'Bohemian Rhapsody', artist: 'Queen', albumCoverUrl: '', genre: 'rock', moods: ['excited', 'angry'], reason: moodReasons },
  { id: '34', title: 'Shape of You', artist: 'Ed Sheeran', albumCoverUrl: '', genre: 'pop', moods: ['happy', 'excited'], reason: moodReasons },
  { id: '35', title: '稻香', artist: '周杰伦', albumCoverUrl: '', genre: 'pop', moods: ['happy', 'tired'], reason: moodReasons },
];

const feedbackStore: FeedbackEntry[] = [];
const favoritesStore: FavoriteEntry[] = [];

function getRecommendations(mood: MoodType): Song[] {
  const feedbackMap = new Map<string, number>();
  for (const fb of feedbackStore) {
    if (fb.mood === mood) {
      const current = feedbackMap.get(fb.songId) || 0;
      feedbackMap.set(fb.songId, current + (fb.liked ? 1 : -2));
    }
  }

  const scored = songs
    .filter(s => s.moods.includes(mood))
    .map(song => {
      let score = 1;
      if (song.moods.includes(mood)) score += 3;
      if (song.moods[0] === mood) score += 2;
      score += feedbackMap.get(song.id) || 0;
      return { song, score };
    });

  scored.sort((a, b) => b.score - a.score);

  const dislikedIds = new Set(
    feedbackStore
      .filter(fb => fb.mood === mood && !fb.liked)
      .map(fb => fb.songId)
  );

  let result = scored.filter(s => s.score > 0 && !dislikedIds.has(s.song.id));

  if (result.length < 10) {
    const remaining = scored
      .filter(s => !result.some(r => r.song.id === s.song.id))
      .sort((a, b) => b.score - a.score);
    result = [...result, ...remaining];
  }

  return result.slice(0, 10).map(s => s.song);
}

app.get('/api/songs', (req, res) => {
  const mood = req.query.mood as MoodType;
  const validMoods: MoodType[] = ['happy', 'calm', 'sad', 'angry', 'excited', 'tired'];
  if (!mood || !validMoods.includes(mood)) {
    res.status(400).json({ error: 'Invalid mood parameter' });
    return;
  }
  const recommendations = getRecommendations(mood);
  res.json(recommendations.map(song => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    albumCoverUrl: song.albumCoverUrl,
    genre: song.genre,
    reason: song.reason[mood]?.[song.genre] || '这首歌很适合你当前的心情',
  })));
});

app.post('/api/feedback', (req, res) => {
  const { songId, mood, liked } = req.body;
  if (!songId || !mood || typeof liked !== 'boolean') {
    res.status(400).json({ error: 'Invalid feedback data' });
    return;
  }
  feedbackStore.push({ songId, mood, liked, timestamp: Date.now() });
  res.json({ success: true });
});

app.get('/api/favorites', (_req, res) => {
  res.json(favoritesStore);
});

app.post('/api/favorites', (req, res) => {
  const { songId, title, artist, albumCoverUrl } = req.body;
  if (!songId || !title) {
    res.status(400).json({ error: 'Invalid favorite data' });
    return;
  }
  const exists = favoritesStore.find(f => f.songId === songId);
  if (exists) {
    res.json(exists);
    return;
  }
  const fav: FavoriteEntry = { id: uuidv4(), songId, title, artist, albumCoverUrl };
  favoritesStore.push(fav);
  res.json(fav);
});

app.delete('/api/favorites/:id', (req, res) => {
  const idx = favoritesStore.findIndex(f => f.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Favorite not found' });
    return;
  }
  favoritesStore.splice(idx, 1);
  res.json({ success: true });
});

app.put('/api/favorites/reorder', (req, res) => {
  const { order } = req.body as { order: string[] };
  if (!Array.isArray(order)) {
    res.status(400).json({ error: 'Invalid reorder data' });
    return;
  }
  const reordered = order
    .map(id => favoritesStore.find(f => f.id === id))
    .filter(Boolean) as FavoriteEntry[];
  favoritesStore.length = 0;
  favoritesStore.push(...reordered);
  res.json({ success: true });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
