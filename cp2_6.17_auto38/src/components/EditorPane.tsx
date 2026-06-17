import React, { forwardRef } from 'react';

interface EditorPaneProps {
  title: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onScroll?: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}

const EditorPane = forwardRef<HTMLTextAreaElement, EditorPaneProps>(
  function EditorPane(
    { title, value, onChange, onScroll, placeholder },
    ref
  ) {
    return (
      <div className="editor-pane">
        <div className="pane-header">{title}</div>
        <textarea
          ref={ref}
          className="code-textarea"
          value={value}
          onChange={onChange}
          onScroll={onScroll}
          placeholder={placeholder}
          spellCheck={false}
        />
      </div>
    );
  }
);

export default EditorPane;
