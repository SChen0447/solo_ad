import { useEffect, useRef, useState, useCallback } from 'react';
import { useDocumentStore } from '../state/documentStore';
import { useWebSocket } from '../hooks/useWebSocket';
import './DocumentEditor.css';

export function DocumentEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const {
    content,
    comments,
    selectedText,
    selectionRange,
    showCommentInput,
    commentInputPosition,
    activeCommentId,
    currentUser,
    setContent,
    setSelectedText,
    setShowCommentInput,
    addComment,
    setActiveCommentId,
  } = useDocumentStore();

  const { emitCommentAdd } = useWebSocket();
  const [commentText, setCommentText] = useState('');
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      const selection = window.getSelection();
      let range: Range | null = null;
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      }

      editorRef.current.innerHTML = content;

      if (range) {
        try {
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch {
          // ignore
        }
      }
    }
    isInternalUpdate.current = false;
  }, [content]);

  useEffect(() => {
    highlightComments();
  }, [comments, content]);

  useEffect(() => {
    if (activeCommentId) {
      scrollToComment(activeCommentId);
    }
  }, [activeCommentId]);

  const highlightComments = useCallback(() => {
    if (!editorRef.current) return;

    const existingMarkers = editorRef.current.querySelectorAll('.comment-marker');
    existingMarkers.forEach((marker) => {
      const parent = marker.parentNode;
      if (parent) {
        while (marker.firstChild) {
          parent.insertBefore(marker.firstChild, marker);
        }
        parent.removeChild(marker);
        parent.normalize();
      }
    });

    comments.forEach((comment) => {
      highlightCommentInEditor(comment);
    });
  }, [comments]);

  const highlightCommentInEditor = (comment: {
    id: string;
    status: string;
    startOffset: number;
    endOffset: number;
  }) => {
    if (!editorRef.current) return;

    const treeWalker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let startNode: Text | null = null;
    let startNodeOffset = 0;
    let endNode: Text | null = null;
    let endNodeOffset = 0;

    let node: Node | null;
    while ((node = treeWalker.nextNode())) {
      const textNode = node as Text;
      const nodeLength = textNode.length;

      if (!startNode && currentOffset + nodeLength > comment.startOffset) {
        startNode = textNode;
        startNodeOffset = comment.startOffset - currentOffset;
      }

      if (!endNode && currentOffset + nodeLength >= comment.endOffset) {
        endNode = textNode;
        endNodeOffset = comment.endOffset - currentOffset;
        break;
      }

      currentOffset += nodeLength;
    }

    if (startNode && endNode) {
      try {
        const range = document.createRange();
        range.setStart(startNode, startNodeOffset);
        range.setEnd(endNode, endNodeOffset);

        const marker = document.createElement('span');
        marker.className = `comment-marker comment-${comment.status}`;
        marker.dataset.commentId = comment.id;
        range.surroundContents(marker);
      } catch {
        // ignore
      }
    }
  };

  const scrollToComment = (commentId: string) => {
    if (!editorRef.current) return;

    const marker = editorRef.current.querySelector(
      `[data-comment-id="${commentId}"]`
    ) as HTMLElement;

    if (marker) {
      marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
      marker.classList.add('comment-blink');
      setTimeout(() => {
        marker.classList.remove('comment-blink');
      }, 2000);
    }
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    setContent(editorRef.current.innerHTML);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current?.getBoundingClientRect();

    if (!editorRect) return;

    const textOffset = getTextOffset(selection.anchorNode, selection.anchorOffset);
    const endOffset = getTextOffset(selection.focusNode, selection.focusOffset);

    const start = Math.min(textOffset, endOffset);
    const end = Math.max(textOffset, endOffset);

    setSelectedText(selection.toString(), { start, end });
    setShowCommentInput(true, {
      top: rect.top - editorRect.top - 40,
      left: rect.left - editorRect.left + rect.width / 2 - 60,
    });
  };

  const getTextOffset = (node: Node | null, offset: number): number => {
    if (!editorRef.current || !node) return 0;

    let total = 0;
    const treeWalker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);

    let current: Node | null;
    while ((current = treeWalker.nextNode())) {
      if (current === node) {
        return total + offset;
      }
      total += (current as Text).length;
    }

    return total;
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !selectionRange) return;

    const newComment = {
      text: commentText.trim(),
      author: currentUser,
      status: 'pending' as const,
      startOffset: selectionRange.start,
      endOffset: selectionRange.end,
      selectedText: selectedText,
    };

    addComment(newComment);
    emitCommentAdd(newComment);
    setCommentText('');
    window.getSelection()?.removeAllRanges();
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleInput();
  };

  const handleEditorClick = () => {
    if (showCommentInput) {
      setShowCommentInput(false);
    }
  };

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <button
          className="toolbar-btn"
          onClick={() => execCommand('bold')}
          title="粗体"
        >
          <strong>B</strong>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => execCommand('italic')}
          title="斜体"
        >
          <em>I</em>
        </button>
        <div className="toolbar-divider" />
        <button
          className="toolbar-btn"
          onClick={() => execCommand('formatBlock', 'h1')}
          title="标题1"
        >
          H1
        </button>
        <button
          className="toolbar-btn"
          onClick={() => execCommand('formatBlock', 'h2')}
          title="标题2"
        >
          H2
        </button>
        <button
          className="toolbar-btn"
          onClick={() => execCommand('formatBlock', 'h3')}
          title="标题3"
        >
          H3
        </button>
        <div className="toolbar-divider" />
        <button
          className="toolbar-btn"
          onClick={() => execCommand('insertUnorderedList')}
          title="无序列表"
        >
          • 列表
        </button>
        <button
          className="toolbar-btn"
          onClick={() => execCommand('insertOrderedList')}
          title="有序列表"
        >
          1. 列表
        </button>
      </div>

      <div className="editor-wrapper">
        <div
          ref={editorRef}
          className="document-editor"
          contentEditable
          onInput={handleInput}
          onMouseUp={handleMouseUp}
          onClick={handleEditorClick}
          suppressContentEditableWarning
        />

        {showCommentInput && commentInputPosition && (
          <div
            className="comment-popup"
            style={{
              top: commentInputPosition.top,
              left: commentInputPosition.left,
            }}
          >
            <div className="comment-popup-btn" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value.slice(0, 200))}
                placeholder="输入评论内容（200字以内）"
                className="comment-input"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <div className="comment-popup-actions">
                <span className="comment-char-count">{commentText.length}/200</span>
                <button
                  className="comment-submit-btn"
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
