import { useState } from 'react';
import ComponentRender from './ComponentRender';
import { ComponentItem, Theme } from './componentData';

interface GalleeryListProps {
  components: ComponentItem[];
  theme: Theme;
  favorites: number[];
  onToggleFavorite: (id: number) => Promise<boolean>;
}

function generateCodeSnippet(component: ComponentItem): string {
  const propsStr = Object.entries(component.defaultProps)
    .map(([key, value]) => `${key}="${typeof value === 'string' ? value : JSON.stringify(value)}"`)
    .join(' ');
  return `<${component.name.replace(/\s+/g, '')} ${propsStr} />`;
}

function GalleeryList({ components, theme, favorites, onToggleFavorite }: GalleeryListProps) {
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const [failedId, setFailedId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleFavoriteClick = async (id: number) => {
    setAnimatingId(id);
    setFailedId(null);
    const success = await onToggleFavorite(id);
    if (!success) {
      setFailedId(id);
    }
    setTimeout(() => setAnimatingId(null), 300);
  };

  const handleCopyCode = async (code: string, id: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const HeartIcon = ({ filled, color }: { filled: boolean; color: string }) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={filled ? color : color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  );

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-lg">未找到匹配的组件</p>
      </div>
    );
  }

  return (
    <div className="gallery-grid">
      {components.map((component) => {
        const isFavorite = favorites.includes(component.id);
        const isAnimating = animatingId === component.id;
        const hasFailed = failedId === component.id;
        const isCopied = copiedId === component.id;
        const codeSnippet = generateCodeSnippet(component);

        return (
          <div
            key={component.id}
            className="component-card"
            style={{ backgroundColor: theme.bgColor }}
          >
            <div
              className={`favorite-icon absolute top-3 right-3 z-10 ${isAnimating ? 'animating' : ''}`}
              onClick={() => handleFavoriteClick(component.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleFavoriteClick(component.id);
                }
              }}
            >
              <HeartIcon filled={isFavorite} color={hasFailed ? '#9ca3af' : theme.primaryColor} />
            </div>

            <div className="flex-1 flex items-center justify-center p-4 pt-8">
              <ComponentRender type={component.category} props={component.defaultProps} theme={theme} />
            </div>

            <div className="p-3 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-700 mb-1">{component.name}</div>
              <div
                className="code-snippet text-gray-500"
                onClick={() => handleCopyCode(codeSnippet, component.id)}
                title={isCopied ? '已复制!' : '点击复制代码'}
                style={{
                  backgroundColor: isCopied ? `${theme.primaryColor}10` : 'transparent',
                  borderRadius: '4px',
                  padding: isCopied ? '2px 4px' : 0,
                  color: isCopied ? theme.primaryColor : '#6b7280'
                }}
              >
                {isCopied ? '✓ Copied!' : codeSnippet}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default GalleeryList;
