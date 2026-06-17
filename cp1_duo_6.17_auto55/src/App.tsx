import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import Editor from './components/Editor';
import Preview from './components/Preview';
import VersionHistory from './components/VersionHistory';
import { wsManager } from './utils/websocket';
import { Document, User, Version } from './types';

const USER_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateDocument = async () => {
    const docId = uuidv4();
    try {
      await axios.post(`/api/documents`, {
        id: docId,
        title: '未命名文档',
        content: '# 未命名文档\n\n开始编辑你的文档...'
      });
      navigate(`/doc/${docId}`);
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  return (
    <div className="home-container">
      <h1 className="home-title">在线协作文档编辑器</h1>
      <p className="home-subtitle">多人实时协作编辑 Markdown 文档，支持实时预览和版本历史回溯</p>
      <button className="create-btn" onClick={handleCreateDocument}>
        创建新文档
      </button>
    </div>
  );
};

interface EditorPageProps {
  userId: string;
}

const EditorPage: React.FC<EditorPageProps> = ({ userId }) => {
  const { docId } = useParams<{ docId: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const contentRef = useRef<string>('');
  const lastContentRef = useRef<string>('');

  const userColor = USER_COLORS[users.findIndex(u => u.id === userId) % USER_COLORS.length];

  const showNotification = useCallback((message: string, duration = 2000) => {
    setNotification(message);
    setTimeout(() => setNotification(null), duration);
  }, []);

  useEffect(() => {
    if (!docId) return;

    const fetchDocument = async () => {
      try {
        const response = await axios.get(`/api/documents/${docId}`);
        const doc = response.data;
        setDocument(doc);
        setContent(doc.content);
        setTitle(doc.title);
        contentRef.current = doc.content;
        lastContentRef.current = doc.content;
        setPreviewContent(doc.content);
      } catch (error) {
        console.error('Failed to fetch document:', error);
      }
    };

    fetchDocument();

    const userData: User = {
      id: userId,
      name: `用户${userId.slice(0, 4)}`,
      color: userColor,
      cursorPosition: 0
    };

    wsManager.connect(docId, userId);

    const handleContentUpdate = (data: unknown) => {
      const payload = data as { content: string; cursorPosition: number; userId: string };
      if (payload.userId !== userId) {
        setContent(payload.content);
        contentRef.current = payload.content;
        lastContentRef.current = payload.content;
        setPreviewContent(payload.content);
      }
    };

    const handleCursorUpdate = (data: unknown) => {
      const payload = data as { userId: string; cursorPosition: number };
      setUsers(prev => prev.map(u =>
        u.id === payload.userId ? { ...u, cursorPosition: payload.cursorPosition } : u
      ));
    };

    const handleUserJoin = (data: unknown) => {
      const payload = data as { user: User };
      setUsers(prev => {
        if (!prev.find(u => u.id === payload.user.id)) {
          return [...prev, payload.user];
        }
        return prev;
      });
    };

    const handleUserLeave = (data: unknown) => {
      const payload = data as { userId: string };
      setUsers(prev => prev.filter(u => u.id !== payload.userId));
    };

    const handleVersionSave = (data: unknown) => {
      const payload = data as { version: Version };
      setDocument(prev => {
        if (prev) {
          return {
            ...prev,
            versions: [...prev.versions, payload.version]
          };
        }
        return prev;
      });
    };

    const handleConflict = () => {
      showNotification('检测到编辑冲突，已自动合并');
    };

    const handleDocumentSync = (data: unknown) => {
      const payload = data as { document: Document; users: User[] };
      setDocument(payload.document);
      setContent(payload.document.content);
      setTitle(payload.document.title);
      contentRef.current = payload.document.content;
      lastContentRef.current = payload.document.content;
      setPreviewContent(payload.document.content);
      const filteredUsers = payload.users.filter(u => u.id !== userId);
      setUsers(prev => {
        const currentUser = prev.find(u => u.id === userId) || userData;
        return [currentUser, ...filteredUsers];
      });
    };

    wsManager.on('content_update', handleContentUpdate);
    wsManager.on('cursor_update', handleCursorUpdate);
    wsManager.on('user_join', handleUserJoin);
    wsManager.on('user_leave', handleUserLeave);
    wsManager.on('version_save', handleVersionSave);
    wsManager.on('conflict', handleConflict);
    wsManager.on('document_sync', handleDocumentSync);

    setUsers([userData]);

    return () => {
      wsManager.off('content_update', handleContentUpdate);
      wsManager.off('cursor_update', handleCursorUpdate);
      wsManager.off('user_join', handleUserJoin);
      wsManager.off('user_leave', handleUserLeave);
      wsManager.off('version_save', handleVersionSave);
      wsManager.off('conflict', handleConflict);
      wsManager.off('document_sync', handleDocumentSync);
      wsManager.disconnect();
    };
  }, [docId, userId, userColor, showNotification]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    contentRef.current = newContent;
    setPreviewContent(newContent);
  }, []);

  const handleSave = useCallback(async () => {
    if (!docId) return;
    try {
      await axios.put(`/api/documents/${docId}`, {
        content: contentRef.current
      });
    } catch (error) {
      console.error('Failed to save document:', error);
    }
  }, [docId]);

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    setDocument((prev) => {
      if (prev) {
        return { ...prev, title: newTitle };
      }
      return prev;
    });
    if (!docId) return;
    try {
      await axios.put(`/api/documents/${docId}/title`, { title: newTitle });
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const handleRestoreVersion = async (version: Version) => {
    setContent(version.content);
    contentRef.current = version.content;
    lastContentRef.current = version.content;
    setPreviewContent(version.content);
    wsManager.send('content_update', {
      content: version.content,
      cursorPosition: 0,
      userId
    });
    if (docId) {
      try {
        await axios.put(`/api/documents/${docId}`, {
          content: version.content
        });
      } catch (error) {
        console.error('Failed to restore version:', error);
      }
    }
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    showNotification('链接已复制到剪贴板');
  };

  if (!document) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
      {notification && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffd700',
          color: '#1e1e1e',
          padding: '12px 24px',
          textAlign: 'center',
          zIndex: 1000,
          fontWeight: 500,
          animation: 'slideDown 0.3s ease'
        }}>
          {notification}
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 20px',
        backgroundColor: '#252526',
        borderBottom: '1px solid #3c3c3c',
        gap: '16px'
      }}>
        <button
          onClick={() => setShowVersionHistory(!showVersionHistory)}
          style={{
            padding: '8px 16px',
            backgroundColor: showVersionHistory ? '#007acc' : 'transparent',
            color: '#fff',
            border: '1px solid #007acc',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
            fontSize: '14px'
          }}
        >
          {showVersionHistory ? '隐藏历史' : '版本历史'}
        </button>

        {isEditingTitle ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              setIsEditingTitle(false);
              handleTitleChange(title);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditingTitle(false);
                handleTitleChange(title);
              }
            }}
            autoFocus
            style={{
              fontSize: '18px',
              fontWeight: 600,
              backgroundColor: 'transparent',
              color: '#d4d4d4',
              border: 'none',
              outline: 'none',
              padding: '4px 8px',
              minWidth: '300px'
            }}
          />
        ) : (
          <h1
            onDoubleClick={() => setIsEditingTitle(true)}
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#d4d4d4',
              margin: 0,
              cursor: 'text',
              padding: '4px 8px'
            }}
          >
            {title}
          </h1>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {users.map(user => (
              <div
                key={user.id}
                title={user.name}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: user.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: user.id === userId ? '2px solid #fff' : 'none'
                }}
              >
                {user.name.slice(0, 2)}
              </div>
            ))}
          </div>
          <button
            onClick={copyShareLink}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007acc',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'filter 0.3s ease',
              fontSize: '14px'
            }}
          >
            分享链接
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {showVersionHistory && document.versions && (
          <VersionHistory
            versions={document.versions}
            currentContent={content}
            onRestore={handleRestoreVersion}
          />
        )}

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: '70%', display: 'flex', flexDirection: 'column' }}>
            <Editor
              content={content}
              onChange={handleContentChange}
              onSave={handleSave}
              userId={userId}
              users={users}
              lastContentRef={lastContentRef}
            />
          </div>

          <div style={{
            width: '1px',
            backgroundColor: '#3c3c3c',
            cursor: 'col-resize',
            transition: 'background-color 0.3s ease'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#007acc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3c3c3c';
            }}
          />

          <div style={{ width: '30%', overflow: 'auto', backgroundColor: '#ffffff' }}>
            <Preview content={previewContent} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  const [userId] = useState<string>(() => {
    let stored = localStorage.getItem('userId');
    if (!stored) {
      stored = uuidv4();
      localStorage.setItem('userId', stored);
    }
    return stored;
  });

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/doc/:docId" element={<EditorPage userId={userId} />} />
    </Routes>
  );
};

export default App;
