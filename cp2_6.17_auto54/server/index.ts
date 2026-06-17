import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(bodyParser.json());

type MoodType = 'happy' | 'calm' | 'sad' | 'angry' | 'excited' | 'tired';

interface Song {
  id: string;
  title: string;
  artist: string;
  albumCover: string;
  genre: string;
  moods: MoodType[];
}

interface Feedback {
  id: string;
  songId: string;
  type: 'like' | 'dislike';
  mood: MoodType;
  timestamp: number;
}

interface Favorite {
  id: string;
  song: Song;
  addedAt: number;
  order: number;
}

const moodGradients: Record<MoodType, [string, string]> = {
  happy: ['#FFD93D', '#FF9F43'],
  calm: ['#6C5CE7', '#A29BFE'],
  sad: ['#636E72', '#DFE6E9'],
  angry: ['#FF6B6B', '#C0392B'],
  excited: ['#00CEC9', '#55EFC4'],
  tired: ['#B2BEC3', '#FDCB6E'],
};

const moodReasons: Record<MoodType, string[]> = {
  happy: [
    '欢快的节奏让你的好心情加倍',
    '明亮的旋律适合此刻的愉悦',
    '这首歌会让笑容一直停留在脸上',
    '活力满满，继续保持这份快乐',
    '轻松愉悦的氛围与你完美匹配',
  ],
  calm: [
    '舒缓的旋律帮助你保持内心宁静',
    '温柔的音符适合放松身心',
    '让这首安静的曲子陪你度过平静时光',
    '淡雅的氛围与你的心境完美契合',
    '平和的节奏让思绪更加清晰',
  ],
  sad: [
    '让音乐陪你度过这段时光',
    '这首曲子懂你的心情',
    '有时候，悲伤也需要被倾听',
    '在旋律中慢慢释放情绪',
    '温柔的旋律给你一个拥抱',
  ],
  angry: [
    '用强烈的节奏释放内心的能量',
    '让音乐带走你的怒火',
    '劲爆的节拍帮你宣泄情绪',
    '在激昂的旋律中找回平静',
    '这首硬核曲目正符合此刻的心情',
  ],
  excited: [
    '高燃节奏点燃你的激情',
    '动感旋律让你的兴奋持续升温',
    '这首电音神曲与你的能量完美匹配',
    '跟着节拍尽情释放吧',
    '让音乐带着你的热情起飞',
  ],
  tired: [
    '轻柔的旋律帮你缓解疲惫',
    '舒缓的节奏适合放松休息',
    '温暖的音符给你充电',
    '让这首慢歌陪你恢复精力',
    '慵懒的氛围与你此刻完美契合',
  ],
};

