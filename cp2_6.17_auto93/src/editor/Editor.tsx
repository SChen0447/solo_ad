import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import CodeBlock from './CodeBlock';
import {
  getDocument,
  createDocument,
  updateDocument,
  DocumentData,
  SandboxResult,
  CodeBlockData,
} from '../sandbox/SandboxService';
import './Editor.css';

type BlockType = 'text' | 'code';

interface TextBlock {
  id: string;
  type: 'text';
  content: string;
}

interface CodeBlockItem {
  id: string;
  type: 'code';
  language: string;
  code: string;
  output: string;
  error?: string;
}

type Block = TextBlock | CodeBlockItem;

export default function Editor() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('无标题文档');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [documentId, setDocumentId] = useState<string | null>(docId || null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadDocument = async () => {
      setIsLoading(true);
      try {
        if (docId) {
          const doc = await getDocument(docId);
          setTitle(doc.title);
          setDocumentId(doc.id);
          const parsedBlocks = parseDocumentContent(doc);
          setBlocks(parsedBlocks);
        } else {
          setBlocks([
            { id: uuidv4(), type: 'text', content: '<p>开始编写你的文档...</p>' },
          ]);
        }
      } catch (err) {
        console.error('Failed to load document:', err);
        setBlocks([
          { id: uuidv4(), type: 'text', content: '<p>开始编写你的文档...</p>' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [docId]);

  const parseDocumentContent = (doc: DocumentData): Block[] => {
    const result: Block[] = [];
    let html = doc.content;
    const codeBlockMap = new Map<string, CodeBlockData>();
    doc.codeBlocks.forEach((cb) => codeBlockMap.set(cb.id, cb));

    const placeholderRegex = /<div class="code-block-placeholder" data-id="([^"]+)"><\/div>/g;
    let lastIndex = 0;
    let match;

    while ((match = placeholderRegex.exec(html)) !== null) {
      const beforeText = html.substring(lastIndex, match.index);
      if (beforeText.trim()) {
        result.push({
          id: uuidv4(),
          type: 'text',
          content: beforeText,
        });
      }

      const codeBlockId = match[1];
      const codeBlock = codeBlockMap.get(codeBlockId);
      if (codeBlock) {
        result.push({
          id: codeBlock.id,
          type: 'code',
          language: codeBlock.language,
          code: codeBlock.code,
          output: codeBlock.output,
          error: codeBlock.error,
        });
      }

      lastIndex = match.index + match[0].length;
    }

    const remainingText = html.substring(lastIndex);
    if (remainingText.trim()) {
      result.push({
        id: uuidv4(),
        type: 'text',
        content: remainingText,
      });
    }

    if (result.length === 0) {
      result.push({ id: uuidv4(), type: 'text', content: html || '<p><br></p>' });
    }

    return result;
  };

  const serializeDocument = (): { content: string; codeBlocks: CodeBlockData[] } => {
    let content = '';
    const codeBlocks: CodeBlockData[] = [];

    blocks.forEach((block) => {
      if (block.type === 'text') {
        content += block.content;
      } else {
        content += `<div class="code-block-placeholder" data-id="${block.id}"></div>`;
        codeBlocks.push({
          id: block.id,
          language: block.language,
          code: block.code,
          output: block.output,
          error: block.error,
        });
      }
    });

    return { content, codeBlocks };
  };

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const { content, codeBlocks } = serializeDocument();

      if (documentId) {
        await updateDocument(documentId, {
          title,
          content,
          codeBlocks,
        });
      } else {
        const newDoc = await createDocument({
          title,
          content,
          codeBlocks,
        });
        setDocumentId(newDoc.id);
        navigate(`/doc/${newDoc.id}`, { replace: true });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [blocks, title, documentId, isSaving, navigate]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertCodeBlock = useCallback(() => {
    const newCodeBlock: CodeBlockItem = {
      id: uuidv4(),
      type: 'code',
      language: 'javascript',
      code: '// 在这里编写代码\n',
      output: '',
    };

    const newTextBlock: TextBlock = {
      id: uuidv4(),
      type: 'text',
      content: '<p><br></p>',
    };

    setBlocks((prev) => {
      const newBlocks = [...prev];
      newBlocks.push(newCodeBlock);
      newBlocks.push(newTextBlock);
      return newBlocks;
    });
  }, []);

  const handleCodeChange = useCallback((id: string, code: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.type === 'code' && block.id === id
          ? { ...block, code }
          : block
      )
    );
  }, []);

  const handleLanguageChange = useCallback((id: string, language: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.type === 'code' && block.id === id
          ? { ...block, language }
          : block
      )
    );
  }, []);

  const handleRunResult = useCallback((id: string, result: SandboxResult) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.type === 'code' && block.id === id
          ? { ...block, output: result.output, error: result.error }
          : block
      )
    );
  }, []);

  const handleTextBlockInput = (blockId: string, e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    setBlocks((prev) =>
      prev.map((block) =>
        block.type === 'text' && block.id === blockId
          ? { ...block, content: html }
          : block
      )
    );
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
        <button className="back-button" onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <input
          type="text"
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入文档标题..."
        />
        <button
          className={`save-button ${saveSuccess ? 'success' : ''}`}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="save-spinner"></span>
          ) : saveSuccess ? (
            '✓ 已保存'
          ) : (
            '保存'
          )}
        </button>
      </div>

      <div className="toolbar">
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => execCommand('bold')} title="粗体">
            <strong>B</strong>
          </button>
          <button className="toolbar-btn" onClick={() => execCommand('italic')} title="斜体">
            <em>I</em>
          </button>
          <button
            className="toolbar-btn"
            onClick={() => execCommand('underline')}
            title="下划线"
          >
            <u>U</u>
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
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
            onClick={() => execCommand('formatBlock', 'p')}
            title="正文"
          >
            P
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
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

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button className="insert-code-btn" onClick={insertCodeBlock} title="插入代码块">
            <span className="code-icon">{'{ }'}</span>
            插入代码块
          </button>
        </div>
      </div>

      <div className="editor-content" ref={editorRef}>
        {blocks.map((block) => (
          <div key={block.id} className="block-wrapper">
            {block.type === 'text' ? (
              <div
                className="text-block"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => handleTextBlockInput(block.id, e)}
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            ) : (
              <CodeBlock
                id={block.id}
                language={block.language}
                initialCode={block.code}
                initialOutput={block.output}
                initialError={block.error}
                onCodeChange={handleCodeChange}
                onLanguageChange={handleLanguageChange}
                onRunResult={handleRunResult}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
