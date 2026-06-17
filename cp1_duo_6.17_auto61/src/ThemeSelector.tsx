import { Theme } from './componentData';

interface ThemeSelectorProps {
  themes: Theme[];
  selectedTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

function ThemeSelector({ themes, selectedTheme, onThemeChange }: ThemeSelectorProps) {
  return (
    <div
      className="flex overflow-x-auto pb-2 mb-4 gap-1"
      style={{ scrollbarWidth: 'thin' }}
    >
      {themes.map((theme) => (
        <div
          key={theme.id}
          className={`theme-tab ${selectedTheme.id === theme.id ? 'active' : ''}`}
          onClick={() => onThemeChange(theme)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onThemeChange(theme);
            }
          }}
          style={{
            color: selectedTheme.id === theme.id ? theme.primaryColor : '#6b7280',
            fontWeight: selectedTheme.id === theme.id ? 600 : 400
          }}
        >
          {theme.name}
        </div>
      ))}
    </div>
  );
}

export default ThemeSelector;
