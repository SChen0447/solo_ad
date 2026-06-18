export type Mood = '轻松' | '激昂' | '悬疑' | '忧郁' | '温暖' | '科技';

export interface MusicTrack {
  id: string;
  title: string;
  duration: string;
  mood: Mood;
  previewUrl: string;
}

export interface SummaryItem {
  id: string;
  text: string;
  mood: Mood;
}

export const moodList: Mood[] = ['轻松', '激昂', '悬疑', '忧郁', '温暖', '科技'];

export const moodGradients: Record<Mood, { from: string; to: string }> = {
  轻松: { from: '#84fab0', to: '#8fd3f4' },
  激昂: { from: '#f093fb', to: '#f5576c' },
  悬疑: { from: '#4facfe', to: '#00f2fe' },
  忧郁: { from: '#667eea', to: '#764ba2' },
  温暖: { from: '#ffecd2', to: '#fcb69f' },
  科技: { from: '#0ba360', to: '#3cba92' },
};

export const mockMusicLibrary: MusicTrack[] = [
  { id: 'm1', title: '晨雾漫步', duration: '2:34', mood: '轻松', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'm2', title: '云端漂浮', duration: '3:12', mood: '轻松', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'm3', title: '午后阳光', duration: '2:45', mood: '轻松', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'm4', title: '逐风破浪', duration: '3:58', mood: '激昂', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'm5', title: '热血征途', duration: '4:02', mood: '激昂', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { id: 'm6', title: '勇者之心', duration: '3:30', mood: '激昂', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
  { id: 'm7', title: '迷雾追踪', duration: '2:56', mood: '悬疑', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
  { id: 'm8', title: '暗夜行者', duration: '3:18', mood: '悬疑', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  { id: 'm9', title: '未解之谜', duration: '2:44', mood: '悬疑', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
  { id: 'm10', title: '夜雨独白', duration: '3:22', mood: '忧郁', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
  { id: 'm11', title: '离别之秋', duration: '4:05', mood: '忧郁', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3' },
  { id: 'm12', title: '旧时光里', duration: '2:58', mood: '忧郁', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' },
  { id: 'm13', title: '家的方向', duration: '3:06', mood: '温暖', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
  { id: 'm14', title: '拥抱星空', duration: '2:48', mood: '温暖', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3' },
  { id: 'm15', title: '温柔回响', duration: '3:14', mood: '温暖', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3' },
  { id: 'm16', title: '数字黎明', duration: '2:40', mood: '科技', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' },
  { id: 'm17', title: '量子跃迁', duration: '3:28', mood: '科技', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3' },
  { id: 'm18', title: '赛博都市', duration: '3:52', mood: '科技', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-18.mp3' },
];

const transitionWords = ['但是', '然而', '不过', '其实', '事实上', '另一方面', '更重要的是', '值得注意的是', '突然', '于是', '因此', '所以'];

const moodKeywords: Record<Mood, string[]> = {
  轻松: ['开心', '愉快', '放松', '休闲', '有趣', '搞笑', '幽默', '轻松', '惬意', '自然'],
  激昂: ['激动', '兴奋', '热血', '挑战', '突破', '成功', '胜利', '奋斗', '励志', '激情'],
  悬疑: ['神秘', '奇怪', '秘密', '发现', '调查', '案件', '谜团', '真相', '离奇', '诡异'],
  忧郁: ['难过', '悲伤', '失落', '孤独', '遗憾', '回忆', '离别', '痛苦', '忧伤', '无奈'],
  温暖: ['感动', '幸福', '家人', '朋友', '爱情', '关爱', '治愈', '希望', '美好', '感恩'],
  科技: ['人工智能', '技术', '创新', '未来', '科学', '数据', '互联网', '智能', '数字化', '算法'],
};

function detectMood(text: string): Mood {
  const scores: Record<Mood, number> = {
    轻松: 0, 激昂: 0, 悬疑: 0, 忧郁: 0, 温暖: 0, 科技: 0,
  };
  for (const mood of moodList) {
    for (const kw of moodKeywords[mood]) {
      if (text.includes(kw)) scores[mood]++;
    }
  }
  let maxMood: Mood = '轻松';
  let maxScore = 0;
  for (const mood of moodList) {
    if (scores[mood] > maxScore) {
      maxScore = scores[mood];
      maxMood = mood;
    }
  }
  if (maxScore === 0) {
    return moodList[Math.floor(Math.random() * moodList.length)];
  }
  return maxMood;
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
}

function extractSentence(text: string): string {
  const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return text.slice(0, 100);
  return sentences[0].trim() + (text.includes('。') || text.includes('！') || text.includes('？') ? '。' : '');
}

function findTransitionSentence(paragraph: string): string | null {
  for (const word of transitionWords) {
    const idx = paragraph.indexOf(word);
    if (idx !== -1) {
      const before = paragraph.slice(Math.max(0, idx - 20), idx);
      const after = paragraph.slice(idx, idx + 80);
      const combined = (before + after).trim();
      const endMatch = combined.match(/[。！？.!?]/);
      return endMatch ? combined.slice(0, endMatch.index! + 1) : combined + '...';
    }
  }
  return null;
}

export function generateSummary(text: string): SummaryItem[] {
  const paragraphs = splitParagraphs(text);
  const results: SummaryItem[] = [];
  const usedTexts = new Set<string>();

  for (let i = 0; i < paragraphs.length && results.length < 5; i++) {
    const para = paragraphs[i];
    const firstSentence = extractSentence(para);
    if (!usedTexts.has(firstSentence) && firstSentence.length >= 8) {
      results.push({
        id: `s-${Date.now()}-${i}`,
        text: firstSentence,
        mood: detectMood(para),
      });
      usedTexts.add(firstSentence);
    }
    const transitionSent = findTransitionSentence(para);
    if (transitionSent && !usedTexts.has(transitionSent) && results.length < 5 && transitionSent.length >= 10) {
      results.push({
        id: `s-${Date.now()}-t${i}`,
        text: transitionSent,
        mood: detectMood(para),
      });
      usedTexts.add(transitionSent);
    }
  }

  if (results.length < 3) {
    const targetCount = 3 - results.length;
    for (let i = 0; i < targetCount; i++) {
      const idx = Math.min(i * 200, text.length - 1);
      const chunk = text.slice(idx, Math.min(idx + 120, text.length));
      const sentence = extractSentence(chunk);
      if (sentence && !usedTexts.has(sentence) && sentence.length >= 8) {
        results.push({
          id: `s-${Date.now()}-f${i}`,
          text: sentence,
          mood: detectMood(chunk),
        });
        usedTexts.add(sentence);
      }
    }
  }

  return results.slice(0, 5);
}

export function matchMusic(summaries: SummaryItem[]): Record<string, MusicTrack[]> {
  const result: Record<string, MusicTrack[]> = {};
  for (const summary of summaries) {
    const moodTracks = mockMusicLibrary.filter(t => t.mood === summary.mood);
    const shuffled = [...moodTracks].sort(() => Math.random() - 0.5);
    result[summary.id] = shuffled.slice(0, 3);
    if (result[summary.id].length < 3) {
      const remaining = mockMusicLibrary
        .filter(t => !result[summary.id].find(r => r.id === t.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3 - result[summary.id].length);
      result[summary.id].push(...remaining);
    }
  }
  return result;
}

export interface ExportPayload {
  summaries: { id: string; text: string; music: MusicTrack | null; order: number }[];
}

export function generateExportHtml(payload: ExportPayload): string {
  const sorted = [...payload.summaries].sort((a, b) => a.order - b.order);
  const itemsHtml = sorted.map(item => {
    const musicHtml = item.music
      ? `<div class="music-tag" style="display:inline-block;padding:4px 12px;border-radius:16px;background:linear-gradient(135deg, ${moodGradients[item.music.mood].from}, ${moodGradients[item.music.mood].to});color:#1a1a2e;font-size:12px;font-weight:600;margin-top:8px;">🎵 ${item.music.title} · ${item.music.mood} · ${item.music.duration}</div>`
      : '';
    return `<li class="summary-item" style="margin-bottom:24px;padding:16px;background:#2d2d44;border-radius:12px;border-left:4px solid #64c8ff;">
      <div style="font-size:16px;line-height:1.7;color:#e8e8f0;">${item.text}</div>
      ${musicHtml}
    </li>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>播客文稿摘要报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; background: #1a1a2e; color: #e8e8f0; padding: 40px 20px; min-height: 100vh; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; font-size: 28px; margin-bottom: 8px; background: linear-gradient(135deg, #84fab0, #8fd3f4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .subtitle { text-align: center; color: #8888a0; margin-bottom: 40px; font-size: 14px; }
    ol { list-style: none; counter-reset: summary-counter; }
    .summary-item { counter-increment: summary-counter; position: relative; }
    .summary-item::before { content: counter(summary-counter); position: absolute; left: -12px; top: 16px; width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
    footer { text-align: center; margin-top: 40px; color: #555; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎙️ 播客文稿摘要报告</h1>
    <p class="subtitle">生成于 ${new Date().toLocaleString('zh-CN')}</p>
    <ol>${itemsHtml}</ol>
    <footer>由 Podcast Summary & Music Matcher 生成</footer>
  </div>
</body>
</html>`;
}
