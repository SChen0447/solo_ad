import React, { useState, useEffect } from 'react';
import { DocumentListItem } from '../types';
import { SandboxService } from '../sandbox/SandboxService';
import './DocumentList.css';

interface DocumentListProps {
  onSelectDocument: (id: string) => void;
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const DocumentList: React.FC<DocumentListProps> = ({ onSelectDocument }) => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const docs = await SandboxService.getDocuments();
      setDocuments(docs.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (err) {
      console.error('加载文档列表失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    try {
      setIsCreating(true);
      const newDoc = await SandboxService.createDocument('新文档');
      onSelectDocument(newDoc.id);
    } catch (err) {
      console.error('创建文档失败:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除这个文档吗？')) return;

    try {
      await SandboxService.deleteDocument(id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      console.error('删除文档失败:', err);
    }
  };

  return (
    <div className="document-list-container">
      <div className="document-list-header">
        <div className="header-content">
          <h1 className="app-title">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
            协作式文档编辑器
          </h1>
          <p className="app-subtitle">支持富文本编辑与内嵌代码沙盒的在线文档工具</p>
        </div>
        <button
          className="create-button"
          onClick={handleCreateDocument}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <span className="spinner-small"></span>
              创建中...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              新建文档
            </>
          )}
        </button>
      </div>

      <div className="document-list-content">
        <h2 className="section-title">我的文档</h2>

        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>加载中...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            <h3>暂无文档</h3>
            <p>点击上方"新建文档"按钮创建你的第一个文档</p>
            <button
              className="create-button-secondary"
              onClick={handleCreateDocument}
              disabled={isCreating}
            >
              创建文档
            </button>
          </div>
        ) : (
          <div className="document-grid">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="document-card"
                onClick={() => onSelectDocument(doc.id)}
              >
                <div className="document-card-content">
                  <div className="document-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </div>
                  <h3 className="document-card-title" title={doc.title}>
                    {doc.title}
                  </h3>
                  <p className="document-card-time">
                    最后编辑: {formatDate(doc.updatedAt)}
                  </p>
                </div>
                <div className="document-card-actions">
                  <button
                    className="delete-doc-button"
                    onClick={(e) => handleDeleteDocument(e, doc.id)}
                    title="删除文档"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="document-list-footer">
        <p>支持 JavaScript、Python、HTML 代码沙盒执行</p>
      </div>
    </div>
  );
};