const songLibrary: Song[] = [
  { id: '1', title: '夏日微风', artist: '阳光乐队', albumCover: '', genre: 'Pop', moods: ['happy', 'calm'] },
  { id: '2', title: '星空漫步', artist: '夜空诗人', albumCover: '', genre: 'Ambient', moods: ['calm', 'tired'] },
  { id: '3', title: '雨后彩虹', artist: '心灵歌者', albumCover: '', genre: 'Indie', moods: ['happy', 'calm'] },
  { id: '4', title: '深海探索', artist: '蔚蓝之声', albumCover: '', genre: 'Electronic', moods: ['calm', 'sad'] },
  { id: '5', title: '燃烧的心', artist: '烈焰组合', albumCover: '', genre: 'Rock', moods: ['angry', 'excited'] },
  { id: '6', title: '午夜狂奔', artist: '极速乐队', albumCover: '', genre: 'Rock', moods: ['excited', 'angry'] },
  { id: '7', title: '温柔乡', artist: '月光女神', albumCover: '', genre: 'Ballad', moods: ['sad', 'calm'] },
  { id: '8', title: '欢乐颂', artist: '快乐家族', albumCover: '', genre: 'Pop', moods: ['happy', 'excited'] },
  { id: '9', title: '追梦赤子心', artist: '梦想家', albumCover: '', genre: 'Rock', moods: ['excited', 'happy'] },
  { id: '10', title: '安静的角落', artist: '独奏者', albumCover: '', genre: 'Piano', moods: ['calm', 'sad', 'tired'] },
  { id: '11', title: '晨曦之光', artist: '黎明合唱团', albumCover: '', genre: 'New Age', moods: ['calm', 'happy'] },
  { id: '12', title: '风暴来袭', artist: '雷神乐队', albumCover: '', genre: 'Metal', moods: ['angry', 'excited'] },
  { id: '13', title: '落叶归根', artist: '秋思', albumCover: '', genre: 'Folk', moods: ['sad', 'calm'] },
  { id: '14', title: '阳光宅男', artist: '青春派', albumCover: '', genre: 'Pop', moods: ['happy', 'excited'] },
  { id: '15', title: '云端漫步', artist: '飞翔者', albumCover: '', genre: 'Ambient', moods: ['calm', 'tired'] },
  { id: '16', title: '心碎情歌', artist: '伤感王子', albumCover: '', genre: 'Ballad', moods: ['sad'] },
  { id: '17', title: '怒放的生命', artist: '摇滚之心', albumCover: '', genre: 'Rock', moods: ['excited', 'angry'] },
  { id: '18', title: '甜蜜蜜', artist: '柔情蜜意', albumCover: '', genre: 'Pop', moods: ['happy', 'calm'] },
  { id: '19', title: '夜曲', artist: '周杰伦', albumCover: '', genre: 'R&B', moods: ['calm', 'sad', 'tired'] },
  { id: '20', title: '逆战', artist: '张杰', albumCover: '', genre: 'Rock', moods: ['excited', 'angry'] },
  { id: '21', title: '小幸运', artist: '田馥甄', albumCover: '', genre: 'Pop', moods: ['happy', 'calm'] },
  { id: '22', title: '平凡之路', artist: '朴树', albumCover: '', genre: 'Folk', moods: ['calm', 'sad', 'tired'] },
  { id: '23', title: '光年之外', artist: '邓紫棋', albumCover: '', genre: 'Pop', moods: ['sad', 'calm'] },
  { id: '24', title: '海阔天空', artist: 'Beyond', albumCover: '', genre: 'Rock', moods: ['excited', 'happy'] },
  { id: '25', title: '夜空中最亮的星', artist: '逃跑计划', albumCover: '', genre: 'Indie', moods: ['calm', 'sad', 'happy'] },
  { id: '26', title: '起风了', artist: '买辣椒也用券', albumCover: '', genre: 'Folk', moods: ['calm', 'tired'] },
  { id: '27', title: '孤勇者', artist: '陈奕迅', albumCover: '', genre: 'Pop', moods: ['excited', 'angry'] },
  { id: '28', title: '稻香', artist: '周杰伦', albumCover: '', genre: 'Pop', moods: ['happy', 'calm', 'tired'] },
  { id: '29', title: '晴天', artist: '周杰伦', albumCover: '', genre: 'Pop', moods: ['happy', 'sad'] },
  { id: '30', title: '七里香', artist: '周杰伦', albumCover: '', genre: 'Pop', moods: ['happy', 'calm'] },
  { id: '31', title: '青花瓷', artist: '周杰伦', albumCover: '', genre: 'R&B', moods: ['calm', 'sad'] },
  { id: '32', title: '演员', artist: '薛之谦', albumCover: '', genre: 'Ballad', moods: ['sad', 'calm'] },
  { id: '33', title: '告白气球', artist: '周杰伦', albumCover: '', genre: 'Pop', moods: ['happy', 'excited'] },
  { id: '34', title: '成都', artist: '赵雷', albumCover: '', genre: 'Folk', moods: ['calm', 'tired', 'sad'] },
  { id: '35', title: '沙漠骆驼', artist: '展展与罗罗', albumCover: '', genre: 'Folk', moods: ['excited', 'happy'] },
];

