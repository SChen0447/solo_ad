import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CodeBlock } from './CodeBlock';
import { CodeBlockData, DocumentData, Language } from '../types';
import { SandboxService } from '../sandbox/SandboxService';
import './Editor.css';

interface EditorProps {
  documentId: string;
  onBack: () => void;
}

const CODE_BLOCK_MARKER = '<!-- CODE_BLOCK_ID: ';
const CODE_BLOCK_MARKER_END = ' -->';

export const Editor: React.FC<EditorProps> = ({ documentId, onBack }) => {
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setIsLoading(true);
        const loadedDoc = await SandboxService.getDocument(documentId);
        setDoc(loadedDoc);
        setTitle(loadedDoc.title);
      } catch (err) {
        const newDoc = await SandboxService.createDocument('新文档');
        setDoc(newDoc);
        setTitle(newDoc.title);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  const handleContentChange = useCallback(() => {
    if (!editorRef.current || !doc) return;
    const content = editorRef.current.innerHTML;
    setDoc((prev) => (prev ? { ...prev, content } : null));
  }, [doc]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const insertCodeBlock = () => {
    if (!editorRef.current || !doc) return;

    const newBlockId = uuidv4();
    const newBlock: CodeBlockData = {
      id: newBlockId,
      language: 'javascript' as Language,
      code: '// 在这里编写代码\nconsole.log("Hello, World!");',
      output: '',
      error: undefined,
      executionTime: undefined
    };

    const marker = `${CODE_BLOCK_MARKER}${newBlockId}${CODE_BLOCK_MARKER_END}`;
    const markerElement = window.document.createElement('div');
    markerElement.id = `code-block-marker-${newBlockId}`;
    markerElement.setAttribute('data-code-block-id', newBlockId);
    markerElement.innerHTML = marker;
    markerElement.style.display = 'none';

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(markerElement);

      const br = window.document.createElement('br');
      markerElement.after(br);

      range.setStartAfter(br);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorRef.current.appendChild(markerElement);
    }

    const content = editorRef.current.innerHTML;
    setDoc((prev) =>
      prev
        ? {
            ...prev,
            content,
            codeBlocks: [...prev.codeBlocks, newBlock]
          }
        : null
    );
  };

  const updateCodeBlock = (blockId: string, updates: Partial<CodeBlockData>) => {
    if (!doc) return;

    setDoc((prev) => {
      if (!prev) return null;

      return {
        ...prev,
        codeBlocks: prev.codeBlocks.map((block) =>
          block.id === blockId ? { ...block, ...updates } : block
        )
      };
    });
  };

  const deleteCodeBlock = (blockId: string) => {
    if (!doc) return;

    const marker = `${CODE_BLOCK_MARKER}${blockId}${CODE_BLOCK_MARKER_END}`;
    if (editorRef.current) {
      editorRef.current.innerHTML = editorRef.current.innerHTML.replace(
        new RegExp(`<div[^>]*data-code-block-id="${blockId}"[^>]*>.*?</div>`, 'gi'),
        ''
      );
      editorRef.current.innerHTML = editorRef.current.innerHTML.replace(marker, '');
    }

    setDoc((prev) => {
      if (!prev) return null;

      return {
        ...prev,
        content: prev.content.replace(new RegExp(marker, 'g'), ''),
        codeBlocks: prev.codeBlocks.filter((block) => block.id !== blockId)
      };
    });
  };

  const handleSave = async () => {
    if (!doc) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await SandboxService.saveDocument(doc.id, {
        title,
        content: editorRef.current?.innerHTML || '',
        codeBlocks: doc.codeBlocks
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const execCommand = (command: string, value?: string) => {
    window.document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  if (isLoading) {
    return (
      <div className="editor-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-header">
        <button className="back-button" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <input
          type="text"
          className="document-title"
          value={title}
          onChange={handleTitleChange}
          placeholder="输入文档标题..."
        />
        <button
          className={`save-button ${isSaving ? 'saving' : ''} ${saveSuccess ? 'success' : ''}`}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <span className="spinner-small"></span>
              保存中...
            </>
          ) : saveSuccess ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              已保存
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <path d="M17 21v-8H7v8M7 3v5h8" />
              </svg>
              保存
            </>
          )}
        </button>
      </div>

      <div className="editor-toolbar">
        <button
          className="toolbar-button insert-code-button"
          onClick={insertCodeBlock}
          title="插入代码块"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
          </svg>
          插入代码块
        </button>
        <div className="toolbar-divider"></div>
        <button
          className="toolbar-button"
          onClick={() => execCommand('bold')}
          title="粗体"
        >
          <strong>B</strong>
        </button>
        <button
          className="toolbar-button"
          onClick={() => execCommand('italic')}
          title="斜体"
        >
          <em>I</em>
        </button>
        <button
          className="toolbar-button"
          onClick={() => execCommand('underline')}
          title="下划线"
        >
          <u>U</u>
        </button>
        <div className="toolbar-divider"></div>
        <button
          className="toolbar-button"
          onClick={() => execCommand('formatBlock', 'h1')}
          title="标题1"
        >
          H1
        </button>
        <button
          className="toolbar-button"
          onClick={() => execCommand('formatBlock', 'h2')}
          title="标题2"
        >
          H2
        </button>
        <button
          className="toolbar-button"
          onClick={() => execCommand('formatBlock', 'h3')}
          title="标题3"
        >
          H3
        </button>
        <div className="toolbar-divider"></div>
        <button
          className="toolbar-button"
          onClick={() => execCommand('insertUnorderedList')}
          title="无序列表"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1" fill="currentColor" />
            <circle cx="4" cy="12" r="1" fill="currentColor" />
            <circle cx="4" cy="18" r="1" fill="currentColor" />
          </svg>
        </button>
        <button
          className="toolbar-button"
          onClick={() => execCommand('insertOrderedList')}
          title="有序列表"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <text x="3" y="8" fontSize="10" fill="currentColor">1</text>
            <text x="3" y="14" fontSize="10" fill="currentColor">2</text>
            <text x="3" y="20" fontSize="10" fill="currentColor">3</text>
          </svg>
        </button>
      </div>

      <div className="editor-content-wrapper">
        <div
          ref={editorRef}
          className="editor-content"
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentChange}
          onBlur={handleContentChange}
          dangerouslySetInnerHTML={{
            __html: doc?.content.replace(
              new RegExp(`${CODE_BLOCK_MARKER}[^>]+${CODE_BLOCK_MARKER_END}`, 'g'),
              ''
            ) || ''
          }}
        />
        <div className="code-blocks-container">
          {doc && doc.codeBlocks.map((block) => (
            <CodeBlock
              key={block.id}
              block={block}
              onUpdate={(updates) => updateCodeBlock(block.id, updates)}
              onDelete={() => deleteCodeBlock(block.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
