import React, { useState } from 'react';
import type { PoemInfo } from '../utils/api';

interface PoetryCardProps {
  line: string;
  poem?: PoemInfo | null;
  variant?: 'player' | 'ai' | 'neutral';
  isSuccess?: boolean;
  showExpandButton?: boolean;
}

const toneThemes: Record<string, { bg: string; border: string; accent: string }> = {
  joyful: { bg: '#fff8e7', border: '#e6c87a', accent: '#c23b22' },
  sad: { bg: '#eef2f7', border: '#8da3b9', accent: '#5a7a9a' },
  peaceful: { bg: '#f0f7ed', border: '#a8c9a0', accent: '#4a7c4a' },
  heroic: { bg: '#fbecec', border: '#d89b9b', accent: '#c23b22' },
  neutral: { bg: '#faf3e0', border: '#d4c4a0', accent: '#8b4513' },
};

const PoetryCard: React.FC<PoetryCardProps> = ({
  line,
  poem,
  variant = 'neutral',
  isSuccess = true,
  showExpandButton = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const getTheme = () => {
    if (!isSuccess) return { bg: '#f5e6e6', border: '#d4a0a0', accent: '#c23b22' };
    if (variant === 'player') return toneThemes.peaceful;
    if (variant === 'ai') return toneThemes.heroic;
    return toneThemes.neutral;
  };

  const theme = getTheme();

  const handleToggle = () => {
    if (!poem) return;
    setIsAnimating(true);
    setIsExpanded(!isExpanded);
    setTimeout(() => setIsAnimating(false), 400);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '420px',
        margin: '0 auto',
      }}
    >
      <div
        onClick={handleToggle}
        style={{
          position: 'relative',
          padding: '28px 24px',
          backgroundColor: theme.bg,
          border: `2px solid ${theme.border}`,
          borderRadius: '8px',
          boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.06)',
          cursor: poem && showExpandButton ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(139, 69, 19, 0.02) 10px,
              rgba(139, 69, 19, 0.02) 20px
            )
          `,
        }}
        onMouseEnter={(e) => {
          if (poem && showExpandButton) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '4px 4px 12px rgba(0, 0, 0, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (poem && showExpandButton) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '2px 2px 8px rgba(0, 0, 0, 0.06)';
          }
        }}
      >
        <div style={{ position: 'relative' }}>
          <p
            style={{
              fontFamily: "'Ma Shan Zheng', cursive",
              fontSize: variant === 'ai' ? '30px' : '26px',
              color: '#2c2c2c',
              textAlign: 'center',
              margin: 0,
              lineHeight: 1.6,
              letterSpacing: '2px',
              wordBreak: 'break-all',
            }}
          >
            {line}
          </p>

          {poem && showExpandButton && (
            <div
              style={{
                marginTop: '16px',
                textAlign: 'center',
                fontSize: '13px',
                color: theme.accent,
                opacity: 0.8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <span>{isExpanded ? '收起解析' : '查看解析'}</span>
              <span
                style={{
                  display: 'inline-block',
                  transition: 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ▼
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          overflow: 'hidden',
          maxHeight: isExpanded ? '500px' : '0px',
          transition: 'max-height 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        }}
      >
        {poem && (
          <div
            style={{
              padding: '20px',
              marginTop: '8px',
              backgroundColor: '#e8dcc8',
              borderRadius: '8px',
              boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div
              style={{
                marginBottom: '12px',
                paddingBottom: '10px',
                borderBottom: '1px solid rgba(139, 69, 19, 0.2)',
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: '18px',
                  color: '#8b4513',
                  fontFamily: "'Ma Shan Zheng', cursive",
                  letterSpacing: '1px',
                }}
              >
                {poem.title}
              </h4>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '14px',
                  color: '#8b4513',
                }}
              >
                <span style={{ fontWeight: 'bold' }}>{poem.dynasty}</span>
                {' · '}
                <span style={{ color: '#c23b22', fontWeight: 'bold' }}>{poem.author}</span>
              </p>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#5a4a3a',
                  lineHeight: 1.7,
                }}
              >
                <span style={{ color: '#8b4513', fontWeight: 'bold' }}>【创作背景】</span>
                {poem.background || '暂无详细信息。'}
              </p>
            </div>

            {poem.keywords && poem.keywords.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#5a4a3a',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#8b4513', fontWeight: 'bold' }}>【关键词】</span>
                  {poem.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#f5e6c8',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#8b4513',
                        border: '1px solid rgba(139, 69, 19, 0.3)',
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </p>
              </div>
            )}

            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(194, 59, 34, 0.08)',
                borderRadius: '6px',
                borderLeft: '3px solid #c23b22',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#5a4a3a',
                  lineHeight: 1.6,
                }}
              >
                <span style={{ color: '#c23b22', fontWeight: 'bold' }}>💡 文化小知识：</span>
                {poem.cultural_note || '探索更多古诗词的魅力吧！'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoetryCard;
