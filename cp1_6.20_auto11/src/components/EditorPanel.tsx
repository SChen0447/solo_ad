import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorState, Compartment } from '@codemirror/state';
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import type { User, CursorPosition, Comment, Proposal, CodeFile } from '../types';
import '../styles/editor.css';

interface EditorPanelProps {
  file: CodeFile;
  code: string;
  language: 'javascript' | 'typescript' | 'python';
  cursors: Record<string, CursorPosition>;
  users: User[];
  comments: Comment[];
  currentUser: User | null;
  onCursorChange: (cursor: CursorPosition) => void;
  onCodeChange: (content: string, language: string) => void;
  onAddComment: (lineNumber: number, content: string) => void;
  onCreateProposal: (startLine: number, endLine: number, originalCode: string, proposedCode: string, description: string) => void;
  isTransitioning: boolean;
  proposals: Proposal[];
  onOpenProposal: (proposal: Proposal) => void;
}

const monokaiTheme = EditorView.theme({
  '&': {
    backgroundColor: '#1e1e2e',
    color: '#f8f8f2',
    fontSize: '14px',
    fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
  },
  '.cm-content': {
    caretColor: '#f8f8f0',
    padding: '16px 0',
  },
  '.cm-cursor': {
    borderLeftColor: '#f8f8f0',
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#49483e !important',
  },
  '.cm-gutters': {
    backgroundColor: '#1e1e2e',
    color: '#6c7086',
    border: 'none',
    fontSize: '12px',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: '#cdd6f4',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6c7086',
  },
  '.cm-tooltip': {
    backgroundColor: '#252535',
    border: '1px solid #3a3a4d',
    borderRadius: '6px',
    color: '#cdd6f4',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: '#313144',
      color: '#cdd6f4',
    },
  },
  '.cm-panel': {
    backgroundColor: '#252535',
    color: '#cdd6f4',
  },
  '.cm-button': {
    backgroundColor: '#2a2a3c',
    color: '#cdd6f4',
    border: '1px solid #3a3a4d',
    borderRadius: '4px',
    backgroundImage: 'none',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(166, 227, 161, 0.2)',
    borderBottom: '1px solid #a6e3a1',
  },
  '.cm-nonmatchingBracket': {
    backgroundColor: 'rgba(243, 139, 168, 0.2)',
    borderBottom: '1px solid #f38ba8',
  },
  '.cm-column-resizer': {
    backgroundColor: '#3a3a4d',
  },
  '.cm-scroller': {
    overflow: 'auto',
    scrollbarWidth: 'thin',
  },
  '.cm-line': {
    transition: 'background-color 0.3s ease',
  },
}, { dark: true });

const syntaxColors = EditorView.theme({
  '.tok-keyword': { color: '#f92672', fontWeight: '500' },
  '.tok-atom': { color: '#ae81ff' },
  '.tok-number': { color: '#ae81ff' },
  '.tok-string': { color: '#e6db74' },
  '.tok-string2': { color: '#e6db74' },
  '.tok-regexp': { color: '#fd971f' },
  '.tok-variableName': { color: '#f8f8f2' },
  '.tok-variableName.cm-def': { color: '#fd971f' },
  '.tok-propertyName': { color: '#f8f8f2' },
  '.tok-typeName': { color: '#66d9ef' },
  '.tok-className': { color: '#66d9ef', fontWeight: '500' },
  '.tok-namespace': { color: '#66d9ef' },
  '.tk-labelName': { color: '#66d9ef' },
  '.tok-operator': { color: '#f92672' },
  '.tok-comparisonOperator': { color: '#f92672' },
  '.tok-logicOperator': { color: '#f92672' },
  '.tok-arithmeticOperator': { color: '#f92672' },
  '.tok-punctuation': { color: '#f8f8f2' },
  '.tok-separator': { color: '#f8f8f2' },
  '.tok-bracket': { color: '#f8f8f2' },
  '.tok-comment': { color: '#75715e', fontStyle: 'italic' },
  '.tok-lineComment': { color: '#75715e', fontStyle: 'italic' },
  '.tok-blockComment': { color: '#75715e', fontStyle: 'italic' },
  '.tok-docComment': { color: '#75715e', fontStyle: 'italic' },
  '.tok-function': { color: '#a6e22e' },
  '.tok-functionName': { color: '#a6e22e', fontWeight: '500' },
  '.tok-builtin': { color: '#66d9ef' },
  '.tok-name': { color: '#f8f8f2' },
  '.tok-meta': { color: '#fd971f' },
  '.tok-tag': { color: '#f92672' },
  '.tok-attributeName': { color: '#a6e22e' },
  '.tok-attributeValue': { color: '#e6db74' },
  '.tok-controlKeyword': { color: '#f92672', fontWeight: '500' },
  '.tok-modifier': { color: '#66d9ef' },
  '.tok-declarationKeyword': { color: '#f92672', fontWeight: '500' },
  '.tok-self': { color: '#f92672' },
  '.tok-null': { color: '#ae81ff' },
  '.tok-bool': { color: '#ae81ff' },
  '.tok-invalid': { color: '#f38ba8' },
});

