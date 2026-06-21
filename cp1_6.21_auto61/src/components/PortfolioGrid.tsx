import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import type { Portfolio, ToolCategory } from '../types';
import { DIGITAL_TOOLS, TRADITIONAL_TOOLS } from '../types';
import LazyImage from './LazyImage';

interface PortfolioGridProps {
  portfolios: Portfolio[];
}

const getToolCategory = (tools: string[]): ToolCategory => {
  const hasDigital = tools.some(t => DIGITAL_TOOLS.includes(t));
  const hasTraditional = tools.some(t => TRADITIONAL_TOOLS.includes(t));
  
  if (hasDigital && hasTraditional) return 'mixed';
  if (hasTraditional) return 'traditional';
  return 'digital';
};

const getTagClass = (category: ToolCategory): string => {
  switch (category) {
    case 'digital': return 'tag-digital';
    case 'traditional': return 'tag-traditional';
    case 'mixed': return 'tag-mixed';
  }
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default function PortfolioGrid({ portfolios }: PortfolioGridProps) {
  const navigate = useNavigate();

  if (portfolios.length === 0) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">作品集</h1>
          <p className="page-subtitle">探索创意世界，发现艺术之美</p>
        </div>
        <div className="empty-state">
          <p>暂无作品集，敬请期待...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">作品集</h1>
        <p className="page-subtitle">探索创意世界，发现艺术之美</p>
      </div>
      
      <div className="portfolio-grid">
        {portfolios.map((portfolio) => {
          const category = getToolCategory(portfolio.tools);
          return (
            <div
              key={portfolio.id}
              className="portfolio-card"
              onClick={() => navigate(`/portfolio/${portfolio.id}`)}
            >
              <div className="card-image-wrapper">
                <LazyImage
                  src={portfolio.coverImage}
                  alt={portfolio.name}
                  className="card-image"
                />
                <div className="card-overlay">
                  <div className="card-overlay-content">
                    <h3 className="card-title">{portfolio.name}</h3>
                    <div className="card-date">
                      <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                      {formatDate(portfolio.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-tags">
                {portfolio.tools.map((tool, index) => (
                  <span key={index} className={`tag ${getTagClass(category)}`}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
