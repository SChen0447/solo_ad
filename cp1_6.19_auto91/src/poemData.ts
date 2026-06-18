export interface PoemData {
  id: string;
  title: string;
  author: string;
  content: string;
  particlePositions: Array<{ x: number; y: number }>;
  particleCount: number;
  primaryColor: string;
}

const WARM_COLORS = ['#ff6b6b', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];

const POEMS_RAW = [
  {
    title: '静夜思',
    author: '李白',
    content: '床前明月光，疑是地上霜。举头望明月，低头思故乡。'
  },
  {
    title: '登鹳雀楼',
    author: '王之涣',
    content: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。'
  },
  {
    title: '春晓',
    author: '孟浩然',
    content: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。'
  },
  {
    title: '江雪',
    author: '柳宗元',
    content: '千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。'
  },
  {
    title: '枫桥夜泊',
    author: '张继',
    content: '月落乌啼霜满天，江枫渔火对愁眠。姑苏城外寒山寺，夜半钟声到客船。'
  }
];

function generateParticlePositions(
  text: string,
  targetCount: number
): Array<{ x: number; y: number }> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const fontSize = 48;
  const lineHeight = fontSize * 1.2;
  const charsPerLine = 6;
  const lines = Math.ceil(text.length / charsPerLine);
  
  canvas.width = fontSize * charsPerLine * 1.2;
  canvas.height = lineHeight * lines * 1.2;
  
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", "SimHei", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  
  for (let i = 0; i < lines; i++) {
    const lineText = text.slice(i * charsPerLine, (i + 1) * charsPerLine);
    const x = (canvas.width - lineText.length * fontSize) / 2;
    const y = i * lineHeight + (canvas.height - lines * lineHeight) / 2;
    ctx.fillText(lineText, x, y);
  }
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  const allPoints: Array<{ x: number; y: number }> = [];
  
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      const idx = (y * canvas.width + x) * 4;
      const brightness = data[idx] + data[idx + 1] + data[idx + 2];
      if (brightness > 300) {
        const nx = (x / canvas.width - 0.5) * 2;
        const ny = -(y / canvas.height - 0.5) * 2;
        allPoints.push({ x: nx, y: ny });
      }
    }
  }
  
  if (allPoints.length <= targetCount) {
    return allPoints;
  }
  
  const step = Math.floor(allPoints.length / targetCount);
  const result: Array<{ x: number; y: number }> = [];
  
  for (let i = 0; i < targetCount; i++) {
    const idx = Math.min(i * step + Math.floor(Math.random() * step), allPoints.length - 1);
    result.push(allPoints[idx]);
  }
  
  return result;
}

export const POEMS: PoemData[] = POEMS_RAW.map((poem, index) => {
  const particleCount = 40 + Math.floor(Math.random() * 21);
  return {
    id: `poem-${index + 1}`,
    title: poem.title,
    author: poem.author,
    content: poem.content,
    particlePositions: generateParticlePositions(poem.content, particleCount),
    particleCount,
    primaryColor: WARM_COLORS[index % WARM_COLORS.length]
  };
});

export function getRandomPoem(): PoemData {
  const randomPoem = POEMS[Math.floor(Math.random() * POEMS.length)];
  const particleCount = 40 + Math.floor(Math.random() * 21);
  return {
    ...randomPoem,
    id: `poem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    particlePositions: generateParticlePositions(randomPoem.content, particleCount),
    particleCount
  };
}
