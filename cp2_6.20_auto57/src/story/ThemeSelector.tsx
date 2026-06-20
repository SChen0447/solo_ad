import React, { useState } from 'react'

export interface Theme {
  id: string
  name: string
  gradient: string
  icon: string
  prefix: string
}

export const themes: Theme[] = [
  {
    id: 'scifi',
    name: '科幻',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: '🚀',
    prefix: '在遥远的未来世界，'
  },
  {
    id: 'fantasy',
    name: '奇幻',
    gradient: 'linear-gradient(135deg, #11998e 0%, #d4a017 100%)',
    icon: '🧙',
    prefix: '在神秘的魔法大陆，'
  },
  {
    id: 'adventure',
    name: '冒险',
    gradient: 'linear-gradient(135deg, #f2994a 0%, #eb5757 100%)',
    icon: '⚔️',
    prefix: '勇士踏入未知的丛林，'
  },
  {
    id: 'campus',
    name: '校园',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    icon: '📚',
    prefix: '阳光明媚的校园里，'
  },
  {
    id: 'mystery',
    name: '悬疑',
    gradient: 'linear-gradient(135deg, #434343 0%, #6c5ce7 100%)',
    icon: '🔍',
    prefix: '迷雾笼罩的小镇上，'
  },
  {
    id: 'ancient',
    name: '古风',
    gradient: 'linear-gradient(135deg, #c0392b 0%, #f39c12 100%)',
    icon: '🏯',
    prefix: '烟雨江南的古镇中，'
  }
]

interface ThemeSelectorProps {
  onSelect: (theme: Theme) => void
  selectedId?: string
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ onSelect, selectedId }) => {
  const [animatingId, setAnimatingId] = useState<string | null>(null)

  const handleClick = (theme: Theme) => {
    if (selectedId && selectedId !== theme.id) {
      setAnimatingId(theme.id)
      setTimeout(() => setAnimatingId(null), 300)
    }
    onSelect(theme)
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '16px',
      padding: '8px 0',
      maxWidth: '960px',
      margin: '0 auto'
    }}>
      {themes.map((theme, index) => (
        <div
          key={theme.id}
          onClick={() => handleClick(theme)}
          style={{
            width: '140px',
            height: '100px',
            borderRadius: '8px',
            background: theme.gradient,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: selectedId === theme.id
              ? `0 0 20px ${theme.gradient.includes('764ba2') ? '#764ba2' : '#6c63ff'}`
              : '0 2px 8px rgba(0,0,0,0.3)',
            border: selectedId === theme.id ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
            transform: selectedId === theme.id ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
            opacity: animatingId === theme.id ? 0 : 1,
            transition: 'all 0.2s ease',
            animation: animatingId === theme.id ? `slideIn 0.3s ease ${index * 0.05}s forwards` : undefined
          }}
          onMouseEnter={(e) => {
            if (animatingId !== theme.id) {
              e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)'
              e.currentTarget.style.boxShadow = `0 8px 25px rgba(108, 99, 255, 0.4), 0 0 15px rgba(255,255,255,0.1)`
            }
          }}
          onMouseLeave={(e) => {
            if (selectedId !== theme.id && animatingId !== theme.id) {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
            }
          }}
        >
          <span style={{ fontSize: '32px' }}>{theme.icon}</span>
          <span style={{
            color: '#fff',
            fontSize: '16px',
            fontWeight: 600,
            textShadow: '0 1px 3px rgba(0,0,0,0.5)'
          }}>
            {theme.name}
          </span>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          0% {
            opacity: 0;
            transform: translateX(50px) scale(0.5);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1.08) translateY(-2px);
          }
        }
      `}</style>
    </div>
  )
}

export default ThemeSelector
