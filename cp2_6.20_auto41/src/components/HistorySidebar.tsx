import React from 'react';
import { Clock } from 'lucide-react';
import { useAppStore } from '../store';
import { StoryRecord } from '../store/types';

const HistorySidebar: React.FC = () => {
  const { storyHistory, setCurrentStory, setDisplayedStory, setSceneData } = useAppStore();

  const handleHistoryClick = (story: StoryRecord) => {
    setCurrentStory(story.content);
    setDisplayedStory(story.content);
    if (story.keywords.length > 0) {
      const { parseKeywords } = require('../store/types');
      setSceneData(parseKeywords(story.content, story.theme));
    }
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      width: '100%',
      maxHeight: '400px',
      overflowY: 'auto',
      padding: '12px',
    }}>
      <h3 style={{
        color: '#a0a0d0',
        fontSize: '13px',
        fontWeight: 600,
        marginBottom: '12px',
        letterSpacing: '1px',
        textTransform: 'uppercase',
      }}>
        历史记录
      </h3>
      {storyHistory.length === 0 && (
        <p style={{ color: '#606080', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
          暂无故事记录
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {storyHistory.map((story) => (
          <button
            key={story.id}
            onClick={() => handleHistoryClick(story)}
            style={{
              background: 'rgba(30, 30, 60, 0.6)',
              border: '1px solid rgba(108, 99, 255, 0.15)',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s, border-color 0.2s',
              color: '#e0e0ff',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(108, 99, 255, 0.15)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108, 99, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(30, 30, 60, 0.6)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108, 99, 255, 0.15)';
            }}
          >
            <div style={{
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {story.title}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#8080a0',
              fontSize: '11px',
            }}>
              <Clock size={10} />
              {formatTime(story.createdAt)}
              <span style={{ marginLeft: '8px', padding: '2px 6px', background: 'rgba(108,99,255,0.2)', borderRadius: '4px', fontSize: '10px' }}>
                {story.theme}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HistorySidebar;