let feedbackStore: Feedback[] = [];
let favoritesStore: Favorite[] = [];

function getWeightedSongs(mood: MoodType): { song: Song; score: number; reason: string }[] {
  const moodSongs = songLibrary.filter((song) => song.moods.includes(mood));
  const reasons = moodReasons[mood];

  const scored = moodSongs.map((song) => {
    let score = 1;

    const likes = feedbackStore.filter(
      (f) => f.songId === song.id && f.type === 'like' && f.mood === mood
    ).length;
    const dislikes = feedbackStore.filter(
      (f) => f.songId === song.id && f.type === 'dislike' && f.mood === mood
    ).length;

    score += likes * 2;
    score -= dislikes * 3;

    const genreLikes = feedbackStore.filter(
      (f) => f.type === 'like' && f.mood === mood
    );
    for (const fb of genreLikes) {
      const fbSong = songLibrary.find((s) => s.id === fb.songId);
      if (fbSong && fbSong.genre === song.genre) {
        score += 0.5;
      }
    }

    score += Math.random() * 0.5;

    const reason = reasons[Math.floor(Math.random() * reasons.length)];

    return { song, score, reason };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10);
}

app.get('/api/songs', (req, res) => {
  const mood = req.query.mood as MoodType;

  if (!mood || !moodGradients[mood]) {
    return res.status(400).json({ error: 'Invalid mood parameter' });
  }

  const recommendations = getWeightedSongs(mood).map((item) => ({
    ...item.song,
    gradient: moodGradients[mood],
    reason: item.reason,
  }));

  setTimeout(() => {
    res.json(recommendations);
  }, 200);
});

app.post('/api/feedback', (req, res) => {
  const { songId, type, mood } = req.body;

  if (!songId || !type || !mood) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (type !== 'like' && type !== 'dislike') {
    return res.status(400).json({ error: 'Invalid feedback type' });
  }

  if (!moodGradients[mood]) {
    return res.status(400).json({ error: 'Invalid mood' });
  }

  const feedback: Feedback = {
    id: uuidv4(),
    songId,
    type,
    mood,
    timestamp: Date.now(),
  };

  feedbackStore.push(feedback);

  res.json({ success: true, feedback });
});

app.get('/api/favorites', (req, res) => {
  const sorted = [...favoritesStore].sort((a, b) => a.order - b.order);
  res.json(sorted.map((f) => ({ ...f, gradient: ['#6C5CE7', '#A29BFE'] as [string, string] })));
});

app.post('/api/favorites', (req, res) => {
  const { song, action } = req.body;

  if (!song || !song.id) {
    return res.status(400).json({ error: 'Invalid song data' });
  }

  if (action === 'add') {
    const existing = favoritesStore.find((f) => f.song.id === song.id);
    if (existing) {
      return res.json({ success: false, message: 'Already in favorites' });
    }

    const favorite: Favorite = {
      id: uuidv4(),
      song,
      addedAt: Date.now(),
      order: favoritesStore.length,
    };

    favoritesStore.push(favorite);
    return res.json({ success: true, favorite });
  } else if (action === 'remove') {
    const idx = favoritesStore.findIndex((f) => f.song.id === song.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    favoritesStore.splice(idx, 1);
    favoritesStore.forEach((f, i) => (f.order = i));
    return res.json({ success: true });
  } else if (action === 'reorder' && Array.isArray(req.body.order)) {
    const orderMap: Record<string, number> = {};
    req.body.order.forEach((id: string, idx: number) => {
      orderMap[id] = idx;
    });
    favoritesStore.forEach((f) => {
      if (orderMap[f.id] !== undefined) {
        f.order = orderMap[f.id];
      }
    });
    return res.json({ success: true });
  }

  res.status(400).json({ error: 'Invalid action' });
});

app.listen(PORT, () => {
  console.log(`🎵 Music recommendation server running on http://localhost:${PORT}`);
});
