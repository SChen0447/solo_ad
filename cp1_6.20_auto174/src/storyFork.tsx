import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface Chapter {
  index: number;
  title: string;
  description: string;
  completed: boolean;
  author: string | null;
  content: string | null;
  created_at: string | null;
}

interface WorldData {
  id: number;
  name: string;
  description: string;
  characters: any[];
}

function StoryFork() {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const [world, setWorld] = useState<WorldData | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('匿名作者');
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('storyForkNickname');
    if (saved) {
      setNickname(saved);
    }
  }, []);

  useEffect(() => {
    if (worldId) {
      loadChapters();
    }
  }, [worldId]);

  const loadChapters = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/worlds/${worldId}/chapters`);
      setWorld(res.data.world);
      setChapters(res.data.chapters);
    } catch (e) {
      console.error('加载章节失败', e);
    }
    setLoading(false);
  };

  const wordCount = content.replace(/<[^>]*>/g, '').length;
  const wordValid = wordCount >= 100 && wordCount <= 2000;

  const handleStartFork = (index: number) => {
    const chapter = chapters[index];
    if (chapter.completed) return;
    setActiveChapter(index);
    setContent('');
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  const handleCloseEditor = () => {
    setActiveChapter(null);
    setContent('');
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateContent();
  };

  const insertDivider = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const hr = document.createElement('hr');
      hr.textContent = '---';
      range.insertNode(hr);
      range.setStartAfter(hr);
      range.setEndAfter(hr);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleSubmit = async () => {
    if (!wordValid || activeChapter === null) return;

    try {
      await axios.post(`/api/worlds/${worldId}/chapters/${activeChapter}/fork`, {
        author: nickname,
        content: content.replace(/<[^>]*>/g, '')
      });
      setActiveChapter(null);
      setContent('');
      loadChapters();
    } catch (e: any) {
      alert(e.response?.data?.error || '提交失败');
    }
  };

  const handleNicknameBlur = () => {
    if (nicknameInput.trim()) {
      setNickname(nicknameInput.trim());
      localStorage.setItem('storyForkNickname', nicknameInput.trim());
    }
    setEditingNickname(false);
  };

  const handleNicknameEdit = () => {
    setNicknameInput(nickname);
    setEditingNickname(true);
  };

  const truncateContent = (text: string, maxLen: number = 100) => {
    if (!text) return '';
    const plain = text.replace(/<[^>]*>/g, '');
    if (plain.length <= maxLen) return plain;
    return plain.slice(0, maxLen) + '...';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="story-fork-page"
    >
      <div className="story-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/')}>← 返回</button>
          {world && <h2 className="story-title">{world.name}</h2>}
        </div>

        <div className="user-card">
          {editingNickname ? (
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onBlur={handleNicknameBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleNicknameBlur()}
              className="nickname-input"
              autoFocus
            />
          ) : (
            <span className="nickname-display" onClick={handleNicknameEdit}>
              👤 {nickname}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="chapters-container">
          {chapters.map((chapter, index) => (
            <motion.div
              key={chapter.index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
              className={`chapter-card ${chapter.completed ? 'completed' : 'pending'}`}
              onClick={() => !chapter.completed && handleStartFork(index)}
            >
              <div className="chapter-card-header">
                <span className="chapter-index">第 {chapter.index + 1} 章</span>
                <span className={`chapter-status ${chapter.completed ? 'done' : 'waiting'}`}>
                  {chapter.completed ? '已完成' : '待续写'}
                </span>
              </div>
              <h3 className="chapter-card-title">{chapter.title}</h3>
              <p className="chapter-card-desc">{chapter.description}</p>

              {chapter.completed && chapter.author && (
                <div className="chapter-meta">
                  <span className="chapter-author">
                    由 <strong style={{ color: '#6366F1' }}>{chapter.author}</strong> 续写
                  </span>
                  <span className="chapter-time">{chapter.created_at}</span>
                </div>
              )}

              {chapter.completed && chapter.content && (
                <p className="chapter-summary">{truncateContent(chapter.content)}</p>
              )}

              {!chapter.completed && (
                <button className="fork-btn disabled-btn" disabled>
                  等待续写
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {activeChapter !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="editor-modal-overlay"
            onClick={(e) => e.target === e.currentTarget && handleCloseEditor()}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="editor-modal"
            >
              <div className="editor-header">
                <h3>续写 · 第 {activeChapter + 1} 章</h3>
                <button className="close-btn" onClick={handleCloseEditor}>×</button>
              </div>

              <div className="editor-toolbar">
                <button className="toolbar-btn" onClick={() => execCommand('bold')} title="加粗">
                  <b>B</b>
                </button>
                <button className="toolbar-btn" onClick={() => execCommand('italic')} title="斜体">
                  <i>I</i>
                </button>
                <button className="toolbar-btn" onClick={() => execCommand('formatBlock', '<h1>')} title="标题1">
                  H1
                </button>
                <button className="toolbar-btn" onClick={() => execCommand('formatBlock', '<h2>')} title="标题2">
                  H2
                </button>
                <button className="toolbar-btn" onClick={() => execCommand('formatBlock', '<h3>')} title="标题3">
                  H3
                </button>
                <button className="toolbar-btn" onClick={insertDivider} title="插入分隔线">
                  —
                </button>
              </div>

              <div
                ref={editorRef}
                className="rich-editor"
                contentEditable
                onInput={updateContent}
                data-placeholder="开始你的续写..."
              />

              <div className="editor-footer">
                <span className={`word-count ${!wordValid && content ? 'error' : ''}`}>
                  {wordCount} / 100-2000 字
                </span>
                {!wordValid && content && (
                  <span className="word-error">字数需在100-2000之间</span>
                )}
                <button
                  className={`submit-btn ${!wordValid ? 'disabled' : ''}`}
                  onClick={handleSubmit}
                  disabled={!wordValid}
                >
                  提交续写
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default StoryFork;
