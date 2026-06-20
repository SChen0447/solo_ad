import React, { useState } from 'react';

export interface Theme {
  id: string;
  name: string;
  description: string;
  gradient: string;
  icon: string;
  prompt: string;
}

export const themes: Theme[] = [
  {
    id: 'sci-fi',
    name: '科幻',
    description: '未来世界与星际冒险',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: '🚀',
    prompt: '在遥远的未来，人类已经殖民了整个银河系。一艘孤独的探险飞船在深空中发现了一个神秘的信号...',
  },
  {
    id: 'fantasy',
    name: '奇幻',
    description: '魔法与龙的世界',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    icon: '🐉',
    prompt: '在古老的魔法大陆上，一位年轻的魔法师踏上了寻找失落神器的旅程。途中，他遇到了一只会说话的龙...',
  },
  {
    id: 'adventure',
    name: '冒险',
    description: '未知世界的探索',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    icon: '🗺️',
    prompt: '在茂密的热带雨林深处，隐藏着一座失落的黄金城。一支勇敢的探险队正在穿越危险的沼泽地...',
  },
  {
    id: 'campus',
    name: '校园',
    description: '青春与友情的故事',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    icon: '📚',
    prompt: '阳光透过教室的窗户洒进来，新学期的第一天。一个转学生走进了教室，他的到来将改变所有人的命运...',
  },
  {
    id: 'mystery',
    name: '悬疑',
    description: '迷雾中的真相',
    gradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
    icon: '🔍',
    prompt: '雨夜，一座古老的庄园里发生了离奇的命案。所有的线索都指向一个不可能的嫌疑人。侦探必须在真相被永远埋葬前找出凶手...',
  },
  {
    id: 'ancient',
    name: '古风',
    description: '古代中国的传奇',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    icon: '🏯',
    prompt: '大唐盛世，长安城暗流涌动。一位白衣书生无意间卷入了一场宫廷政变，他必须用智慧化解危机，保护心爱之人...',
  },
];

interface ThemeSelectorProps {
  onThemeSelect: (theme: Theme) => void;
  disabled?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ onThemeSelect, disabled }) => {
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [animatingTheme, setAnimatingTheme] = useState<string | null>(null);

  const handleThemeClick = (theme: Theme) => {
    if (disabled || animatingTheme) return;
    
    setAnimatingTheme(theme.id);
    setSelectedTheme(theme.id);
    
    setTimeout(() => {
      setAnimatingTheme(null);
      onThemeSelect(theme);
    }, 300);
  };

  return (
    <div style={styles.container}>
      <div style={styles.grid} className="theme-grid">
        {themes.map((theme) => {
          const isHovered = hoveredTheme === theme.id;
          const isSelected = selectedTheme === theme.id;
          const isAnimating = animatingTheme === theme.id;
          
          return (
            <div
              key={theme.id}
              style={{
                ...styles.card,
                background: theme.gradient,
                transform: isHovered && !disabled
                  ? 'translateY(-2px) scale(1.08)'
                  : isAnimating
                  ? 'translateX(-20px) scale(0.9)'
                  : isSelected
                  ? 'translateX(0) scale(1)'
                  : 'translateY(0) scale(1)',
                opacity: isAnimating ? 0 : 1,
                boxShadow: isHovered && !disabled
                  ? `0 8px 32px ${theme.gradient.includes('4343') ? 'rgba(108, 99, 255, 0.5)' : 'rgba(102, 126, 234, 0.5)'}, 0 0 0 2px rgba(255, 255, 255, 0.3)`
                  : '0 4px 16px rgba(0, 0, 0, 0.3)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                filter: disabled ? 'grayscale(0.5) brightness(0.7)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={() => !disabled && setHoveredTheme(theme.id)}
              onMouseLeave={() => setHoveredTheme(null)}
              onClick={() => handleThemeClick(theme)}
            >
              <div style={styles.icon}>{theme.icon}</div>
              <div style={styles.themeName}>{theme.name}</div>
              <div style={styles.description}>{theme.description}</div>
              
              {isHovered && !disabled && (
                <div style={styles.glow} />
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @media (max-width: 1200px) {
          .theme-grid {
            grid-template-columns: repeat(3, 140px) !important;
          }
        }
        @media (max-width: 600px) {
          .theme-grid {
            grid-template-columns: repeat(2, 140px) !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: '20px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 140px)',
    gap: '16px',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    position: 'relative',
    width: '140px',
    height: '120px',
    borderRadius: '8px',
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    userSelect: 'none',
  },
  icon: {
    fontSize: '32px',
    marginBottom: '8px',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
  },
  themeName: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#ffffff',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
    marginBottom: '4px',
  },
  description: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 1.3,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
  },
  glow: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%)',
    pointerEvents: 'none',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};
