import type { Snippet } from '../data/snippets';
import SnippetCard from './SnippetCard';

interface SnippetListProps {
  snippets: Snippet[];
  searchKeyword?: string;
  onShare: () => void;
}

export default function SnippetList({ snippets, searchKeyword = '', onShare }: SnippetListProps) {
  if (snippets.length === 0) {
    return (
      <div className="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        <p className="empty-title">没有找到匹配的代码片段</p>
        <p className="empty-desc">尝试更换搜索关键词或清除标签筛选</p>
        <style>{`
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 24px;
            text-align: center;
          }
          .empty-title {
            margin-top: 16px;
            font-size: 16px;
            font-weight: 600;
            color: #4a5568;
          }
          .empty-desc {
            margin-top: 6px;
            font-size: 14px;
            color: #a0aec0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="snippet-grid">
      {snippets.map(snippet => (
        <SnippetCard
          key={snippet.id}
          snippet={snippet}
          searchKeyword={searchKeyword}
          onShare={onShare}
        />
      ))}
      <style>{`
        .snippet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
          width: 100%;
        }
      `}</style>
    </div>
  );
}
