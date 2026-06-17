import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocuments, createDocument, DocumentListItem } from '../sandbox/SandboxService';
import './DocumentList.css';

export default function DocumentList() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleCreateNew = useCallback(async () => {
    try {
      const newDoc = await createDocument({
        title: '无标题文档',
        content: '<p>开始编写你的文档...</p>',
        codeBlocks: [],
      });
      navigate(`/doc/${newDoc.id}`);
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  }, [navigate]);

  const handleDocumentClick = useCallback(
    (id: string) => {
      navigate(`/doc/${id}`);
    },
    [navigate]
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? '刚刚' : `${minutes} 分钟前`;
      }
      return `${hours} 小时前`;
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  if (isLoading) {
    return (
      <div className="doc-list-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="doc-list-container">
      <header className="doc-list-header">
        <h1>我的文档</h1>
        <button className="new-doc-btn" onClick={handleCreateNew}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建文档
        </button>
      </header>

      <main className="doc-list-main">
        {documents.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            <h2>还没有文档</h2>
            <p>点击上方按钮创建你的第一篇文档</p>
            <button className="empty-new-btn" onClick={handleCreateNew}>
              创建文档
            </button>
          </div>
        ) : (
          <div className="doc-grid">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="doc-card"
                onClick={() => handleDocumentClick(doc.id)}
              >
                <div className="doc-card-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>
                <h3 className="doc-card-title">{doc.title}</h3>
                <p className="doc-card-time">
                  {formatDate(doc.updatedAt)} 编辑
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
