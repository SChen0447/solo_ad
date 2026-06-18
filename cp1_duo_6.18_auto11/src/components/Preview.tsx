import { useMemo } from 'react';
import { usePortfolioStore, CardData } from '../store';
import './Preview.css';

const iconOptions = [
  { type: 'github', icon: 'fa-github' },
  { type: 'twitter', icon: 'fa-twitter' },
  { type: 'linkedin', icon: 'fa-linkedin' },
  { type: 'email', icon: 'fa-envelope' }
];

function parseContent(content: string): string {
  let result = content;
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
  result = result.replace(/\n-\s(.*?)(?=\n|$)/g, '<li>$1</li>');
  result = result.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  result = result.replace(/\n/g, '<br />');
  if (result.includes('<li>')) {
    result = `<ul>${result.replace(/(<li>.*?<\/li>)/g, '$1').replace(/^(<br>)*|(<br>)*$/g, '')}</ul>`;
  }
  return result;
}

function Preview() {
  const cards = usePortfolioStore(state => state.cards);

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
  }, [cards]);

  const renderCardContent = (card: CardData) => {
    switch (card.type) {
      case 'project':
        return (
          <div className="preview-card-content project-card">
            {card.image && (
              <div className="preview-project-image" style={{ backgroundImage: `url(${card.image})` }} />
            )}
            <div className="preview-project-info">
              <h3 className="preview-project-title">{card.title || '项目标题'}</h3>
              <p className="preview-project-desc">{card.description || '项目描述...'}</p>
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="preview-card-content text-card">
            <div
              className="preview-text-content"
              dangerouslySetInnerHTML={{ __html: parseContent(card.content || '在这里输入文本内容...') }}
            />
          </div>
        );
      case 'contact':
        return (
          <div className="preview-card-content contact-card">
            <h3 className="preview-contact-title">{card.title || '联系方式'}</h3>
            <div className="preview-contact-links">
              {card.links?.map(link => (
                <a
                  key={link.id}
                  className="preview-contact-link"
                  href={link.type === 'email' ? `mailto:${link.url}` : link.url}
                  target={link.type === 'email' ? '_self' : '_blank'}
                  rel="noopener noreferrer"
                >
                  <i className={`fab ${iconOptions.find(i => i.type === link.type)?.icon || 'fa-link'}`}></i>
                </a>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="preview-container">
      <div className="preview-header-section">
        <div className="preview-avatar">
          <i className="fas fa-user"></i>
        </div>
        <h2 className="preview-name">我的作品集</h2>
        <p className="preview-bio">独立开发者 · 设计师</p>
      </div>
      <div className="preview-cards">
        {sortedCards.length === 0 ? (
          <div className="preview-empty">
            <i className="fas fa-inbox"></i>
            <p>暂无内容</p>
            <span>在左侧添加卡片开始创作</span>
          </div>
        ) : (
          sortedCards.map(card => (
            <div key={card.id} className="preview-card">
              {renderCardContent(card)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Preview;
