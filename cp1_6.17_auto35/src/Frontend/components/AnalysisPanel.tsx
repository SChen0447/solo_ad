import React, { useEffect, useRef, useMemo } from 'react';
import { IdeaCard, GroupData } from '../types';

interface AnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cards: IdeaCard[];
  groups: GroupData[];
}

interface WordFreq {
  word: string;
  count: number;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and',
  'but', 'if', 'or', 'because', 'as', 'until', 'while', 'this', 'that',
  'these', 'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
  '的', '了', '和', '是', '就', '都', '而', '及', '与', '在', '有',
  '个', '上', '也', '很', '到', '说', '要', '去', '你', '我', '他',
  '她', '它', '这', '那', '会', '着', '没有', '看', '好', '自己',
  '什么', '怎么', '为', '以', '等', '把', '被', '让',
  '给', '向', '从', '对', '得', '着', '过', '来', '请', '所',
  '可以', '可能', '应该', '需要', '如何', '哪些', '哪个', '能够',
  '我们', '你们', '他们', '它们', '一个', '一些', '一样', '一种',
  '这个', '那个', '这些', '那些', '不是', '但是', '还是', '或者',
  '如果', '因为', '所以', '虽然', '然后', '就是', '还是', '还有'
]);

const extractKeywords = (texts: string[], topK: number = 20): WordFreq[] => {
  const wordCount: Record<string, number> = {};

  texts.forEach(text => {
    const tokens = text.toLowerCase().match(/[\w\u4e00-\u9fff]+/g) || [];
    tokens.forEach(token => {
      if (!STOP_WORDS.has(token) && token.length > 1) {
        wordCount[token] = (wordCount[token] || 0) + 1;
      }
    });
  });

  return Object.entries(wordCount)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topK);
};

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  isOpen,
  onClose,
  cards,
  groups
}) => {
  const donutCanvasRef = useRef<HTMLCanvasElement>(null);
  const wordCloudCanvasRef = useRef<HTMLCanvasElement>(null);

  const keywords = useMemo(() => {
    const texts = cards.map(c => c.text);
    return extractKeywords(texts, 20);
  }, [cards]);

  useEffect(() => {
    if (!isOpen) return;

    const drawDonut = () => {
      const canvas = donutCanvasRef.current;
      if (!canvas || groups.length === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const size = 250;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const outerRadius = 100;
      const innerRadius = 60;

      const total = groups.reduce((sum, g) => sum + g.size, 0);
      let startAngle = -Math.PI / 2;

      groups.forEach(group => {
        const sliceAngle = (group.size / total) * Math.PI * 2;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        ctx.closePath();

        ctx.fillStyle = group.color;
        ctx.fill();

        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2;
        ctx.stroke();

        const midAngle = startAngle + sliceAngle / 2;
        const labelRadius = (outerRadius + innerRadius) / 2;
        const labelX = centerX + Math.cos(midAngle) * labelRadius;
        const labelY = centerY + Math.sin(midAngle) * labelRadius;

        const percentage = ((group.size / total) * 100).toFixed(1);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${percentage}%`, labelX, labelY);

        startAngle = endAngle;
      });

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${cards.length}`, centerX, centerY - 10);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText('总想法数', centerX, centerY + 10);
    };

    const drawWordCloud = () => {
      const canvas = wordCloudCanvasRef.current;
      if (!canvas || keywords.length === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = 300;
      const height = 300;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);

      const maxCount = Math.max(...keywords.map(k => k.count));
      const minCount = Math.min(...keywords.map(k => k.count));

      const placedRects: { x: number; y: number; w: number; h: number }[] = [];

      const sortedKeywords = [...keywords].sort((a, b) => b.count - a.count);

      sortedKeywords.forEach((keyword, index) => {
        const normalizedCount = maxCount === minCount
          ? 1
          : (keyword.count - minCount) / (maxCount - minCount);

        const fontSize = 12 + normalizedCount * 24;
        ctx.font = `bold ${fontSize}px sans-serif`;

        const textMetrics = ctx.measureText(keyword.word);
        const textWidth = textMetrics.width + 10;
        const textHeight = fontSize + 6;

        const centerX = width / 2;
        const centerY = height / 2;

        let placed = false;
        let attempts = 0;
        const maxAttempts = 100;

        while (!placed && attempts < maxAttempts) {
          const angle = attempts * 0.5 + index * 0.1;
          const radius = 10 + attempts * 2;
          const x = centerX + Math.cos(angle) * radius - textWidth / 2;
          const y = centerY + Math.sin(angle) * radius - textHeight / 2;

          if (x < 5 || x + textWidth > width - 5 || y < 5 || y + textHeight > height - 5) {
            attempts++;
            continue;
          }

          const newRect = { x, y, w: textWidth, h: textHeight };
          const overlaps = placedRects.some(rect =>
            rect.x < newRect.x + newRect.w &&
            rect.x + rect.w > newRect.x &&
            rect.y < newRect.y + newRect.h &&
            rect.y + rect.h > newRect.y
          );

          if (!overlaps) {
            const hue = (index * 30) % 360;
            ctx.fillStyle = `hsl(${hue}, 70%, 65%)`;
            ctx.shadowColor = `hsl(${hue}, 70%, 50%)`;
            ctx.shadowBlur = 4;
            ctx.fillText(keyword.word, x + 5, y + textHeight - 8);
            ctx.shadowBlur = 0;

            placedRects.push(newRect);
            placed = true;
          }
          attempts++;
        }

        if (!placed) {
          const x = 10 + (index % 5) * 55;
          const y = 10 + Math.floor(index / 5) * 25;
          const smallFontSize = 10;
          ctx.font = `${smallFontSize}px sans-serif`;
          ctx.fillStyle = `hsl(${(index * 30) % 360}, 60%, 60%)`;
          ctx.fillText(keyword.word, x, y + smallFontSize);
        }
      });
    };

    const timeout = setTimeout(() => {
      drawDonut();
      drawWordCloud();
    }, 100);

    return () => clearTimeout(timeout);
  }, [isOpen, groups, cards, keywords]);

  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalIdeas: cards.length,
      groups: groups.map(g => ({
        groupId: g.groupId,
        groupName: g.groupName,
        size: g.size,
        color: g.color
      })),
      ideas: cards.map(card => ({
        id: card.id,
        text: card.text,
        color: card.color,
        starred: card.starred,
        groupId: card.groupId,
        groupName: card.groupId !== undefined
          ? groups.find(g => g.groupId === card.groupId)?.groupName
          : undefined,
        createdAt: new Date(card.createdAt).toISOString()
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ideas_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div
        className={`analysis-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
      <div className={`analysis-panel ${isOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h2>数据分析</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="panel-content">
          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-value">{cards.length}</div>
              <div className="stat-label">总想法数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{groups.length}</div>
              <div className="stat-label">群组数</div>
            </div>
          </div>

          {groups.length > 0 && (
            <div className="chart-section">
              <h3>群组分布</h3>
              <div className="chart-container">
                <canvas ref={donutCanvasRef} />
              </div>
              <div className="legend-container">
                {groups.map(group => (
                  <div key={group.groupId} className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="legend-text">
                      {group.groupName} ({group.size})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {keywords.length > 0 && (
            <div className="chart-section">
              <h3>高频词汇</h3>
              <div className="chart-container">
                <canvas ref={wordCloudCanvasRef} />
              </div>
            </div>
          )}

          {cards.length === 0 && (
            <div className="empty-panel">
              <p>暂无数据</p>
              <p className="hint">添加一些想法后再来查看分析结果</p>
            </div>
          )}
        </div>

        <div className="panel-footer">
          <button
            className="export-btn"
            onClick={handleExport}
            disabled={cards.length === 0}
          >
            导出 JSON
          </button>
        </div>
      </div>
    </>
  );
};