const lineHeight = 21;
const charWidth = 8.4;

const EditorPanel = ({
  file,
  code,
  language,
  cursors,
  users,
  comments,
  currentUser,
  onCursorChange,
  onCodeChange,
  onAddComment,
  onCreateProposal,
  isTransitioning,
  proposals,
  onOpenProposal,
}: EditorPanelProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const languageCompartmentRef = useRef(new Compartment());
  const cursorDecorationsRef = useRef(new Compartment());
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentLine, setCommentLine] = useState(0);
  const [commentContent, setCommentContent] = useState('');
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalRange, setProposalRange] = useState({ start: 0, end: 0, originalCode: '' });
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposedCode, setProposedCode] = useState('');
  const [hoveredGutterLine, setHoveredGutterLine] = useState<number | null>(null);
  const commentsByLineRef = useRef<Map<number, Comment[]>>(new Map());
  const proposalsByLineRef = useRef<Map<number, Proposal[]>>(new Map());

  useEffect(() => {
    commentsByLineRef.current.clear();
    comments.forEach((comment) => {
      if (!commentsByLineRef.current.has(comment.lineNumber)) {
        commentsByLineRef.current.set(comment.lineNumber, []);
      }
      commentsByLineRef.current.get(comment.lineNumber)!.push(comment);
    });
  }, [comments]);

  useEffect(() => {
    proposalsByLineRef.current.clear();
    proposals.forEach((proposal) => {
      for (let i = proposal.startLine; i <= proposal.endLine; i++) {
        if (!proposalsByLineRef.current.has(i)) {
          proposalsByLineRef.current.set(i, []);
        }
        proposalsByLineRef.current.get(i)!.push(proposal);
      }
    });
    if (editorViewRef.current) {
      editorViewRef.current.dispatch({ effects: cursorDecorationsRef.current.reconfigure(getLineDecorations()) });
    }
  }, [proposals]);

  const getLineDecorations = useCallback(() => {
    const lineHighlights = ViewPlugin.fromClass(class {
      decorations: DecorationSet;
      constructor() {
        const builder = new RangeSetBuilder<Decoration>();
        proposals.forEach((proposal) => {
          const startPos = getLineStartPosition(proposal.startLine - 1);
          const endPos = getLineStartPosition(proposal.endLine);
          if (startPos >= 0 && endPos > startPos) {
            const color = proposal.status === 'approved'
              ? 'rgba(166, 227, 161, 0.12)'
              : proposal.status === 'rejected'
              ? 'rgba(243, 139, 168, 0.12)'
              : 'rgba(249, 226, 175, 0.10)';
            const borderColor = proposal.status === 'approved'
              ? 'rgba(166, 227, 161, 0.5)'
              : proposal.status === 'rejected'
              ? 'rgba(243, 139, 168, 0.5)'
              : 'rgba(249, 226, 175, 0.5)';
            builder.add(
              startPos,
              startPos,
              Decoration.line({
                attributes: {
                  style: `background-color: ${color}; border-left: 3px solid ${borderColor};`,
                },
              })
            );
          }
        });
        this.decorations = builder.finish();
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          const builder = new RangeSetBuilder<Decoration>();
          proposals.forEach((proposal) => {
            const startPos = getLineStartPosition(proposal.startLine - 1);
            const endPos = getLineStartPosition(proposal.endLine);
            if (startPos >= 0 && endPos > startPos) {
              const color = proposal.status === 'approved'
                ? 'rgba(166, 227, 161, 0.12)'
                : proposal.status === 'rejected'
                ? 'rgba(243, 139, 168, 0.12)'
                : 'rgba(249, 226, 175, 0.10)';
              const borderColor = proposal.status === 'approved'
                ? 'rgba(166, 227, 161, 0.5)'
                : proposal.status === 'rejected'
                ? 'rgba(243, 139, 168, 0.5)'
                : 'rgba(249, 226, 175, 0.5)';
              builder.add(
                startPos,
                startPos,
                Decoration.line({
                  attributes: {
                    style: `background-color: ${color}; border-left: 3px solid ${borderColor};`,
                  },
                })
              );
            }
          });
          this.decorations = builder.finish();
        }
      }
    }, {
      provide: (plugin) => EditorView.decorations.from(plugin, (value) => value.decorations),
    });
    return lineHighlights;
  }, [proposals]);

  const getLineStartPosition = (lineIndex: number): number => {
    if (!editorViewRef.current) return -1;
    try {
      const line = editorViewRef.current.state.doc.line(lineIndex + 1);
      return line.from;
    } catch {
      return -1;
    }
  };

  const getUserColor = (userId: string): string => {
    const user = users.find((u) => u.id === userId);
    return user?.color || '#6366f1';
  };

  const getUserName = (userId: string): string => {
    const user = users.find((u) => u.id === userId);
    return user?.name || 'Unknown';
  };

  useEffect(() => {
    if (!editorRef.current) return;

    const getLanguageExtension = () => {
      switch (language) {
        case 'typescript':
          return languageCompartmentRef.current.of(javascript({ typescript: true }));
        case 'python':
          return languageCompartmentRef.current.of(python());
        default:
          return languageCompartmentRef.current.of(javascript());
      }
    };

    const cursorDecorationsPlugin = ViewPlugin.fromClass(class {
      decorations: DecorationSet;
      constructor() {
        this.decorations = this.buildDecorations();
      }
      update(update: ViewUpdate) {
        if (update.selectionSet || update.viewportChanged || update.docChanged) {
          this.decorations = this.buildDecorations();
        }
      }
      buildDecorations() {
        const builder = new RangeSetBuilder<Decoration>();
        Object.entries(cursors).forEach(([userId, cursor]) => {
          if (!currentUser || userId === currentUser.id) return;
          try {
            const line = editorViewRef.current?.state.doc.line(cursor.line);
            if (line) {
              const pos = line.from + Math.min(cursor.column, line.length);
              const userColor = getUserColor(userId);
              const userName = getUserName(userId);
              if (cursor.selectionStart && cursor.selectionEnd) {
                try {
                  const selStartLine = editorViewRef.current?.state.doc.line(cursor.selectionStart.line);
                  const selEndLine = editorViewRef.current?.state.doc.line(cursor.selectionEnd.line);
                  if (selStartLine && selEndLine) {
                    const startPos = selStartLine.from + Math.min(cursor.selectionStart.column, selStartLine.length);
                    const endPos = selEndLine.from + Math.min(cursor.selectionEnd.column, selEndLine.length);
                    if (startPos !== endPos) {
                      const [from, to] = startPos < endPos ? [startPos, endPos] : [endPos, startPos];
                      builder.add(
                        from,
                        to,
                        Decoration.mark({
                          attributes: {
                            style: `background-color: ${userColor}33; border-radius: 2px;`,
                          },
                        })
                      );
                    }
                  }
                } catch {}
              }
              builder.add(
                pos,
                pos,
                Decoration.widget({
                  widget: new RemoteCursorWidget(userColor, userName),
                  side: 1,
                })
              );
            }
          } catch {}
        });
        return builder.finish();
      }
    }, {
      provide: (plugin) => EditorView.decorations.from(plugin, (value) => value.decorations),
    });

    const handleSelectionChange = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.selectionSet && currentUser && editorViewRef.current) {
        const mainSelection = update.state.selection.main;
        const head = update.state.doc.lineAt(mainSelection.head);
        const anchor = update.state.doc.lineAt(mainSelection.anchor);

        const cursor: CursorPosition = {
          userId: currentUser.id,
          line: head.number,
          column: mainSelection.head - head.from,
          selectionStart: mainSelection.anchor !== mainSelection.head
            ? { line: anchor.number, column: mainSelection.anchor - anchor.from }
            : undefined,
          selectionEnd: mainSelection.anchor !== mainSelection.head
            ? { line: head.number, column: mainSelection.head - head.from }
            : undefined,
        };
        onCursorChange(cursor);
      }
    });

    const state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        monokaiTheme,
        syntaxColors,
        getLanguageExtension(),
        cursorDecorationsPlugin,
        cursorDecorationsRef.current.of(getLineDecorations()),
        handleSelectionChange,
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString();
            onCodeChange(newContent, language);
          }
        }),
        EditorView.domEventHandlers({
          contextmenu: (event, view) => {
            event.preventDefault();
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos !== null) {
              const line = view.state.doc.lineAt(pos);
              const selection = view.state.selection.main;
              if (selection.anchor !== selection.head) {
                const anchorLine = view.state.doc.lineAt(selection.anchor).number;
                const headLine = view.state.doc.lineAt(selection.head).number;
                const startLine = Math.min(anchorLine, headLine);
                const endLine = Math.max(anchorLine, headLine);
                const from = view.state.doc.line(startLine).from;
                const to = view.state.doc.line(endLine).to;
                const selectedCode = view.state.doc.sliceString(from, to);
                setProposalRange({ start: startLine, end: endLine, originalCode: selectedCode });
                setProposedCode(selectedCode);
                setProposalDescription('');
                setShowProposalModal(true);
              } else {
                setCommentLine(line.number);
                setCommentContent('');
                setShowCommentModal(true);
              }
            }
            return true;
          },
        }),
        EditorView.lineGutter({
          domEventHandlers: {
            click: (view, line, event) => {
              if ((event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey) {
                setCommentLine(line);
                setCommentContent('');
                setShowCommentModal(true);
                return true;
              }
              return false;
            },
            mouseenter: (_view, line) => {
              setHoveredGutterLine(line);
              return true;
            },
            mouseleave: () => {
              setHoveredGutterLine(null);
              return true;
            },
          },
          renderEmptyElements: true,
          marker: (view, line) => {
            const lineComments = commentsByLineRef.current.get(line) || [];
            const unresolvedCount = lineComments.filter((c) => !c.resolved).length;
            const lineProposals = proposalsByLineRef.current.get(line) || [];
            const elements: HTMLElement[] = [];

            if (hoveredGutterLine === line) {
              const addBtn = document.createElement('div');
              addBtn.className = 'gutter-add-btn';
              addBtn.textContent = '💬';
              addBtn.title = '添加评论 (Ctrl+点击行号)';
              addBtn.onclick = (e) => {
                e.stopPropagation();
                setCommentLine(line);
                setCommentContent('');
                setShowCommentModal(true);
              };
              elements.push(addBtn);
            }

            if (lineComments.length > 0) {
              const badge = document.createElement('div');
              badge.className = `comment-line-badge ${unresolvedCount > 0 ? 'unresolved' : 'resolved'}`;
              badge.textContent = lineComments.length > 1 ? `${lineComments.length}` : unresolvedCount > 0 ? '💬' : '✓';
              badge.title = lineComments.map((c) => `${c.author.name}: ${c.content}`).join('\n---\n');
              elements.push(badge);
            }

            if (lineProposals.length > 0 && line === lineProposals[0].startLine) {
              const proposalBadge = document.createElement('div');
              const proposal = lineProposals[0];
              proposalBadge.className = `proposal-line-badge status-${proposal.status}`;
              proposalBadge.textContent = proposal.status === 'approved' ? '✓' : proposal.status === 'rejected' ? '✕' : '⇅';
              proposalBadge.title = `提案: ${proposal.description}\n状态: ${proposal.status === 'approved' ? '已通过' : proposal.status === 'rejected' ? '已驳回' : '待审核'}`;
              proposalBadge.onclick = (e) => {
                e.stopPropagation();
                onOpenProposal(proposal);
              };
              elements.push(proposalBadge);
            }

            if (elements.length === 0) return null;
            const wrapper = document.createElement('div');
            wrapper.className = 'gutter-markers';
            elements.forEach((el) => wrapper.appendChild(el));
            return wrapper;
          },
        }),
        EditorView.contentAttributes.of({ spellcheck: 'false' }),
        EditorView.lineWrapping,
      ],
    });

    editorViewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      if (editorViewRef.current) {
        editorViewRef.current.destroy();
        editorViewRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editorViewRef.current) {
      const getLanguageExtension = () => {
        switch (language) {
          case 'typescript':
            return javascript({ typescript: true });
          case 'python':
            return python();
          default:
            return javascript();
        }
      };
      editorViewRef.current.dispatch({
        effects: languageCompartmentRef.current.reconfigure(getLanguageExtension()),
      });
    }
  }, [language]);

  useEffect(() => {
    if (editorViewRef.current && editorViewRef.current.state.doc.toString() !== code) {
      editorViewRef.current.dispatch({
        changes: {
          from: 0,
          to: editorViewRef.current.state.doc.length,
          insert: code,
        },
      });
    }
  }, [code]);

  useEffect(() => {
    if (editorViewRef.current) {
      editorViewRef.current.dispatch({
        effects: cursorDecorationsRef.current.reconfigure(getLineDecorations()),
      });
    }
  }, [proposals, getLineDecorations]);

  useEffect(() => {
    if (editorViewRef.current) {
      editorViewRef.current.requestMeasure();
    }
  }, [cursors]);

  const handleSubmitComment = () => {
    if (!commentContent.trim()) return;
    onAddComment(commentLine, commentContent.trim());
    setShowCommentModal(false);
    setCommentContent('');
  };

  const handleSubmitProposal = () => {
    if (!proposalDescription.trim()) return;
    onCreateProposal(
      proposalRange.start,
      proposalRange.end,
      proposalRange.originalCode,
      proposedCode,
      proposalDescription.trim()
    );
    setShowProposalModal(false);
    setProposalDescription('');
    setProposedCode('');
  };

  const currentFileComments = comments.filter((c) => !c.resolved);

  return (
    <div className={`editor-panel ${isTransitioning ? 'transitioning' : ''}`}>
      <div className="editor-toolbar">
        <div className="language-selector">
          <span className="toolbar-label">语言:</span>
          <select
            value={language}
            className="language-select"
            disabled
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
          </select>
        </div>
        <div className="editor-actions">
          <button
            className="action-btn primary"
            onClick={() => {
              const sel = editorViewRef.current?.state.selection.main;
              if (sel && sel.anchor !== sel.head && editorViewRef.current) {
                const anchorLine = editorViewRef.current.state.doc.lineAt(sel.anchor).number;
                const headLine = editorViewRef.current.state.doc.lineAt(sel.head).number;
                const startLine = Math.min(anchorLine, headLine);
                const endLine = Math.max(anchorLine, headLine);
                const from = editorViewRef.current.state.doc.line(startLine).from;
                const to = editorViewRef.current.state.doc.line(endLine).to;
                const selectedCode = editorViewRef.current.state.doc.sliceString(from, to);
                setProposalRange({ start: startLine, end: endLine, originalCode: selectedCode });
                setProposedCode(selectedCode);
                setProposalDescription('');
                setShowProposalModal(true);
              }
            }}
            title="选中代码后点击创建修改提案"
          >
            ✏️ 提议修改
          </button>
          <button
            className="action-btn"
            onClick={() => {
              const sel = editorViewRef.current?.state.selection.main;
              if (sel && editorViewRef.current) {
                const line = editorViewRef.current.state.doc.lineAt(sel.head).number;
                setCommentLine(line);
                setCommentContent('');
                setShowCommentModal(true);
              }
            }}
            title="在当前行添加评论"
          >
            💬 添加评论
          </button>
        </div>
        <div className="editor-meta">
          <span className="meta-item">{file.name}</span>
          <span className="meta-item">
            {code.split('\n').length} 行
          </span>
        </div>
      </div>

      <div className="inline-comments-layer">
        {currentFileComments.slice(0, 5).map((comment) => (
          <div
            key={comment.id}
            className="inline-comment-bubble"
            style={{ top: `${(comment.lineNumber - 1) * lineHeight + 60}px` }}
            onClick={() => {
              const pos = getLineStartPosition(comment.lineNumber - 1);
              if (pos >= 0 && editorViewRef.current) {
                editorViewRef.current.dispatch({
                  selection: { anchor: pos, head: pos },
                  effects: EditorView.scrollIntoView(pos, { y: 'center' }),
                });
              }
            }}
          >
            <div
              className="bubble-avatar"
              style={{ backgroundColor: comment.author.color }}
            >
              {comment.author.avatar}
            </div>
            <div className="bubble-content">
              <div className="bubble-header">
                <span className="bubble-author">{comment.author.name}</span>
                <span className="bubble-line">L{comment.lineNumber}</span>
              </div>
              <div className="bubble-text">{comment.content}</div>
              {comment.replies.length > 0 && (
                <div className="bubble-replies">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="bubble-reply">
                      <span className="reply-author" style={{ color: reply.author.color }}>
                        {reply.author.name}:
                      </span>
                      {reply.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div ref={editorRef} className="editor-wrapper"></div>

      {showCommentModal && (
        <div className="modal-overlay" onClick={() => setShowCommentModal(false)}>
          <div className="modal comment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💬 添加评论</h3>
              <button className="modal-close" onClick={() => setShowCommentModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-info">
                <span className="info-label">文件:</span>
                <span className="info-value">{file.name}</span>
                <span className="info-label">行号:</span>
                <span className="info-value highlight">第 {commentLine} 行</span>
              </div>
              <textarea
                className="comment-textarea"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="输入您的评论内容..."
                rows={4}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSubmitComment();
                  }
                }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCommentModal(false)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitComment}
                disabled={!commentContent.trim()}
              >
                发表评论 (Ctrl+Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {showProposalModal && (
        <div className="modal-overlay" onClick={() => setShowProposalModal(false)}>
          <div className="modal proposal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ 提议修改</h3>
              <button className="modal-close" onClick={() => setShowProposalModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-info">
                <span className="info-label">范围:</span>
                <span className="info-value highlight">
                  第 {proposalRange.start} - {proposalRange.end} 行
                </span>
              </div>
              <div className="diff-compare">
                <div className="diff-column">
                  <div className="diff-label original">原代码</div>
                  <pre className="diff-code original-code">{proposalRange.originalCode}</pre>
                </div>
                <div className="diff-arrow">→</div>
                <div className="diff-column">
                  <div className="diff-label proposed">修改后</div>
                  <textarea
                    className="diff-code proposed-input"
                    value={proposedCode}
                    onChange={(e) => setProposedCode(e.target.value)}
                    placeholder="输入修改后的代码..."
                    rows={Math.max(6, proposalRange.originalCode.split('\n').length + 1)}
                  />
                </div>
              </div>
              <div className="form-row">
                <label className="field-label">修改说明</label>
                <textarea
                  className="description-textarea"
                  value={proposalDescription}
                  onChange={(e) => setProposalDescription(e.target.value)}
                  placeholder="描述您的修改意图和原因..."
                  rows={2}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowProposalModal(false)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitProposal}
                disabled={!proposalDescription.trim()}
              >
                提交提案
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

class RemoteCursorWidget {
  dom: HTMLSpanElement;
  constructor(color: string, name: string) {
    this.dom = document.createElement('span');
    this.dom.className = 'remote-cursor';
    this.dom.setAttribute('aria-hidden', 'true');

    const cursor = document.createElement('div');
    cursor.className = 'remote-cursor-line';
    cursor.style.backgroundColor = color;

    const label = document.createElement('div');
    label.className = 'remote-cursor-label';
    label.style.backgroundColor = color;
    label.textContent = name;

    this.dom.appendChild(cursor);
    this.dom.appendChild(label);
  }
  eq() { return true; }
  updateDOM() { return false; }
  ignoreEvent() { return true; }
  coordsAt() { return null; }
}

export default EditorPanel;
