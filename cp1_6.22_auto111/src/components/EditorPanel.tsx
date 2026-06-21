import { useState, useEffect, useMemo } from 'react';
import { Chapter, Character } from '@/api';
import './EditorPanel.css';

interface EditorPanelProps {
  chapter: Partial<Chapter> | null;
  onSave: (chapter: Partial<Chapter>) => void;
  onNewChapter: () => void;
  characters: Character[];
}

const chapterTypes = [
  { value: 'plot', label: '剧情推动', color: '#3182ce' },
  { value: 'character', label: '角色发展', color: '#38a169' },
  { value: 'turning', label: '转折点', color: '#e53e3e' },
];

function EditorPanel({ chapter, onSave, onNewChapter, characters }: EditorPanelProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<Chapter['type']>('plot');
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [eventsInput, setEventsInput] = useState('');

  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title || '');
      setContent(chapter.content || '');
      setType((chapter.type as Chapter['type']) || 'plot');
      setSelectedCharacters(chapter.characters || []);
      setEventsInput((chapter.events || []).join(', '));
    } else {
      setTitle('');
      setContent('');
      setType('plot');
      setSelectedCharacters([]);
      setEventsInput('');
    }
  }, [chapter]);

  const wordCount = useMemo(() => {
    const text = content.replace(/[#*_`~\-\n\s]/g, '');
    return text.length;
  }, [content]);

  const handleSave = () => {
    const events = eventsInput
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    onSave({
      ...(chapter?.id ? { id: chapter.id } : {}),
      title: title || '未命名章节',
      content,
      type,
      characters: selectedCharacters,
      events,
      timestamp: chapter?.timestamp || Date.now(),
      order: chapter?.order || 0,
    });
  };

  const toggleCharacter = (charId: string) => {
    setSelectedCharacters((prev) =>
      prev.includes(charId)
        ? prev.filter((id) => id !== charId)
        : [...prev, charId]
    );
  };

  return (
    <div className="editor-panel">
      <div className="editor-header">
        <h2 className="editor-title">章节编辑</h2>
        <button className="new-chapter-btn" onClick={onNewChapter}>
          + 新建章节
        </button>
      </div>

      <div className="editor-body">
        <div className="form-group">
          <label className="form-label">章节标题</label>
          <input
            type="text"
            className="title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入章节标题..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">章节类型</label>
          <div className="type-selector">
            {chapterTypes.map((t) => (
              <button
                key={t.value}
                className={`type-btn ${type === t.value ? 'active' : ''}`}
                style={{
                  borderColor: type === t.value ? t.color : '#e2e8f0',
                  color: type === t.value ? t.color : '#718096',
                  backgroundColor: type === t.value ? `${t.color}10` : 'transparent',
                }}
                onClick={() => setType(t.value as Chapter['type'])}
              >
                <span
                  className="type-dot"
                  style={{ backgroundColor: t.color }}
                />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <label className="form-label">章节内容</label>
            <span className="word-count">字数: {wordCount}</span>
          </div>
          <textarea
            className="content-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="支持 Markdown 格式撰写...\n\n# 标题\n正文内容"
          />
        </div>

        <div className="form-group">
          <label className="form-label">涉及角色</label>
          <div className="character-picker">
            {characters.map((char) => (
              <button
                key={char.id}
                className={`char-chip ${selectedCharacters.includes(char.id) ? 'selected' : ''}`}
                style={{
                  borderColor: selectedCharacters.includes(char.id) ? char.color : '#e2e8f0',
                  color: selectedCharacters.includes(char.id) ? char.color : '#4a5568',
                }}
                onClick={() => toggleCharacter(char.id)}
              >
                <span
                  className="char-avatar-dot"
                  style={{ backgroundColor: char.color }}
                />
                {char.name}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">关键事件</label>
          <input
            type="text"
            className="events-input"
            value={eventsInput}
            onChange={(e) => setEventsInput(e.target.value)}
            placeholder="多个事件用逗号分隔，如：启程, 遇到神秘人"
          />
        </div>

        <button className="save-btn" onClick={handleSave}>
          {chapter?.id ? '更新章节' : '保存章节'}
        </button>
      </div>
    </div>
  );
}

export default EditorPanel;
