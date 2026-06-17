import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocket } from './context/WebSocketContext';
import { User, UserCursor, Comment, Selection } from './types';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import CommentSidebar from './components/CommentSidebar';
import CommentModal from './components/CommentModal';
import DraftRestoreModal from './components/DraftRestoreModal';
import { saveDraft, getDraft, removeDraft, DraftData } from './utils/draftStorage';

interface EditorProps {
  roomCode: string;
  user: User;
  initialContent: string;
  initialComments: Comment[];
  initialUsers: User[];
  onLeave: () => void;
}

interface SerializedSelection {
  anchorPath: number[];
  anchorOffset: number;
  focusPath: number[];
  focusOffset: number;
  isCollapsed: boolean;
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
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const cursorUpdateThrottleRef = useRef<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [isDirty, setIsDirty] = useState(false);
  const [detectedDraft, setDetectedDraft] = useState<DraftData | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedContentRef = useRef<string>(initialContent);
  const AUTO_SAVE_INTERVAL = 30000;

  const getNodePath = useCallback((node: Node): number[] => {
    const path: number[] = [];
    let current: Node | null = node;
    while (current && current.parentElement && current.parentElement !== editorRef.current) {
      const parent: ParentNode = current.parentElement;
      const index = Array.from(parent.childNodes).indexOf(current as ChildNode);
      path.unshift(index);
      current = current.parentElement;
    }
    return path;
  }, []);

  const getNodeFromPath = useCallback((path: number[]): Node | null => {
    if (!editorRef.current) return null;
    let current: Node = editorRef.current;
    for (const index of path) {
      if (!current.childNodes || index >= current.childNodes.length) return null;
      current = current.childNodes[index];
    }
    return current;
  }, []);

