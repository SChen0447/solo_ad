import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { parseMarkdown } from '../utils/export';

interface EditorPanelProps {
  onHtmlChange: (html: string) => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = React.memo(({ onHtmlChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { currentDraftId, updateContent, getCurrentDraft } = useEditorStore();
  const currentDraft = getCurrentDraft();
  const content = currentDraft?.content || '';
  const cursorPosition = currentDraft?.cursorPosition || 0;

  const lineNumbers = useMemo(() => {
    const lines = content.split('\n').length;
    return Array.from({ length: lines }, (_, i) => i + 1);
  }, [content]);

  const html = useMemo(() => {
    if (!content.trim()) return '';
    return parseMarkdown(content);
  }, [content]);

  useEffect(() => {
    onHtmlChange(html);
  }, [html, onHtmlChange]);

  useEffect(() => {
    if (textareaRef.current && cursorPosition >= 0) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [currentDraftId, cursorPosition]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newCursorPosition = e.target.selectionStart;
    updateContent(newContent, newCursorPosition);
  }, [updateContent]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const lineNumbersEl = e.currentTarget.parentElement?.querySelector('.line-numbers');
    if (lineNumbersEl) {
      lineNumbersEl.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  return (
    <div className="editor-panel flex h-full bg-white overflow-hidden">
      <div className="line-numbers bg-white border-r border-[#f0f0f0] w-[40px] flex-shrink-0 overflow-hidden text-right py-4 px-2 select-none">
        {lineNumbers.map((num) => (
          <div
            key={num}
            className="text-[#999] text-[0.95rem] leading-[1.6] font-[Fira_Code,Consolas,Monaco,monospace]"
          >
            {num}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleInput}
        onScroll={handleScroll}
        className="flex-1 p-4 outline-none resize-none bg-white text-[#2c3e50] text-[0.95rem] leading-[1.6] font-[Fira_Code,Consolas,Monaco,monospace] whitespace-pre-wrap break-words"
        placeholder="开始写作...\n\n支持 Markdown 语法：\n# 标题\n**粗体** *斜体* ~~删除线~~\n- 无序列表\n1. 有序列表\n`代码`\n```\n代码块\n```\n> 引用\n--- 分隔线\n![图片](url)"
        spellCheck={false}
      />
    </div>
  );
});

EditorPanel.displayName = 'EditorPanel';
