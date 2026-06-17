import { useEffect, useState } from 'react';
import { Game } from '../game';

interface StoryPanelProps {
  story: string | null;
  gameRef: React.MutableRefObject<Game | null>;
}

export default function StoryPanel({ story, gameRef }: StoryPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [pageFlip, setPageFlip] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    if (story) {
      setIsVisible(true);
      setPageFlip(1);
      setDisplayedText('');
      setTextIndex(0);
      setTimeout(() => setPageFlip(2), 400);
    } else {
      setPageFlip(0);
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [story]);

  useEffect(() => {
    if (!story || !isVisible || pageFlip < 2) return;
    if (textIndex >= story.length) return;

    const timer = setTimeout(() => {
      setDisplayedText(story.slice(0, textIndex + 1));
      setTextIndex(textIndex + 1);
    }, 35);
    return () => clearTimeout(timer);
  }, [textIndex, story, isVisible, pageFlip]);

  const handleClose = () => {
    setPageFlip(0);
    setTimeout(() => {
      setIsVisible(false);
      if (gameRef.current) {
        gameRef.current.clearPendingStory();
      }
    }, 300);
  };

  if (!isVisible || !story) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          ...scrollStyle,
          transform: `perspective(1200px) rotateY(${pageFlip === 1 ? -90 : pageFlip === 0 ? 90 : 0}deg) scale(${pageFlip === 0 ? 0.8 : 1})`,
          opacity: pageFlip === 0 ? 0 : 1,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={scrollTopStyle} />
        <div style={scrollContentStyle}>
          <div style={scrollTitleStyle}>
            <span>📜</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#5a3a1a' }}>
              古代遗物 · 记忆碎片
            </span>
            <span>📜</span>
          </div>
          <div style={scrollDividerStyle} />
          <div style={scrollTextStyle}>
            {displayedText}
            {textIndex < story.length && <span style={cursorStyle}>▌</span>}
          </div>
          <div style={scrollDividerStyle} />
          <button style={closeBtnStyle} onClick={handleClose}>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10 }}>
              继续探险 [关闭]
            </span>
          </button>
        </div>
        <div style={scrollBottomStyle} />
      </div>
    </div>
  );
}

const scrollStyle: React.CSSProperties = {
  maxWidth: 560,
  width: '90%',
  display: 'flex',
  flexDirection: 'column',
  filter: 'drop-shadow(0 10px 40px rgba(0,0,0,0.6))',
};

const scrollTopStyle: React.CSSProperties = {
  height: 28,
  background: 'linear-gradient(180deg, #8b6914 0%, #b8860b 30%, #d4a017 60%, #b8860b 100%)',
  borderRadius: '6px 6px 0 0',
  border: '3px solid #5a3a1a',
  borderBottom: 'none',
  boxShadow: 'inset 0 2px 4px rgba(255, 230, 150, 0.5), 0 -2px 6px rgba(0,0,0,0.3)',
  position: 'relative',
};

const scrollBottomStyle: React.CSSProperties = {
  height: 28,
  background: 'linear-gradient(180deg, #b8860b 0%, #d4a017 40%, #b8860b 70%, #8b6914 100%)',
  borderRadius: '0 0 6px 6px',
  border: '3px solid #5a3a1a',
  borderTop: 'none',
  boxShadow: 'inset 0 -2px 4px rgba(90, 58, 26, 0.5), 0 4px 10px rgba(0,0,0,0.4)',
  position: 'relative',
};

const scrollContentStyle: React.CSSProperties = {
  background: `
    repeating-linear-gradient(
      0deg,
      #f5e6c8 0px,
      #f5e6c8 2px,
      #efe0bf 2px,
      #efe0bf 4px
    )
  `,
  padding: '24px 32px',
  borderLeft: '3px solid #8b6914',
  borderRight: '3px solid #8b6914',
  position: 'relative',
  minHeight: 180,
};

const scrollTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  marginBottom: 8,
};

const scrollDividerStyle: React.CSSProperties = {
  height: 2,
  background: 'linear-gradient(90deg, transparent 0%, #8b6914 20%, #8b6914 80%, transparent 100%)',
  margin: '12px 0',
  opacity: 0.5,
};

const scrollTextStyle: React.CSSProperties = {
  fontFamily: "'Georgia', 'SimSun', serif",
  fontSize: 15,
  lineHeight: 1.9,
  color: '#3a2817',
  textAlign: 'justify',
  textIndent: '2em',
  minHeight: 80,
  letterSpacing: 0.5,
};

const cursorStyle: React.CSSProperties = {
  color: '#5a3a1a',
  animation: 'blink 0.8s infinite',
  marginLeft: 2,
};

const closeBtnStyle: React.CSSProperties = {
  marginTop: 16,
  width: '100%',
  padding: '12px 16px',
  background: 'linear-gradient(180deg, #d4a017 0%, #b8860b 50%, #8b6914 100%)',
  border: '3px solid #5a3a1a',
  borderRadius: 4,
  color: '#3a2817',
  cursor: 'pointer',
  letterSpacing: 2,
  boxShadow: '0 4px 0 #5a3a1a, 0 6px 10px rgba(0,0,0,0.3)',
  transition: 'all 0.1s ease',
  position: 'relative',
};
