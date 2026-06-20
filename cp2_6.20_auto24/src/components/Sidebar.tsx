import type { Resource } from '../types';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  favoriteResources: Resource[];
  onResourceClick: (resourceId: string) => void;
  onClose: () => void;
}

const Sidebar = ({ isOpen, favoriteResources, onResourceClick, onClose }: SidebarProps) => {
  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            我的收藏
          </h2>
          <button className="sidebar-close" onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="sidebar-content">
          {favoriteResources.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <p>暂无收藏的资源</p>
              <span>点击资源卡片上的星标添加收藏</span>
            </div>
          ) : (
            <ul className="favorite-list">
              {favoriteResources.map(resource => (
                <li
                  key={resource.id}
                  className="favorite-item"
                  onClick={() => onResourceClick(resource.id)}
                >
                  <div className="favorite-item-header">
                    <span className={`type-badge type-${resource.type}`}>
                      {resource.type}
                    </span>
                  </div>
                  <h4 className="favorite-title">{resource.title}</h4>
                  <p className="favorite-owner">发布者：{resource.ownerName}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sidebar-footer">
          <p className="favorite-count">
            共收藏 <strong>{favoriteResources.length}</strong> 个资源
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
