import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResumeStore } from '../store/resumeStore';
import { BlockRenderer, getBlockIcon } from '../components/BlockRenderer';
import { THEMES, Resume } from '../types';

export const PreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getResumeById, setTheme } = useResumeStore();
  const [resume, setResumeState] = useState<Resume | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }
    const found = getResumeById(id);
    if (found) {
      setResumeState(found);
      const theme = THEMES.find((t) => t.id === found.themeId) || THEMES[0];
      setTheme(theme.id);
    } else {
      setNotFound(true);
    }
  }, [id, getResumeById, setTheme]);

  useEffect(() => {
    if (resume) {
      document.title = `${resume.title} - 简历预览`;
    }
  }, [resume]);

  const goBack = () => {
    navigate('/');
  };

  const handlePrint = () => {
    window.print();
  };

  if (notFound) {
    return (
      <div
        className="app-container"
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '60px 40px',
            background: 'var(--card-bg)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px var(--shadow-card)',
            animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>🔍</div>
          <h2
            style={{
              fontSize: '24px',
              marginBottom: '12px',
              color: 'var(--text-primary)',
            }}
          >
            简历未找到
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            该简历不存在或已被删除
          </p>
          <button
            className="btn btn-primary"
            onClick={goBack}
            style={{ margin: '0 auto' }}
          >
            <span>←</span> 返回编辑器
          </button>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div
        className="app-container"
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="top-bar">
        <div className="top-bar-left">
          <button
            className="btn btn-secondary"
            onClick={goBack}
            title="返回编辑"
          >
            <span>←</span> 返回编辑
          </button>
        </div>
        <div className="export-actions">
          <button className="btn btn-secondary" onClick={handlePrint} title="打印">
            <span>🖨️</span> 打印
          </button>
        </div>
      </header>
      <main className="canvas-wrapper dot-pattern">
        <div className="canvas-area">
          {resume.blocks.length === 0 ? (
            <div className="canvas-empty">
              <div className="canvas-empty-icon">📄</div>
              <div className="canvas-empty-text">简历内容为空</div>
              <div className="canvas-empty-hint">请返回编辑器添加内容</div>
            </div>
          ) : (
            <div className="blocks-container">
              {resume.blocks.map((block) => (
                <div key={block.id} className="block-card">
                  <div className="block-header">
                    <h3 className="block-title">
                      <span className="block-title-icon">
                        {getBlockIcon(block.type)}
                      </span>
                      {block.title}
                    </h3>
                  </div>
                  <BlockRenderer block={block} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
