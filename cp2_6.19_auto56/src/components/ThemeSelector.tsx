import React from 'react'
import type { ThemeSelectorProps, ThemeId } from '../types'

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ themes, selectedThemeId, onSelect }) => {
  return (
    <div className="panel-section">
      <span className="panel-title">主题配色</span>
      <div className="theme-grid">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className={`theme-card ${selectedThemeId === theme.id ? 'selected' : ''}`}
            style={{
              background: `linear-gradient(135deg, ${theme.textColors[0]}, ${theme.textColors[2] || theme.primary})`
            }}
            onClick={() => onSelect(theme.id as ThemeId)}
            title={theme.name}
          >
            {theme.name.slice(0, 2)}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ThemeSelector
