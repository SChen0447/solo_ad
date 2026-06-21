import React, { useState, useRef, useEffect, useCallback } from 'react';
import VideoPlayer from './components/VideoPlayer';
import MarkdownTimeline from './components/MarkdownTimeline';
import { getMarkdowns, addMarkdown, updateMarkdown, deleteMarkdown } from './api/markdownApi';
import type { Markdown } from '../types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [markdowns, setMarkdowns] = useState<Markdown[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quizModal, setQuizModal] = useState<Markdown | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMarkdowns();
  }, []);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const loadMarkdowns = async () => {
    try {
      const data = await getMarkdowns();
      setMarkdowns(data);
    } catch (err) {
      console.error('加载标记失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('video/mp4')) {
      alert('请选择 MP4 格式的视频文件');
      return;
    }

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoName(file.name);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleLoadVideoClick = () => {
    fileInputRef.current?.click();
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleDurationChange = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleShowQuiz = useCallback((md: Markdown) => {
    setQuizModal(md);
  }, []);

  const handleAddMarkdown = async (data: Omit<Markdown, 'id' | 'createdAt'>) => {
    setSaving(true);
    try {
      const newMd = await addMarkdown(data);
      setMarkdowns((prev) => [...prev, newMd].sort((a, b) => a.timestamp - b.timestamp));
    } catch (err) {
      console.error('添加标记失败:', err);
      alert('添加标记失败');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMarkdown = async (id: string, data: Partial<Omit<Markdown, 'id' | 'createdAt'>>) => {
    setSaving(true);
    try {
      const updated = await updateMarkdown(id, data);
      setMarkdowns((prev) =>
        prev.map((m) => (m.id === id ? updated : m)).sort((a, b) => a.timestamp - b.timestamp)
      );
    } catch (err) {
      console.error('更新标记失败:', err);
      alert('更新标记失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMarkdown = async (id: string) => {
    setSaving(true);
    try {
      await deleteMarkdown(id);
      setMarkdowns((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('删除标记失败:', err);
      alert('删除标记失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDragMarkdown = useCallback((id: string, newTimestamp: number) => {
    handleUpdateMarkdown(id, { timestamp: newTimestamp });
  }, []);

  const handleQuizAnswer = (optionText: string) => {
    console.log('用户选择答案:', optionText);
    setQuizModal(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🎬 交互式视频时间轴标记编辑器</h1>
        <div className="header-actions">
          <button className="load-video-btn" onClick={handleLoadVideoClick}>
            📁 加载视频
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {videoName && (
            <span className="video-name" title={videoName}>
              🎥 {videoName}
            </span>
          )}
          {saving && <span className="saving-indicator">保存中...</span>}
        </div>
      </header>

      <main className="app-main">
        <section className="player-section">
          {!videoUrl ? (
            <div className="no-video-placeholder">
              <div className="placeholder-icon">🎞️</div>
              <h2>请加载一个 MP4 视频开始编辑</h2>
              <p>点击上方"加载视频"按钮选择本地视频文件</p>
              <button className="load-video-btn large" onClick={handleLoadVideoClick}>
                📁 选择视频文件
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <VideoPlayer
              markdowns={markdowns}
              videoRef={videoRef}
              currentTime={currentTime}
              duration={duration}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              onSeek={handleSeek}
              onShowQuiz={handleShowQuiz}
              onDragMarkdown={handleDragMarkdown}
            />
          )}
        </section>

        <section className="sidebar-section">
          {loading ? (
            <div className="loading">加载标记数据中...</div>
          ) : (
            <MarkdownTimeline
              markdowns={markdowns}
              onAdd={handleAddMarkdown}
              onUpdate={handleUpdateMarkdown}
              onDelete={handleDeleteMarkdown}
              onSeek={handleSeek}
              currentTime={currentTime}
              isVideoLoaded={!!videoUrl}
            />
          )}
        </section>
      </main>

      {quizModal && (
        <div className="modal-overlay quiz-overlay" onClick={() => setQuizModal(null)}>
          <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quiz-header">
              <span className="quiz-badge">📝 弹题预览</span>
              <button className="quiz-close" onClick={() => setQuizModal(null)}>
                ✕
              </button>
            </div>
            <h3 className="quiz-title">{quizModal.title}</h3>
            <p className="quiz-question">{quizModal.question}</p>
            <div className="quiz-options">
              {quizModal.options?.map((opt, i) => (
                <button
                  key={opt.id}
                  className="quiz-option-btn"
                  onClick={() => handleQuizAnswer(opt.text)}
                >
                  <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="option-text">{opt.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
