import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useRoomStore, RemoteCursor } from '../context/RoomContext';

const CURSOR_COLORS = [
  '#E57373', '#64B5F6', '#81C784', '#FFB74D',
  '#BA68C8', '#4DD0E1', '#F06292', '#AED581',
];

const Editor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const cursorOverlayRef = useRef<HTMLDivElement>(null);
  const isLocalChange = useRef(false);
  const lastSyncedContent = useRef('');
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    content,
    updateContent,
    broadcastCursor,
    remoteCursors,
    userName,
    inRoom,
  } = useRoomStore();

  useEffect(() => {
    if (!editorRef.current || !inRoom) return;
    if (isLocalChange.current) {
      isLocalChange.current = false;
      lastSyncedContent.current = content;
      return;
    }
    if (content !== lastSyncedContent.current) {
      const sel = window.getSelection();
      let offset = -1;
      if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const preRange = range.cloneRange();
        preRange.selectNodeContents(editorRef.current);
        preRange.setEnd(range.startContainer, range.startOffset);
        offset = preRange.toString().length;
      }

      editorRef.current.innerHTML = content;
      lastSyncedContent.current = content;

      if (offset >= 0) {
        try {
          const newRange = offsetToRange(editorRef.current, offset);
          if (newRange) {
            const s = window.getSelection();
            s?.removeAllRanges();
            s?.addRange(newRange);
          }
        } catch {
          // cursor restore failed silently
        }
      }
    }
  }, [content, inRoom]);

  useEffect(() => {
    renderRemoteCursors();
  }, [remoteCursors]);

  function offsetToRange(element: HTMLElement, offset: number): Range | null {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    let currentOffset = 0;
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      if (currentOffset + textNode.length >= offset) {
        const localOffset = offset - currentOffset;
        const range = document.createRange();
        range.setStart(textNode, Math.min(localOffset, textNode.length));
        range.collapse(true);
        return range;
      }
      currentOffset += textNode.length;
    }
    const lastChild = element.lastChild;
    if (lastChild) {
      const range = document.createRange();
      range.selectNodeContents(lastChild);
      range.collapse(false);
      return range;
    }
    return null;
  }

  function getTextOffset(container: Node, nodeOffset: number): number {
    const editor = editorRef.current;
    if (!editor) return 0;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    let offset = 0;
    let n: Node | null;
    while ((n = walker.nextNode())) {
      if (n === container) {
        return offset + Math.min(nodeOffset, (n as Text).length);
      }
      offset += (n as Text).length;
    }
    return offset;
  }

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    isLocalChange.current = true;
    lastSyncedContent.current = html;
    updateContent(html, userName);
  }, [updateContent, userName]);

  const handleSelectionChange = useCallback(() => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const anchorNode = sel.anchorNode;
    if (!anchorNode || !editorRef.current.contains(anchorNode)) return;

    const offset = getTextOffset(anchorNode, sel.anchorOffset);
    let selectionStart: number | undefined;
    let selectionEnd: number | undefined;

    if (!sel.isCollapsed && sel.focusNode && editorRef.current.contains(sel.focusNode)) {
      selectionStart = getTextOffset(anchorNode, sel.anchorOffset);
      selectionEnd = getTextOffset(sel.focusNode, sel.focusOffset);
      if (selectionStart > selectionEnd) {
        [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
      }
    }

    broadcastCursor(offset, selectionStart, selectionEnd);
  }, [broadcastCursor]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  const execCommand = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  }, [handleInput]);

  const formatActions = [
    { label: 'B', command: 'bold', title: '粗体', style: { fontWeight: 'bold' } },
    { label: 'I', command: 'italic', title: '斜体', style: { fontStyle: 'italic' } },
    { label: 'H1', command: 'formatBlock', value: 'h1', title: '标题1' },
    { label: 'H2', command: 'formatBlock', value: 'h2', title: '标题2' },
    { label: 'H3', command: 'formatBlock', value: 'h3', title: '标题3' },
    { label: '•', command: 'insertUnorderedList', title: '无序列表' },
    { label: '1.', command: 'insertOrderedList', title: '有序列表' },
    { label: '—', command: 'insertHorizontalRule', title: '分割线' },
  ];

  function renderRemoteCursors() {
    const overlay = cursorOverlayRef.current;
    const editor = editorRef.current;
    if (!overlay || !editor) return;

    overlay.innerHTML = '';

    Object.values(remoteCursors).forEach((cursor: RemoteCursor) => {
      try {
        const range = offsetToRange(editor, cursor.offset);
        if (!range) return;

        const rect = range.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();

        const cursorEl = document.createElement('div');
        cursorEl.style.cssText = `
          position: absolute;
          left: ${rect.left - editorRect.left}px;
          top: ${rect.top - editorRect.top}px;
          width: 2px;
          height: ${rect.height || 20}px;
          background: ${cursor.color};
          pointer-events: none;
          z-index: 10;
        `;

        const label = document.createElement('div');
        label.textContent = cursor.name;
        label.style.cssText = `
          position: absolute;
          left: ${rect.left - editorRect.left}px;
          top: ${rect.top - editorRect.top - 24}px;
          background: ${cursor.color};
          color: #fff;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 11;
          font-family: 'Noto Sans SC', sans-serif;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        `;

        overlay.appendChild(cursorEl);
        overlay.appendChild(label);

        if (
          cursor.selectionStart !== undefined &&
          cursor.selectionEnd !== undefined
        ) {
          const startRange = offsetToRange(editor, cursor.selectionStart);
          const endRange = offsetToRange(editor, cursor.selectionEnd);
          if (startRange && endRange) {
            const selRange = document.createRange();
            selRange.setStart(startRange.startContainer, startRange.startOffset);
            selRange.setEnd(endRange.startContainer, endRange.startOffset);

            const selRects = selRange.getClientRects();
            for (let i = 0; i < selRects.length; i++) {
              const r = selRects[i];
              const highlight = document.createElement('div');
              highlight.style.cssText = `
                position: absolute;
                left: ${r.left - editorRect.left}px;
                top: ${r.top - editorRect.top}px;
                width: ${r.width}px;
                height: ${r.height}px;
                background: ${cursor.color}33;
                pointer-events: none;
                z-index: 5;
                border-radius: 2px;
              `;
              overlay.appendChild(highlight);
            }
          }
        }
      } catch {
        // remote cursor render error, skip
      }
    });
  }

  if (!inRoom) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📝</div>
        <p style={styles.emptyText}>加入或创建一个写作房间，开始协作创作</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.toolbar} ref={toolbarRef}>
        <button
          style={styles.hamburgerBtn}
          onClick={() => setMenuOpen(!menuOpen)}
          className="hamburger-btn"
        >
          ☰
        </button>
        <div style={{ ...styles.toolbarInner, display: menuOpen ? 'flex' : undefined }} className="toolbar-actions">
          {formatActions.map((action) => (
            <button
              key={action.command + (action.value || '')}
              style={{ ...styles.toolBtn, ...action.style }}
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand(action.command, action.value);
              }}
              title={action.title}
              className="tool-btn"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.editorWrapper}>
        <div style={styles.editorArea}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            style={styles.editor}
            dangerouslySetInnerHTML={{ __html: content || '<p><br></p>' }}
          />
          <div ref={cursorOverlayRef} style={styles.cursorOverlay} />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    flex: 1,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#F5ECD7',
    borderBottom: '1px solid #E8DFC8',
    gap: '4px',
    flexWrap: 'wrap',
  },
  toolbarInner: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  toolBtn: {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '8px',
    background: 'transparent',
    color: '#2C2C2C',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontFamily: "'Noto Sans SC', sans-serif",
    transition: 'background 0.2s, color 0.2s',
  },
  hamburgerBtn: {
    display: 'none',
    width: '36px',
    height: '36px',
    border: 'none',
    borderRadius: '8px',
    background: 'transparent',
    color: '#2C2C2C',
    cursor: 'pointer',
    fontSize: '18px',
    marginRight: '8px',
  },
  editorWrapper: {
    flex: 1,
    overflow: 'auto',
    background: '#FAF3E0',
    backgroundImage: `repeating-linear-gradient(
      0deg,
      transparent,
      transparent 31px,
      rgba(0,0,0,0.02) 31px,
      rgba(0,0,0,0.02) 32px
    )`,
  },
  editorArea: {
    position: 'relative',
    maxWidth: '800px',
    margin: '24px auto',
    background: '#FFFDF7',
    borderRadius: '12px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
    padding: '32px 40px',
    minHeight: '500px',
  },
  editor: {
    outline: 'none',
    minHeight: '400px',
    lineHeight: '1.8',
    fontSize: '16px',
    color: '#2C2C2C',
    fontFamily: "'Noto Serif SC', serif",
    wordBreak: 'break-word',
  },
  cursorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#FAF3E0',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    color: '#999',
    fontSize: '15px',
    fontFamily: "'Noto Sans SC', sans-serif",
  },
};

export default Editor;