  const serializeSelection = useCallback((): SerializedSelection | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return null;

    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.startContainer)) return null;

    return {
      anchorPath: getNodePath(sel.anchorNode!),
      anchorOffset: sel.anchorOffset,
      focusPath: getNodePath(sel.focusNode!),
      focusOffset: sel.focusOffset,
      isCollapsed: sel.isCollapsed
    };
  }, [getNodePath]);

  const deserializeSelection = useCallback((serialized: SerializedSelection): Range | null => {
    if (!editorRef.current) return null;

    const anchorNode = getNodeFromPath(serialized.anchorPath);
    const focusNode = getNodeFromPath(serialized.focusPath);

    if (!anchorNode || !focusNode) return null;

    try {
      const range = document.createRange();
      const maxAnchorOffset = anchorNode.nodeType === Node.TEXT_NODE
        ? (anchorNode.textContent?.length ?? 0)
        : anchorNode.childNodes.length;
      const maxFocusOffset = focusNode.nodeType === Node.TEXT_NODE
        ? (focusNode.textContent?.length ?? 0)
        : focusNode.childNodes.length;

      const anchorOffset = Math.min(serialized.anchorOffset, maxAnchorOffset);
      const focusOffset = Math.min(serialized.focusOffset, maxFocusOffset);

      range.setStart(anchorNode, anchorOffset);
      range.setEnd(focusNode, focusOffset);
      return range;
    } catch {
      return null;
    }
  }, [getNodeFromPath]);

  const getRectsForSelection = useCallback((serialized: SerializedSelection): DOMRectList | null => {
    const range = deserializeSelection(serialized);
    if (!range) return null;
    try {
      return range.getClientRects();
    } catch {
      return null;
    }
  }, [deserializeSelection]);

  const getSelectionInfo = useCallback((): {
    selection: Selection | null;
    position: { top: number; left: number } | null;
    serializedSelection: SerializedSelection | null;
  } => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) {
      return { selection: null, position: null, serializedSelection: null };
    }

    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.startContainer)) {
      return { selection: null, position: null, serializedSelection: null };
    }

    const serialized = serializeSelection();
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

    return { selection, position, serializedSelection: serialized };
  }, [getNodePath, serializeSelection]);

  const sendCursorPosition = useCallback(() => {
    if (cursorUpdateThrottleRef.current) {
      clearTimeout(cursorUpdateThrottleRef.current);
    }

    cursorUpdateThrottleRef.current = window.setTimeout(() => {
      const { selection, position, serializedSelection } = getSelectionInfo();
      if (selection || position) {
        sendCursorUpdate({
          userId: user.id,
          nickname: user.nickname,
          color: user.color,
          selection,
          position,
          serializedSelection
        } as UserCursor & { serializedSelection: SerializedSelection | null });
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

  const markAsDirty = useCallback(() => {
    setIsDirty(true);
    setSaveStatus('unsaved');
  }, []);

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
      markAsDirty();
    }
  }, [sendContentUpdate, markAsDirty]);

  const handleInput = useCallback(() => {
    if (isUpdatingFromRemote || !editorRef.current) return;
    const newContent = editorRef.current.innerHTML;
    setContent(newContent);
    sendContentUpdate(newContent);
    sendCursorPosition();
    markAsDirty();
  }, [isUpdatingFromRemote, sendContentUpdate, sendCursorPosition, markAsDirty]);

  const handleSelectionChange = useCallback(() => {
    sendCursorPosition();

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.startContainer)) {
        const text = range.toString().trim();
        if (text.length > 0) {
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

  const getTextOffsetInEditor = useCallback((node: Node, offset: number): number => {
    if (!editorRef.current) return 0;
    const preRange = document.createRange();
    preRange.selectNodeContents(editorRef.current);
    try {
      preRange.setEnd(node, offset);
    } catch {
      return 0;
    }
    return preRange.toString().length;
  }, []);

  const handleAddComment = useCallback((commentContent: string) => {
    if (!selectedRange || !selectedTextForComment || !editorRef.current) return;

    const startOffset = getTextOffsetInEditor(selectedRange.startContainer, selectedRange.startOffset);
    const endOffset = getTextOffsetInEditor(selectedRange.endContainer, selectedRange.endOffset);
    const anchorXPath = getNodePath(selectedRange.startContainer).join('/');
    const focusXPath = getNodePath(selectedRange.endContainer).join('/');

    sendCommentAdd({
      content: commentContent,
      startOffset,
      endOffset,
      text: selectedTextForComment,
      anchorXPath,
      focusXPath,
      anchorNodeOffset: selectedRange.startOffset,
      focusNodeOffset: selectedRange.endOffset
    });

    setIsCommentModalOpen(false);
    setSelectedRange(null);
    setSelectedTextForComment('');
    window.getSelection()?.removeAllRanges();
  }, [selectedRange, selectedTextForComment, sendCommentAdd, getTextOffsetInEditor, getNodePath]);

  const handleExport = useCallback((format: 'html' | 'txt') => {
    const currentContent = editorRef.current?.innerHTML || content;
    let exportContent: string;
    let filename: string;
    let mimeType: string;

    if (format === 'html') {
      exportContent = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>${roomCode} - 故事</title>\n<style>body{font-family:Inter,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.8;color:#1f2937}h1{font-size:2em}h2{font-size:1.5em}h3{font-size:1.25em}p{margin-bottom:0.5em}</style>\n</head>\n<body>\n${currentContent}\n</body>\n</html>`;
      filename = `story_${roomCode}.html`;
      mimeType = 'text/html';
    } else {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentContent;
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
    if (isDirty && editorRef.current) {
      saveDraft(roomCode, user.id, editorRef.current.innerHTML);
    }
    disconnect();
    onLeave();
  }, [disconnect, onLeave, roomCode, user.id, isDirty]);

  const performAutoSave = useCallback(() => {
    if (!editorRef.current || !isDirty) return;

    const currentContent = editorRef.current.innerHTML;
    if (currentContent === lastSavedContentRef.current) {
      setIsDirty(false);
      setSaveStatus('saved');
      return;
    }

    setSaveStatus('saving');
    saveDraft(roomCode, user.id, currentContent);
    lastSavedContentRef.current = currentContent;
    setIsDirty(false);
    setSaveStatus('saved');
  }, [roomCode, user.id, isDirty]);

  const handleRestoreDraft = useCallback(() => {
    if (!detectedDraft || !editorRef.current) return;
    
    setIsUpdatingFromRemote(true);
    setContent(detectedDraft.content);
    editorRef.current.innerHTML = detectedDraft.content;
    lastSavedContentRef.current = detectedDraft.content;
    removeDraft(roomCode, user.id);
    setDetectedDraft(null);
    setIsDirty(false);
    setSaveStatus('saved');
    
    setTimeout(() => setIsUpdatingFromRemote(false), 0);
  }, [detectedDraft, roomCode, user.id]);

  const handleDiscardDraft = useCallback(() => {
    if (detectedDraft) {
      removeDraft(roomCode, user.id);
    }
    setDetectedDraft(null);
  }, [detectedDraft, roomCode, user.id]);

  const highlightCommentText = useCallback((commentId: string | null) => {
    if (!editorRef.current) return;

    const existingHighlights = editorRef.current.querySelectorAll('.comment-highlight');
    existingHighlights.forEach(el => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent?.insertBefore(el.firstChild, el);
      }
      parent?.removeChild(el);
    });

    setHighlightedCommentId(commentId);

    if (!commentId) return;

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentOffset = 0;
      const textNodes: { node: Text; start: number; end: number }[] = [];

      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const length = node.textContent?.length ?? 0;
        textNodes.push({ node, start: currentOffset, end: currentOffset + length });
        currentOffset += length;
      }

      const startOffset = comment.startOffset;
      const endOffset = comment.endOffset;

      for (const { node, start, end } of textNodes) {
        if (end <= startOffset || start >= endOffset) continue;

        const relStart = Math.max(startOffset - start, 0);
        const relEnd = Math.min(endOffset - start, node.textContent?.length ?? 0);

        if (relStart >= relEnd) continue;

        try {
          const range = document.createRange();
          range.setStart(node, relStart);
          range.setEnd(node, relEnd);

          const span = document.createElement('span');
          span.className = 'comment-highlight active';
          range.surroundContents(span);
        } catch {
          // cross-element wraps are not supported with surroundContents
        }
      }
    } catch {
      // ignore
    }
  }, [comments]);

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
        let savedSerializedSelection: SerializedSelection | null = null;

        if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode!)) {
          savedSerializedSelection = serializeSelection();
        }

        editorRef.current.innerHTML = newContent;

        if (savedSerializedSelection) {
          const restoredRange = deserializeSelection(savedSerializedSelection);
          if (restoredRange) {
            try {
              sel?.removeAllRanges();
              sel?.addRange(restoredRange);
            } catch {
              // selection restore failed, ignore
            }
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
  }, [onContentUpdate, onCursorUpdate, onCommentAdd, onCommentDelete, onUsersUpdate, onInit, user, serializeSelection, deserializeSelection]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const renderOtherCursors = () => {
    return Array.from(otherCursors.values()).map((cursor) => {
      if (!cursor.selection) return null;

      const serializedSel: SerializedSelection | null =
        (cursor as UserCursor & { serializedSelection?: SerializedSelection | null }).serializedSelection ?? null;

      if (serializedSel) {
        const rects = getRectsForSelection(serializedSel);
        if (!rects || rects.length === 0) return null;

        const editorRect = editorRef.current?.getBoundingClientRect();
        if (!editorRect) return null;

        if (serializedSel.isCollapsed) {
          const rect = rects[0];
          return (
            <div
              key={cursor.userId}
              className="other-cursor"
              style={{
                backgroundColor: cursor.color,
                top: rect.top - editorRect.top,
                left: rect.left - editorRect.left,
                height: rect.height || 20
              }}
              data-name={cursor.nickname}
            />
          );
        } else {
          const elements: React.ReactNode[] = [];
          for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            if (rect.width < 1 && rect.height < 1) continue;
            elements.push(
              <div
                key={`${cursor.userId}-sel-${i}`}
                className="other-selection"
                style={{
                  backgroundColor: cursor.color,
                  top: rect.top - editorRect.top,
                  left: rect.left - editorRect.left,
                  width: rect.width,
                  height: rect.height
                }}
              />
            );
          }

          const lastRect = rects[rects.length - 1];
          elements.push(
            <div
              key={`${cursor.userId}-cursor`}
              className="other-cursor"
              style={{
                backgroundColor: cursor.color,
                top: lastRect.top - editorRect.top,
                left: lastRect.right - editorRect.left,
                height: lastRect.height || 20
              }}
              data-name={cursor.nickname}
            />
          );

          return <React.Fragment key={cursor.userId}>{elements}</React.Fragment>;
        }
      }

      if (!cursor.position) return null;

      const isCollapsed = cursor.selection &&
        cursor.selection.anchorOffset === cursor.selection.focusOffset &&
        JSON.stringify(cursor.selection.anchorPath) === JSON.stringify(cursor.selection.focusPath);

      if (isCollapsed) {
        return (
          <div
            key={cursor.userId}
            className="other-cursor"
            style={{
              backgroundColor: cursor.color,
              top: cursor.position.top,
              left: cursor.position.left,
              height: 20
            }}
            data-name={cursor.nickname}
          />
        );
      }

      return (
        <React.Fragment key={cursor.userId}>
          <div
            className="other-selection"
            style={{
              backgroundColor: cursor.color,
              top: cursor.position.top,
              left: cursor.position.left,
              width: 100,
              height: 20,
              opacity: 0.3
            }}
          />
          <div
            className="other-cursor"
            style={{
              backgroundColor: cursor.color,
              top: cursor.position.top,
              left: cursor.position.left + 100,
              height: 20
            }}
            data-name={cursor.nickname}
          />
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

  useEffect(() => {
    if (highlightedCommentId) {
      highlightCommentText(highlightedCommentId);
    }
    return () => {
      highlightCommentText(null);
    };
  }, [highlightedCommentId, highlightCommentText]);

  useEffect(() => {
    const existingDraft = getDraft(roomCode, user.id);
    if (existingDraft && existingDraft.content !== initialContent) {
      const draftText = existingDraft.content.replace(/<[^>]*>/g, '').trim();
      const initialText = initialContent.replace(/<[^>]*>/g, '').trim();
      if (draftText.length > initialText.length) {
        setDetectedDraft(existingDraft);
      }
    }

    autoSaveTimerRef.current = setInterval(() => {
      performAutoSave();
    }, AUTO_SAVE_INTERVAL);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && editorRef.current) {
        saveDraft(roomCode, user.id, editorRef.current.innerHTML);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomCode, user.id, initialContent, performAutoSave, isDirty]);

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
          saveStatus={saveStatus}
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
              zIndex: 1000,
              transition: 'transform 0.15s'
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
            onHoverComment={(id) => {
              setActiveCommentId(id);
              highlightCommentText(id);
            }}
          />
        </div>
      )}

      {isTablet && (
        <CommentSidebar
          comments={comments}
          onDelete={sendCommentDelete}
          currentUserId={user.id}
          activeCommentId={activeCommentId}
          onHoverComment={(id) => {
            setActiveCommentId(id);
            highlightCommentText(id);
          }}
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

      {detectedDraft && (
        <DraftRestoreModal
          draft={detectedDraft}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
    </div>
  );
};

export default Editor;
