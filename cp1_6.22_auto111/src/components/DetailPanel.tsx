import { Chapter, Character } from '@/api';
import './DetailPanel.css';

interface DetailPanelProps {
  chapter: Chapter | null;
  characters: Character[];
  getCharacterById: (id: string) => Character | undefined;
  onClose?: () => void;
}

const typeColors: Record<string, string> = {
  plot: '#3182ce',
  character: '#38a169',
  turning: '#e53e3e',
};

const typeLabels: Record<string, string> = {
  plot: '剧情推动',
  character: '角色发展',
  turning: '转折点',
};

function DetailPanel({ chapter, characters, getCharacterById, onClose }: DetailPanelProps) {
  if (!chapter) {
    return (
      <div className="detail-panel empty">
        <div className="empty-detail">
          <div className="empty-icon">📖</div>
          <h3>选择一个章节</h3>
          <p>点击章节卡片查看详细内容</p>
        </div>
      </div>
    );
  }

  const chapterCharacters = chapter.characters
    .map((id) => getCharacterById(id))
    .filter(Boolean) as Character[];

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getWordCount = (content: string) => {
    return content.replace(/[#*_`~\-\n\s]/g, '').length;
  };

  const renderMarkdownSimple = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="md-h1">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="md-h2">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="md-h3">{line.slice(4)}</h3>;
      }
      if (line.startsWith('> ')) {
        return <blockquote key={index} className="md-quote">{line.slice(2)}</blockquote>;
      }
      if (line.trim() === '') {
        return <br key={index} />;
      }
      return <p key={index} className="md-p">{line}</p>;
    });
  };

  return (
    <div className="detail-panel">
      {onClose && (
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      )}

      <div className="detail-header">
        <div className="detail-type-badge" style={{ backgroundColor: typeColors[chapter.type] }}>
          {typeLabels[chapter.type]}
        </div>
        <h2 className="detail-title">{chapter.title}</h2>
        <div className="detail-meta">
          <span className="meta-item">📅 {formatDate(chapter.timestamp)}</span>
          <span className="meta-item">✏️ {getWordCount(chapter.content)} 字</span>
        </div>
      </div>

      <div className="detail-content">
        <div className="content-section">
          <h4 className="section-title">章节内容</h4>
          <div className="content-body">{renderMarkdownSimple(chapter.content)}</div>
        </div>

        <div className="content-section">
          <h4 className="section-title">涉及角色</h4>
          {chapterCharacters.length === 0 ? (
            <p className="empty-text">暂无角色</p>
          ) : (
            <div className="character-list">
              {chapterCharacters.map((char) => (
                <div key={char.id} className="character-item">
                  <div
                    className="character-avatar"
                    style={{ backgroundColor: char.color }}
                  >
                    {char.name.charAt(0)}
                  </div>
                  <div className="character-info">
                    <span className="character-name">{char.name}</span>
                    <span className="character-desc">{char.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="content-section">
          <h4 className="section-title">关键事件</h4>
          {chapter.events.length === 0 ? (
            <p className="empty-text">暂无事件标签</p>
          ) : (
            <div className="event-tags">
              {chapter.events.map((event, index) => (
                <span key={index} className="event-tag">
                  <span className="tag-dot" />
                  {event}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailPanel;
