import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface Character {
  name: string;
  personality: string;
  catchphrase: string;
}

interface Chapter {
  title: string;
  description: string;
}

interface WorldBuilderProps {
  onWorldCreated?: () => void;
}

const AVATAR_COLORS = ['#6366F1', '#A78BFA', '#F472B6', '#34D399', '#FBBF24', '#F87171', '#60A5FA', '#A3E635'];

function WorldBuilder({ onWorldCreated }: WorldBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [characters, setCharacters] = useState<Character[]>([
    { name: '', personality: '', catchphrase: '' },
    { name: '', personality: '', catchphrase: '' }
  ]);
  const [chapters, setChapters] = useState<Chapter[]>([
    { title: '', description: '' },
    { title: '', description: '' },
    { title: '', description: '' }
  ]);
  const [savedWorld, setSavedWorld] = useState<any>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; show: boolean } | null>(null);
  const [error, setError] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);

  const nameValid = name.length >= 2 && name.length <= 20;
  const descValid = description.length >= 50;
  const charsValid = characters.filter(c => c.name.trim()).length >= 2;
  const chaptersValid = chapters.filter(c => c.title.trim()).length >= 3;
  const allValid = nameValid && descValid && charsValid && chaptersValid;

  const addCharacter = () => {
    setCharacters([...characters, { name: '', personality: '', catchphrase: '' }]);
  };

  const removeCharacter = (index: number) => {
    if (characters.length > 2) {
      setCharacters(characters.filter((_, i) => i !== index));
    }
  };

  const updateCharacter = (index: number, field: keyof Character, value: string) => {
    const newChars = [...characters];
    newChars[index][field] = value;
    setCharacters(newChars);
  };

  const addChapter = () => {
    setChapters([...chapters, { title: '', description: '' }]);
  };

  const removeChapter = (index: number) => {
    if (chapters.length > 3) {
      setChapters(chapters.filter((_, i) => i !== index));
    }
  };

  const updateChapter = (index: number, field: keyof Chapter, value: string) => {
    const newChapters = [...chapters];
    newChapters[index][field] = value;
    setChapters(newChapters);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newChapters = [...chapters];
    const dragged = newChapters[dragIndex];
    newChapters.splice(dragIndex, 1);
    newChapters.splice(index, 0, dragged);
    setChapters(newChapters);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setError('');
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        show: true
      });
      setTimeout(() => setRipple(null), 150);
    }

    if (!allValid) {
      setError('请填写完整信息');
      return;
    }

    try {
      const validChars = characters.filter(c => c.name.trim());
      const validChapters = chapters.filter(c => c.title.trim());
      const res = await axios.post('/api/worlds', {
        name,
        description,
        characters: validChars,
        chapters: validChapters
      });

      const worldData = {
        id: res.data.id,
        name,
        description,
        characters: validChars,
        chapters: validChapters
      };
      setSavedWorld(worldData);
      if (onWorldCreated) {
        onWorldCreated();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
    }
  };

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="world-builder-page"
    >
      <h2 className="page-title">世界观模板编辑器</h2>

      <div className="world-builder-container">
        <div className="builder-form">
          <div className="form-group">
            <label>世界观名称 <span className="required">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="2-20字符"
              className={`form-input ${!nameValid && name ? 'error' : ''}`}
            />
            <p className={`hint ${nameValid ? 'valid' : ''}`}>
              {name.length}/20 字符
            </p>
          </div>

          <div className="form-group">
            <label>背景描述 <span className="required">*</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="不低于50字符"
              rows={5}
              className={`form-textarea ${!descValid && description ? 'error' : ''}`}
            />
            <p className={`hint ${descValid ? 'valid' : ''}`}>
              {description.length}/50 字符（最少）
            </p>
          </div>

          <div className="form-group">
            <label>角色列表 <span className="required">*</span>（至少2人）</label>
            {characters.map((char, index) => (
              <div key={index} className="character-item">
                <div className="char-header">
                  <span className="char-index">角色 {index + 1}</span>
                  {characters.length > 2 && (
                    <button className="remove-btn" onClick={() => removeCharacter(index)}>×</button>
                  )}
                </div>
                <input
                  type="text"
                  value={char.name}
                  onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                  placeholder="姓名"
                  className="form-input char-input"
                />
                <input
                  type="text"
                  value={char.personality}
                  onChange={(e) => updateCharacter(index, 'personality', e.target.value)}
                  placeholder="性格标签"
                  className="form-input char-input"
                />
                <input
                  type="text"
                  value={char.catchphrase}
                  onChange={(e) => updateCharacter(index, 'catchphrase', e.target.value)}
                  placeholder="口头禅"
                  className="form-input char-input"
                />
              </div>
            ))}
            <button className="add-btn" onClick={addCharacter}>+ 添加角色</button>
          </div>

          <div className="form-group">
            <label>章节目录 <span className="required">*</span>（至少3章，拖拽排序）</label>
            {chapters.map((chapter, index) => (
              <div
                key={index}
                className={`chapter-item ${dragIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="chapter-drag-handle">⋮⋮</div>
                <div className="chapter-content">
                  <div className="chapter-header">
                    <span className="chapter-number">第 {index + 1} 章</span>
                    {chapters.length > 3 && (
                      <button className="remove-btn" onClick={() => removeChapter(index)}>×</button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={chapter.title}
                    onChange={(e) => updateChapter(index, 'title', e.target.value)}
                    placeholder="章节标题"
                    className="form-input chapter-input"
                  />
                  <textarea
                    value={chapter.description}
                    onChange={(e) => updateChapter(index, 'description', e.target.value)}
                    placeholder="章节描述"
                    rows={2}
                    className="form-textarea chapter-desc"
                  />
                </div>
              </div>
            ))}
            <button className="add-btn" onClick={addChapter}>+ 添加章节</button>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button
            ref={btnRef}
            className={`save-btn ${!allValid ? 'disabled' : ''}`}
            onClick={handleSave}
            disabled={!allValid}
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            保存世界观
            {ripple && ripple.show && (
              <motion.span
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="ripple"
                style={{
                  left: ripple.x,
                  top: ripple.y
                }}
              />
            )}
          </button>
        </div>

        <div className="builder-preview">
          <div className="preview-card">
            <h3 className="preview-title">预览</h3>

            {(savedWorld || (name && description)) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h4 className="preview-world-name">{savedWorld?.name || name}</h4>
                <p className="preview-desc">{savedWorld?.description || description}</p>

                <div className="preview-section">
                  <h5>角色</h5>
                  <div className="avatar-list">
                    {(savedWorld?.characters || characters.filter(c => c.name)).map((char: any, i: number) => (
                      <div key={i} className="avatar-item">
                        <div
                          className="avatar-circle"
                          style={{ backgroundColor: getAvatarColor(char.name) }}
                        >
                          {char.name.charAt(0)}
                        </div>
                        <span className="avatar-name">{char.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="preview-section">
                  <h5>章节</h5>
                  <div className="chapter-list">
                    {(savedWorld?.chapters || chapters.filter(c => c.title)).map((ch: any, i: number) => (
                      <div key={i} className="chapter-preview-card">
                        <span className="chapter-preview-num">第{i + 1}章</span>
                        <span className="chapter-preview-title">{ch.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {!name && !description && !savedWorld && (
              <p className="preview-empty">填写表单后此处显示预览</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default WorldBuilder;
