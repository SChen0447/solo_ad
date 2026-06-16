import React, { useEffect, useRef, useCallback } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import type { EditorProps, Op, User } from '../types';

interface RemoteCursor {
  userId: string;
  userColor: string;
  userName: string;
  from: number;
  to: number;
}

const cursorLayer = (cursors: RemoteCursor[]) => EditorView.decorations.of((view) => {
  const decorations: any[] = [];
  
  for (const cursor of cursors) {
    if (cursor.from === cursor.to) {
      const widget = document.createElement('span');
      widget.className = 'remote-cursor';
      widget.style.borderLeft = `2px solid ${cursor.userColor}`;
      widget.style.height = '1.2em';
      widget.style.position = 'absolute';
      widget.style.marginLeft = '-1px';
      
      const label = document.createElement('span');
      label.className = 'remote-cursor-label';
      label.textContent = cursor.userName;
      label.style.backgroundColor = cursor.userColor;
      label.style.color = 'white';
      label.style.fontSize = '10px';
      label.style.padding = '1px 4px';
      label.style.borderRadius = '2px';
      label.style.position = 'absolute';
      label.style.top = '-16px';
      label.style.left = '0';
      label.style.whiteSpace = 'nowrap';
      widget.appendChild(label);
      
      decorations.push({
        from: cursor.from,
        to: cursor.from,
        widget: {
          dom: widget,
          side: -1,
        },
      });
    } else {
      decorations.push({
        from: Math.min(cursor.from, cursor.to),
        to: Math.max(cursor.from, cursor.to),
        attributes: {
          style: `background-color: ${cursor.userColor}33;`,
        },
      });
    }
  }
  
  return EditorView.decorations.create(decorations);
});

const theme = EditorView.theme({
  '&': {
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    height: '100%',
    fontSize: '14px',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  },
  '.cm-content': {
    padding: '16px 0',
    caretColor: '#d4d4d4',
  },
  '.cm-line': {
    padding: '0 16px',
  },
  '.cm-gutters': {
    backgroundColor: '#1e1e1e',
    color: '#858585',
    border: 'none',
    padding: '0 8px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2a2d2e',
  },
  '.cm-activeLine': {
    backgroundColor: '#2a2d2e',
  },
  '.cm-selectionBackground': {
    backgroundColor: '#264f78 !important',
  },
  '.cm-lineNumbers': {
    minWidth: '50px',
  },
});

export const Editor: React.FC<EditorProps> = ({
  code,
  users,
  currentUserId,
  onEdit,
  onCursorChange,
  onCodeChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const lastCodeRef = useRef<string>(code);
  const remoteOpsRef = useRef<boolean>(false);
  const cursorCompartment = useRef<Compartment>(new Compartment());
  const debounceTimerRef = useRef<number | null>(null);

  const remoteCursors: RemoteCursor[] = users
    .filter((u) => u.id !== currentUserId && u.cursor && u.online)
    .map((u) => ({
      userId: u.id,
      userColor: u.color,
      userName: u.name,
      from: u.cursor!.from,
      to: u.cursor!.to,
    }));

  const applyOps = useCallback((ops: Op[], view: EditorView) => {
    remoteOpsRef.current = true;
    
    const sortedOps = [...ops].sort((a, b) => b.from - a.from);
    
    view.dispatch({
      changes: sortedOps.map((op) => ({
        from: op.from,
        to: op.to,
        insert: op.type === 'delete' ? '' : op.text || '',
      })),
    });
    
    lastCodeRef.current = view.state.doc.toString();
    remoteOpsRef.current = false;
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const changeListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged && !remoteOpsRef.current) {
        const newCode = update.state.doc.toString();
        const oldCode = lastCodeRef.current;
        
        const changes = update.changes;
        const ops: Op[] = [];
        
        changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
          const insertedText = inserted.toString();
          
          if (fromA === toA && insertedText.length > 0) {
            ops.push({
              type: 'insert',
              from: fromA,
              to: toA,
              text: insertedText,
              timestamp: Date.now(),
              userId: currentUserId || '',
            });
          } else if (fromA !== toA && insertedText.length === 0) {
            ops.push({
              type: 'delete',
              from: fromA,
              to: toA,
              timestamp: Date.now(),
              userId: currentUserId || '',
            });
          } else if (fromA !== toA && insertedText.length > 0) {
            ops.push({
              type: 'replace',
              from: fromA,
              to: toA,
              text: insertedText,
              timestamp: Date.now(),
              userId: currentUserId || '',
            });
          }
        });
        
        lastCodeRef.current = newCode;
        
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        
        if (ops.length > 0) {
          debounceTimerRef.current = window.setTimeout(() => {
            onEdit(ops);
          }, 100);
        }
        
        onCodeChange?.(newCode);
      }
      
      if (update.selectionSet && !remoteOpsRef.current) {
        const selection = update.state.selection.main;
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = window.setTimeout(() => {
          onCursorChange(selection.from, selection.to);
        }, 50);
      }
    });

    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        javascript(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        theme,
        changeListener,
        cursorCompartment.current.of(cursorLayer(remoteCursors)),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    lastCodeRef.current = code;

    return () => {
      view.destroy();
      viewRef.current = null;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!viewRef.current) return;
    
    const currentCode = viewRef.current.state.doc.toString();
    if (code !== currentCode && code !== lastCodeRef.current) {
      remoteOpsRef.current = true;
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: code,
        },
      });
      lastCodeRef.current = code;
      remoteOpsRef.current = false;
    }
  }, [code]);

  useEffect(() => {
    if (!viewRef.current) return;
    
    viewRef.current.dispatch({
      effects: cursorCompartment.current.reconfigure(cursorLayer(remoteCursors)),
    });
  }, [users, currentUserId]);

  return (
    <div
      ref={editorRef}
      className="editor-container"
      style={{ height: '100%', width: '100%', overflow: 'hidden' }}
    />
  );
};

export default Editor;
