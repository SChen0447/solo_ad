import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocket } from './context/WebSocketContext';
import { User, UserCursor, Comment, Selection } from './types';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import CommentSidebar from './components/CommentSidebar';
import CommentModal from './components/CommentModal';

interface EditorProps {
  roomCode: string;
  user: User;
  initialContent: string;
  initialComments: Comment[];
  initialUsers: User[];
  onLeave: () => void;
}

const Editor: React.FC<EditorProps> = ({
  roomCode,
  user,
  initialContent,
  initialComments,
  initialUsers,
  onLeave
}) => {
  const {
    isConnected,
    connect,
    disconnect,
    sendContentUpdate,
    sendCursorUpdate,
    sendCommentAdd,
    sendCommentDelete,
    onContentUpdate,
    onCursorUpdate,
    onCommentAdd,
    onCommentDelete,
    onUsersUpdate,
    onInit
  } = useWebSocket();

  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(initialContent);
  const [users, setUsers] = useState<User[]>([...initialUsers, user]);
  const [otherCursors, setOtherCursors] = useState<Map<string, UserCursor>>(new Map());
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentModalPosition, setCommentModalPosition] = useState({ x: 0, y: 0 });
  const [selectedTextForComment, setSelectedTextForComment] = useState('');
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [isUpdatingFromRemote, setIsUpdatingFromRemote] = useState(false);
  const cursorUpdateThrottleRef = useRef<number | null>(null);

  const getNodePath = useCallback((node: Node): number[] => {
    const path: number[] = [];
    let current: Node | null = node;
    while (current && current.parentElement && current.parentElement !== editorRef.current) {
      const parent = current.parentElement;
      if (parent) {
        const index = Array.from(parent.childNodes).indexOf(current as ChildNode);
        path.unshift(index);
      }
      current = current.parentElement;
    }
    return path;
  }, []);

  const getNodeFromPath = useCallback((path: number[]): Node | null => {
    if (!editorRef.current) return null;
    let current: Node = editorRef.current;
    for (const index of path) {
      if (current.childNodes[index]) {
        current = current.childNodes[index];
      } else {
        return null;
      }
    }
    return current;
  }, []);

  const getSelectionInfo = useCallback((): { selection: Selection | null; position: { top: number; left: number } | null } => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) {
      return { selection: null, position: null };
    }

    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.startContainer)) {
      return { selection: null, position: null };
    }

    const selection: Selection = {
      anchorOffset: sel.anchorOffset,
      focusOffset: sel.focusOffset,
      anchorPath: getNodePath(sel.anchorNode!),
      focusPath: getNodePath(sel.focusNode!)
    };

    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();
    const position = {
      top: rect.top - editorRect.top,
      left: rect.left - editorRect.left
    };

    return { selection, position };
  }, [getNodePath]);

  const sendCursorPosition = useCallback(() => {
    if (cursorUpdateThrottleRef.current) {
      clearTimeout(cursorUpdateThrottleRef.current);
    }
    
    cursorUpdateThrottleRef.current = window.setTimeout(() => {
      const { selection, position } = getSelectionInfo();
      if (selection || position) {
        sendCursorUpdate({
          userId: user.id,
          nickname: user.nickname,
          color: user.color,
          selection,
          position
        });
      }
    }, 50);
  }, [getSelectionInfo, sendCursorUpdate, user]);

  const countWords = (html: string): number => {
    const text = html.replace(/<[^>]*>/g, '').trim();
    if (!text) return 0;
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = text.replace(/[\u4e00-\u9fa5]/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    return chineseChars + englishWords;
  };

  const countChars = (html: string): number => {
    return html.replace(/<[^>]*>/g, '').length;
  };

  const handleFormat = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    if (command === 'formatBlock') {
      document.execCommand(command, false, `<${value}>`);
    } else {
      document.execCommand(command, false, value);
    }
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      sendContentUpdate(newContent);
    }
  }, [sendContentUpdate]);

  const handleInput = useCallback(() => {
    if (isUpdatingFromRemote || !editorRef.current) return;
    const newContent = editorRef.current.innerHTML;
    setContent(newContent);
    sendContentUpdate(newContent);
    sendCursorPosition();
  }, [isUpdatingFromRemote, sendContentUpdate, sendCursorPosition]);

  const handleSelectionChange = useCallback(() => {
    sendCursorPosition();
    
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.startContainer)) {
        const text = range.toString().trim();
        if (text.length > 0) {
          const rect = range.getBoundingClientRect();
          setSelectedTextForComment(text);
          setSelectedRange(range.cloneRange());
        }
      }
    }
  }, [sendCursorPosition]);

  const showCommentModal = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setCommentModalPosition({
        x: Math.min(rect.left, window.innerWidth - 340),
        y: Math.min(rect.bottom + 10, window.innerHeight - 200)
      });
      setIsCommentModalOpen(true);
    }
  }, []);

  const handleAddComment = useCallback((commentContent: string) => {
    if (!selectedRange || !selectedTextForComment) return;

    const range = selectedRange;
    const preRange = document.createRange();
    preRange.selectNodeContents(editorRef.current!);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const endOffset = startOffset + selectedTextForComment.length;

    sendCommentAdd({
      content: commentContent,
      startOffset,
      endOffset,
      text: selectedTextForComment
    });

    setIsCommentModalOpen(false);
    setSelectedRange(null);
    setSelectedTextForComment('');
    window.getSelection()?.removeAllRanges();
  }, [selectedRange, selectedTextForComment, sendCommentAdd]);

  const handleExport = useCallback((format: 'html' | 'txt') => {
    let exportContent: string;
    let filename: string;
    let mimeType: string;

    if (format === 'html') {
      exportContent = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>${roomCode} - 故事</title>\n</head>\n<body>\n${content}\n</body>\n</html>`;
      filename = `story_${roomCode}.html`;
      mimeType = 'text/html';
    } else {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      exportContent = tempDiv.textContent || tempDiv.innerText || '';
      filename = `story_${roomCode}.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([exportContent], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, roomCode]);

  const handleLeave = useCallback(() => {
    disconnect();
    onLeave();
  }, [disconnect, onLeave]);

  useEffect(() => {
    connect(roomCode, user);

    return () => {
      disconnect();
    };
  }, [connect, disconnect, roomCode, user]);

  useEffect(() => {
    const cleanupContentUpdate = onContentUpdate((newContent, userId) => {
      if (userId === user.id) return;
      
      setIsUpdatingFromRemote(true);
      setContent(newContent);
      
      if (editorRef.current) {
        const sel = window.getSelection();
        let savedRange: Range | null = null;
        
        if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode!)) {
          savedRange = sel.getRangeAt(0).cloneRange();
        }
        
        editorRef.current.innerHTML = newContent;
        
        if (savedRange) {
          try {
            sel?.removeAllRanges();
            sel?.addRange(savedRange);
          } catch (e) {
          }
        }
      }
      
      setTimeout(() => setIsUpdatingFromRemote(false), 0);
    });

    const cleanupCursorUpdate = onCursorUpdate((cursor) => {
      if (cursor.userId === user.id) return;
      setOtherCursors(prev => {
        const next = new Map(prev);
        next.set(cursor.userId, cursor);
        return next;
      });
    });

    const cleanupCommentAdd = onCommentAdd((comment) => {
      setComments(prev => [...prev, comment]);
    });

    const cleanupCommentDelete = onCommentDelete((commentId) => {
      setComments(prev => prev.filter(c => c.id !== commentId));
    });

    const cleanupUsersUpdate = onUsersUpdate((newUsers) => {
      const currentUserInList = newUsers.find(u => u.id === user.id);
      if (currentUserInList) {
        setUsers(newUsers);
      } else {
        setUsers([...newUsers, user]);
      }
      
      setOtherCursors(prev => {
        const next = new Map(prev);
        next.forEach((_, userId) => {
          if (!newUsers.find(u => u.id === userId)) {
            next.delete(userId);
          }
        });
        return next;
      });
    });

    const cleanupInit = onInit((data) => {
      setContent(data.content);
      if (editorRef.current) {
        editorRef.current.innerHTML = data.content;
      }
      setComments(data.comments);
      setUsers([...data.users, user]);
      data.cursors.forEach(cursor => {
        if (cursor.userId !== user.id) {
          setOtherCursors(prev => {
            const next = new Map(prev);
            next.set(cursor.userId, cursor);
            return next;
          });
        }
      });
    });

    return () => {
      cleanupContentUpdate();
      cleanupCursorUpdate();
      cleanupCommentAdd();
      cleanupCommentDelete();
      cleanupUsersUpdate();
      cleanupInit();
    };
  }, [onContentUpdate, onCursorUpdate, onCommentAdd, onCommentDelete, onUsersUpdate, onInit, user]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const renderOtherCursors = () => {
    return Array.from(otherCursors.values()).map((cursor) => {
      if (!cursor.position) return null;
      
      const isCollapsed = cursor.selection && 
        cursor.selection.anchorOffset === cursor.selection.focusOffset &&
        JSON.stringify(cursor.selection.anchorPath) === JSON.stringify(cursor.selection.focusPath);

      return (
        <React.Fragment key={cursor.userId}>
          {isCollapsed && (
            <div
              className="other-cursor"
              style={{
                backgroundColor: cursor.color,
                top: cursor.position.top,
                left: cursor.position.left,
                height: '20px'
              }}
              data-name={cursor.nickname}
            />
          )}
          
          {!isCollapsed && cursor.position && (
            <div
              className="other-selection"
              style={{
                backgroundColor: cursor.color,
                top: cursor.position.top,
                left: cursor.position.left,
                width: '100px',
                height: '20px',
                opacity: 0.3
              }}
            />
          )}
        </React.Fragment>
      );
    });
  };

  const [floatingButtonPos, setFloatingButtonPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const updateFloatingButton = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current) {
        const range = sel.getRangeAt(0);
        if (editorRef.current.contains(range.startContainer)) {
          const rect = range.getBoundingClientRect();
          setFloatingButtonPos({
            x: rect.left + rect.width / 2 - 40,
            y: rect.top - 45
          });
          return;
        }
      }
      setFloatingButtonPos(null);
    };

    const handleMouseUp = () => {
      setTimeout(updateFloatingButton, 10);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', updateFloatingButton);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', updateFloatingButton);
    };
  }, []);

  const isTablet = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      display: 'flex',
      padding: isTablet ? '16px' : '24px',
      gap: '24px',
      justifyContent: 'center'
    }}>
      <div
        ref={containerRef}
        style={{
          width: isTablet ? '90vw' : '800px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <Toolbar
          onFormat={handleFormat}
          roomCode={roomCode}
          users={users}
          currentUserId={user.id}
          onExport={handleExport}
          onLeave={handleLeave}
          isConnected={isConnected}
        />

        <div style={{
          position: 'relative',
          flex: 1,
          minHeight: '500px'
        }}>
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyUp={handleInput}
            onMouseUp={sendCursorPosition}
            onPaste={handleInput}
            dangerouslySetInnerHTML={{ __html: content }}
            style={{
              padding: '32px 48px',
              minHeight: '500px',
              fontSize: '16px',
              lineHeight: 1.8,
              color: '#1f2937',
              outline: 'none'
            }}
            data-placeholder="开始你的故事创作..."
          />

          <div style={{
            position: 'absolute',
            top: '32px',
            left: '48px',
            right: '48px',
            bottom: '32px',
            pointerEvents: 'none'
          }}>
            {renderOtherCursors()}
          </div>
        </div>

        <StatusBar
          wordCount={countWords(content)}
          charCount={countChars(content)}
        />

        {floatingButtonPos && (
          <button
            onClick={showCommentModal}
            style={{
              position: 'fixed',
              left: floatingButtonPos.x,
              top: floatingButtonPos.y,
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              zIndex: 1000
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            💬 添加评注
          </button>
        )}
      </div>

      {!isTablet && (
        <div style={{
          width: '280px',
          flexShrink: 0
        }}>
          <CommentSidebar
            comments={comments}
            onDelete={sendCommentDelete}
            currentUserId={user.id}
            activeCommentId={activeCommentId}
            onHoverComment={setActiveCommentId}
          />
        </div>
      )}

      {isTablet && (
        <CommentSidebar
          comments={comments}
          onDelete={sendCommentDelete}
          currentUserId={user.id}
          activeCommentId={activeCommentId}
          onHoverComment={setActiveCommentId}
        />
      )}

      <CommentModal
        isOpen={isCommentModalOpen}
        position={commentModalPosition}
        selectedText={selectedTextForComment}
        onSubmit={handleAddComment}
        onClose={() => {
          setIsCommentModalOpen(false);
          setSelectedRange(null);
          setSelectedTextForComment('');
        }}
      />
    </div>
  );
};

export default Editor;
