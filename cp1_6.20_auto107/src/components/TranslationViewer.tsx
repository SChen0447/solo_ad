import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchTranslations, updateTranslation, exportDocument } from '../api/translationApi';
import { useSocket } from '../hooks/useSocket';
import type { Paragraph, OnlineUser } from '../types';

interface TranslationViewerProps {
  userId: string;
  userName: string;
}

interface LockInfo {
  [paragraphIndex: number]: { userId: string; userName: string };
}

interface SaveFlashInfo {
  [paragraphIndex: number]: boolean;
}

const PAGE_SIZE = 100;

export const TranslationViewer: React.FC<TranslationViewerProps> = ({ userId, userName }) => {
  const { docId } = useParams<{ docId: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saveFlash, setSaveFlash] = useState<SaveFlashInfo>({});

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [lockedParagraphs, setLockedParagraphs] = useState<LockInfo>({});

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const handleTranslationUpdated = useCallback((data: {
    doc_id: string;
    paragraph_index: number;
    translation: string;
  }) => {
    if (data.doc_id !== docId) return;
    setParagraphs(prev => prev.map(p =>
      p.index === data.paragraph_index
        ? { ...p, translation: data.translation }
        : p
    ));
  }, [docId]);

  const handleParagraphLocked = useCallback((data: {
    doc_id: string;
    paragraph_index: number;
    user_id: string;
  }) => {
    if (data.doc_id !== docId) return;
    if (data.user_id !== userId) {
      const user = onlineUsers.find(u => u.user_id === data.user_id);
      setLockedParagraphs(prev => ({
        ...prev,
        [data.paragraph_index]: {
          userId: data.user_id,
          userName: user?.user_name || '未知用户'
        }
      }));
      if (editingIndex === data.paragraph_index) {
        setEditingIndex(null);
      }
    }
  }, [docId, userId, onlineUsers, editingIndex]);

  const handleParagraphUnlocked = useCallback((data: {
    doc_id: string;
    paragraph_index: number;
  }) => {
    if (data.doc_id !== docId) return;
    setLockedParagraphs(prev => {
      const newLocks = { ...prev };
      delete newLocks[data.paragraph_index];
      return newLocks;
    });
  }, [docId]);

  const handleOnlineUsersList = useCallback((users: OnlineUser[]) => {
    setOnlineUsers(users);
  }, []);

  const handleUserJoined = useCallback((user: OnlineUser, allUsers: OnlineUser[]) => {
    setOnlineUsers(allUsers);
  }, []);

  const handleUserLeft = useCallback((sid: string, allUsers: OnlineUser[]) => {
    setOnlineUsers(allUsers);
  }, []);

  const { connect, lockParagraph, unlockParagraph } = useSocket(docId, {
    onTranslationUpdated: handleTranslationUpdated,
    onParagraphLocked: handleParagraphLocked,
    onParagraphUnlocked: handleParagraphUnlocked,
    onOnlineUsersList: handleOnlineUsersList,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
  });

  useEffect(() => {
    if (docId && userId && userName) {
      connect(userId, userName);
    }
  }, [docId, userId, userName, connect]);

  const loadParagraphs = useCallback(async (page: number, reset: boolean = false) => {
    if (!docId || loading) return;

    setLoading(true);
    try {
      const response = await fetchTranslations(docId, page, PAGE_SIZE);
      setTotal(response.total);
      setHasMore((page + 1) * PAGE_SIZE < response.total);
      setCurrentPage(page);

      if (reset) {
        setParagraphs(response.paragraphs);
      } else {
        setParagraphs(prev => {
          const existingIndices = new Set(prev.map(p => p.index));
          const newParagraphs = response.paragraphs.filter(p => !existingIndices.has(p.index));
          return [...prev, ...newParagraphs].sort((a, b) => a.index - b.index);
        });
      }
    } catch (error) {
      console.error('加载段落失败:', error);
    } finally {
      setLoading(false);
    }
  }, [docId, loading]);

  useEffect(() => {
    if (docId) {
      loadParagraphs(0, true);
    }
  }, [docId]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadParagraphs(currentPage + 1);
    }
  }, [loading, hasMore, currentPage, loadParagraphs]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleEditClick = useCallback((paragraph: Paragraph) => {
    if (lockedParagraphs[paragraph.index] && lockedParagraphs[paragraph.index].userId !== userId) {
      return;
    }

    lockParagraph(paragraph.index, userId);
    setEditingIndex(paragraph.index);
    setEditValue(paragraph.translation);

    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus();
        editTextareaRef.current.setSelectionRange(0, editTextareaRef.current.value.length);
      }
    }, 100);
  }, [lockedParagraphs, userId, lockParagraph]);

  const handleSave = useCallback(async () => {
    if (editingIndex === null || !docId) return;

    try {
      await updateTranslation(docId, editingIndex, editValue);
      setParagraphs(prev => prev.map(p =>
        p.index === editingIndex
          ? { ...p, translation: editValue }
          : p
      ));

      setSaveFlash(prev => ({ ...prev, [editingIndex]: true }));
      setTimeout(() => {
        setSaveFlash(prev => ({ ...prev, [editingIndex]: false }));
      }, 500);

      setEditingIndex(null);
      unlockParagraph(editingIndex);
    } catch (error) {
      console.error('保存失败:', error);
    }
  }, [editingIndex, docId, editValue, unlockParagraph]);

  const handleCancelEdit = useCallback(() => {
    if (editingIndex !== null) {
      unlockParagraph(editingIndex);
    }
    setEditingIndex(null);
    setEditValue('');
  }, [editingIndex, unlockParagraph]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSave, handleCancelEdit]);

  const handleExport = useCallback(async (format: 'md' | 'pdf') => {
    if (!docId) return;
    try {
      await exportDocument(docId, format);
    } catch (error) {
      console.error('导出失败:', error);
    }
    setExportMenuOpen(false);
  }, [docId]);

  const sortedParagraphs = useMemo(() =>
    [...paragraphs].sort((a, b) => a.index - b.index),
    [paragraphs]
  );

  const avatarColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
  ];

  const getAvatarColor = (index: number) => avatarColors[index % avatarColors.length];

  return (
    <div className="translation-viewer">
      <header className="viewer-header">
        <div className="header-left">
          <h1 className="document-title">文档翻译</h1>
          <span className="paragraph-count">
            共 {total} 段
          </span>
        </div>

        <div className="header-right">
          <div className="online-users">
            <div className="avatars-stack">
              {onlineUsers.slice(0, 5).map((user, index) => (
                <motion.div
                  key={user.user_id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="avatar"
                  style={{
                    backgroundColor: user.avatar_color || getAvatarColor(index),
                    marginLeft: index > 0 ? '-8px' : '0',
                    zIndex: onlineUsers.length - index
                  }}
                  title={user.user_name}
                >
                  {user.user_name.charAt(0).toUpperCase()}
                </motion.div>
              ))}
            </div>
            <span className="online-count">
              {onlineUsers.length} 人在线
            </span>
          </div>

          <div className="export-container">
            <button
              className="export-btn"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
            >
              导出
              <span className="dropdown-icon">▼</span>
            </button>

            <AnimatePresence>
              {exportMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="export-dropdown"
                >
                  <button onClick={() => handleExport('md')}>
                    Markdown (.md)
                  </button>
                  <button onClick={() => handleExport('pdf')}>
                    PDF (.pdf)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div
        ref={containerRef}
        className="paragraphs-container"
        onScroll={handleScroll}
      >
        {sortedParagraphs.map((paragraph) => {
          const isEditing = editingIndex === paragraph.index;
          const isLocked = lockedParagraphs[paragraph.index] && lockedParagraphs[paragraph.index].userId !== userId;
          const lockInfo = lockedParagraphs[paragraph.index];
          const isFlash = saveFlash[paragraph.index];

          return (
            <motion.div
              key={paragraph.index}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                backgroundColor: isEditing ? '#fff3cd' : 'transparent'
              }}
              transition={{
                duration: 0.3,
                backgroundColor: { duration: 0.3 }
              }}
              className={`paragraph-row ${isFlash ? 'save-flash' : ''}`}
            >
              <div className="line-number">
                {paragraph.index + 1}
              </div>

              <div className="original-text">
                <p>{paragraph.original}</p>
              </div>

              <div className="translation-text">
                {isEditing ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="edit-container"
                  >
                    <textarea
                      ref={editTextareaRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="edit-textarea"
                    />
                    <div className="edit-actions">
                      <button
                        className="save-btn"
                        onClick={handleSave}
                      >
                        保存 (Ctrl+Enter)
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={handleCancelEdit}
                      >
                        取消 (Esc)
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="translation-content">
                    <p>{paragraph.translation}</p>
                    <div className="translation-actions">
                      {isLocked ? (
                        <span className="lock-info" title={`${lockInfo?.userName} 正在编辑`}>
                          🔒 {lockInfo?.userName} 正在编辑
                        </span>
                      ) : (
                        <button
                          className="edit-btn"
                          onClick={() => handleEditClick(paragraph)}
                        >
                          编辑
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>加载中...</span>
          </div>
        )}

        {!hasMore && paragraphs.length > 0 && (
          <div className="end-indicator">
            已加载全部 {total} 段
          </div>
        )}
      </div>

      <style>{`
        .translation-viewer {
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid #e9ecef;
          background: #fff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .document-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          color: #212529;
        }

        .paragraph-count {
          font-size: 14px;
          color: #6c757d;
          background: #f8f9fa;
          padding: 4px 12px;
          border-radius: 4px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .online-users {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatars-stack {
          display: flex;
          align-items: center;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .online-count {
          font-size: 13px;
          color: #28a745;
          font-weight: 500;
        }

        .export-container {
          position: relative;
        }

        .export-btn {
          padding: 8px 16px;
          background: #007bff;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
        }

        .export-btn:hover {
          background: #0056b3;
        }

        .dropdown-icon {
          font-size: 10px;
        }

        .export-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #fff;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          min-width: 160px;
          overflow: hidden;
          z-index: 100;
        }

        .export-dropdown button {
          display: block;
          width: 100%;
          padding: 12px 16px;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: #212529;
          transition: background 0.15s;
        }

        .export-dropdown button:hover {
          background: #f8f9fa;
        }

        .paragraphs-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .paragraph-row {
          display: grid;
          grid-template-columns: 50px 1fr 1fr;
          gap: 16px;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 12px;
          transition: background-color 0.3s;
          position: relative;
        }

        .paragraph-row:hover {
          background: #f8f9fa;
        }

        .paragraph-row.save-flash {
          animation: flashGreen 0.5s ease;
        }

        @keyframes flashGreen {
          0%, 100% {
            box-shadow: inset 0 0 0 2px transparent;
          }
          50% {
            box-shadow: inset 0 0 0 2px #28a745;
          }
        }

        .line-number {
          color: #888;
          font-size: 12px;
          text-align: right;
          padding-top: 4px;
          font-family: 'SF Mono', Monaco, monospace;
          user-select: none;
        }

        .original-text,
        .translation-text {
          line-height: 1.8;
        }

        .original-text p,
        .translation-content p {
          margin: 0;
          color: #212529;
          font-size: 15px;
        }

        .original-text p {
          color: #495057;
        }

        .translation-content {
          position: relative;
        }

        .translation-actions {
          margin-top: 8px;
          display: flex;
          align-items: center;
        }

        .edit-btn {
          padding: 4px 12px;
          background: #e9ecef;
          color: #495057;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.2s;
        }

        .edit-btn:hover {
          background: #dee2e6;
        }

        .lock-info {
          font-size: 12px;
          color: #dc3545;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .edit-container {
          width: 60%;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
        }

        .edit-textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          font-size: 15px;
          line-height: 1.8;
          resize: vertical;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .edit-textarea:focus {
          outline: none;
          border-color: #007bff;
        }

        .edit-actions {
          margin-top: 12px;
          display: flex;
          gap: 8px;
        }

        .save-btn {
          padding: 6px 16px;
          background: #28a745;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s;
        }

        .save-btn:hover {
          background: #218838;
        }

        .cancel-btn {
          padding: 6px 16px;
          background: #6c757d;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s;
        }

        .cancel-btn:hover {
          background: #5a6268;
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 24px;
          color: #6c757d;
          font-size: 14px;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #dee2e6;
          border-top-color: #007bff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .end-indicator {
          text-align: center;
          padding: 24px;
          color: #adb5bd;
          font-size: 13px;
        }

        @media (max-width: 768px) {
          .paragraph-row {
            grid-template-columns: 40px 1fr;
          }

          .original-text {
            grid-column: 2;
            font-size: 14px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e9ecef;
          }

          .translation-text {
            grid-column: 2;
          }

          .edit-container {
            width: 100%;
          }

          .viewer-header {
            flex-direction: column;
            gap: 12px;
            padding: 12px 16px;
          }

          .header-left,
          .header-right {
            width: 100%;
            justify-content: space-between;
          }

          .document-title {
            font-size: 18px;
          }
        }

        @media (max-width: 480px) {
          .paragraphs-container {
            padding: 12px;
          }

          .paragraph-row {
            padding: 12px;
            gap: 8px;
          }

          .header-right {
            flex-wrap: wrap;
          }

          .online-users {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
};
