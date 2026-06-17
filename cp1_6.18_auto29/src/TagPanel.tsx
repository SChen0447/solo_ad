import { useStore } from './store';
import { TAG_COLORS } from './types';
import type { TagColor } from './types';
import { FiX, FiCheck } from 'react-icons/fi';

function TagPanel() {
  const {
    inspirations,
    selectedTags,
    isTagPanelOpen,
    toggleTag,
    clearTags,
    setTagPanelOpen
  } = useStore();

  const allTags = Object.keys(TAG_COLORS) as TagColor[];

  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = inspirations.filter((i) => i.tag === tag).length;
    return acc;
  }, {} as Record<TagColor, number>);

  return (
    <div
      className="tag-panel"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: isTagPanelOpen ? 240 : 0,
        minHeight: 0,
        background: 'rgba(22, 33, 62, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRight: isTagPanelOpen
          ? '1px solid rgba(233, 69, 96, 0.15)'
          : 'none',
        zIndex: 50,
        overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          padding: '20px 20px 16px 20px',
          borderBottom: '1px solid rgba(233, 69, 96, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: isTagPanelOpen ? 1 : 0,
          transition: 'opacity 0.2s ease 0.1s',
          whiteSpace: 'nowrap'
        }}
      >
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#fff'
          }}
        >
          标签筛选
        </h3>
        <button
          onClick={() => setTagPanelOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#a0a0b0',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <FiX size={16} />
        </button>
      </div>

      <div
        style={{
          padding: 16,
          flex: 1,
          overflowY: 'auto',
          opacity: isTagPanelOpen ? 1 : 0,
          transition: 'opacity 0.2s ease 0.15s'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          {allTags.map((tag, index) => {
            const isSelected = selectedTags.includes(tag);
            const count = tagCounts[tag];
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: isSelected
                    ? TAG_COLORS[tag].glow
                    : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  animationDelay: `${index * 30}ms`,
                  animation: isTagPanelOpen
                    ? `slideIn 0.3s ease ${index * 40}ms both`
                    : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background =
                      'rgba(160, 160, 176, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: TAG_COLORS[tag].bg,
                    flexShrink: 0,
                    boxShadow: TAG_COLORS[tag].glow + ' 0 0 8px'
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: isSelected ? '#fff' : '#c0c0d0',
                    fontWeight: isSelected ? 500 : 400
                  }}
                >
                  {TAG_COLORS[tag].name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: isSelected ? TAG_COLORS[tag].bg : '#666',
                    fontWeight: 600,
                    minWidth: 20,
                    textAlign: 'right'
                  }}
                >
                  {count}
                </span>
                {isSelected && (
                  <FiCheck size={14} color="#fff" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedTags.length > 0 && (
        <div
          style={{
            padding: 12,
            borderTop: '1px solid rgba(233, 69, 96, 0.1)',
            opacity: isTagPanelOpen ? 1 : 0,
            transition: 'opacity 0.2s ease 0.2s'
          }}
        >
          <button
            onClick={clearTags}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid rgba(233, 69, 96, 0.3)',
              background: 'rgba(233, 69, 96, 0.1)',
              color: '#e94560',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              transition: 'all 0.15s ease'
            }}
          >
            清除筛选（{selectedTags.length}）
          </button>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

export default TagPanel;
