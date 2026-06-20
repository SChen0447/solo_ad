import React, { useState, useRef, useEffect } from 'react';
import { Card as CardType, User } from '../types';

interface CardProps {
  card: CardType;
  scale: number;
  isDragging: boolean;
  isEditing: boolean;
  currentUser: User;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onDelete: () => void;
  onShowComments: () => void;
  commentCount: number;
}

const TypeIcon: React.FC<{ type: CardType['type']; style?: React.CSSProperties }> = ({ type, style }) => {
  const icons: Record<string, string> = {
    image: '🖼️',
    text: '📝',
    link: '🔗',
  };
  return <span style={{ fontSize: '14px', ...style }}>{icons[type]}</span>;
};

const Card: React.FC<CardProps> = ({
  card,
  scale,
  isDragging,
  isEditing,
  currentUser,
  onMouseDown,
  onDoubleClick,
  onDelete,
  onShowComments,
  commentCount,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderContent = () => {
    switch (card.type) {
      case 'image':
        return (
          <div style={styles.imageContainer}>
            {card.data.image?.url ? (
              <img
                src={card.data.image.url}
                alt=""
                style={styles.image}
                draggable={false}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTBlNGU4Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5NWE1YTYiIGZvbnQtc2l6ZT0iMTQiPvCfkajwn5Wp5Zu+5LqG5a2Q5Zu+5pyN5YqhPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
            ) : (
              <div style={styles.imagePlaceholder}>
                <span style={{ fontSize: '40px' }}>🖼️</span>
                <span style={{ fontSize: '13px', color: '#95a5a6' }}>双击添加图片</span>
              </div>
            )}
          </div>
        );
      case 'text':
        return (
          <div style={styles.textContainer}>
            {card.data.text?.title && (
              <div style={styles.textTitle}>{card.data.text.title}</div>
            )}
            <div style={styles.textContent}>
              {card.data.text?.content || (
                <span style={{ color: '#b0b7bf' }}>双击编辑文字内容...</span>
              )}
            </div>
          </div>
        );
      case 'link':
        return (
          <div style={styles.linkContainer}>
            {card.data.link?.thumbnail ? (
              <img src={card.data.link.thumbnail} alt="" style={styles.linkThumbnail} />
            ) : (
              <div style={styles.linkThumbnailPlaceholder}>
                <span style={{ fontSize: '32px' }}>🌐</span>
              </div>
            )}
            <div style={styles.linkInfo}>
              <div style={styles.linkTitle}>
                {card.data.link?.title || '双击添加链接'}
              </div>
              <div style={styles.linkDesc}>
                {card.data.link?.description || card.data.link?.url || ''}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        ...styles.card,
        left: card.position.x,
        top: card.position.y,
        width: card.size.width,
        height: card.size.height,
        transform: isDragging
          ? `scale(${1.05 / scale}) rotate(${Math.sin(Date.now() / 500) * 0.5}deg)`
          : `scale(1 / ${scale})`,
        borderColor: isEditing || isDragging ? '#4A90D9' : 'transparent',
        boxShadow: isDragging
          ? '0 12px 32px rgba(74, 144, 217, 0.3)'
          : '0 4px 12px rgba(0, 0, 0, 0.1)',
        transition: isDragging ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      {renderContent()}

      <div style={styles.typeBadge}>
        <TypeIcon type={card.type} />
      </div>

      {card.lockedBy && card.lockedBy.id !== currentUser.id && (
        <div style={styles.lockOverlay}>
          <img src={card.lockedBy.avatar} alt="" style={styles.lockAvatar} />
          <span style={styles.lockText}>{card.lockedBy.name} 正在编辑</span>
        </div>
      )}

      <div
        style={styles.actionBar}
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          style={styles.actionBtn}
          onClick={() => onShowComments()}
          title="评论"
        >
          💬 {commentCount > 0 && <span style={styles.commentBadge}>{commentCount}</span>}
        </button>
        <button
          style={styles.actionBtn}
          onClick={() => setShowMenu(!showMenu)}
          title="更多"
        >
          ⋮
        </button>
        {showMenu && (
          <div style={styles.menuDropdown}>
            <button style={styles.menuItem} onClick={onDoubleClick}>
              ✏️ 编辑
            </button>
            <button style={{ ...styles.menuItem, color: '#e74c3c' }} onClick={onDelete}>
              🗑️ 删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    position: 'absolute',
    background: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    borderWidth: '2px',
    borderStyle: 'solid',
    userSelect: 'none',
    willChange: 'transform',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    background: '#f0f2f5',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    pointerEvents: 'none',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: '#f8f9fa',
  },
  textContainer: {
    width: '100%',
    height: '100%',
    padding: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  textTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#2c3e50',
    lineHeight: 1.4,
  },
  textContent: {
    fontSize: '13px',
    color: '#5a6878',
    lineHeight: 1.6,
    flex: 1,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 6,
    WebkitBoxOrient: 'vertical',
  },
  linkContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'row',
    background: '#fff',
  },
  linkThumbnail: {
    width: '50%',
    height: '100%',
    objectFit: 'cover',
    background: '#f0f2f5',
  },
  linkThumbnailPlaceholder: {
    width: '50%',
    height: '100%',
    background: '#eef3f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInfo: {
    flex: 1,
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    overflow: 'hidden',
  },
  linkTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#2c3e50',
    lineHeight: 1.3,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  linkDesc: {
    fontSize: '11px',
    color: '#7f8c8d',
    lineHeight: 1.5,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 4,
    WebkitBoxOrient: 'vertical',
  },
  typeBadge: {
    position: 'absolute',
    right: '8px',
    bottom: '8px',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  },
  lockOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    zIndex: 10,
  },
  lockAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px solid #fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  lockText: {
    fontSize: '12px',
    color: '#5a6878',
    fontWeight: 500,
  },
  actionBar: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    display: 'flex',
    gap: '4px',
    zIndex: 5,
  },
  actionBtn: {
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(8px)',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
  },
  commentBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    background: '#4A90D9',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },
  menuDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    minWidth: '120px',
  },
  menuItem: {
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    fontSize: '13px',
    color: '#34495e',
    cursor: 'pointer',
  },
};

export default Card;
