import { useState, useRef, useEffect } from 'react';

interface AnnotationFormProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function AnnotationForm({
  onSubmit,
  placeholder = '添加评论...',
  autoFocus = false,
}: AnnotationFormProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={styles.form}>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={styles.textarea}
        rows={2}
      />
      <div style={styles.footer}>
        <span style={styles.hint}>Ctrl+Enter 提交</span>
        <button
          onClick={handleSubmit}
          disabled={content.trim().length === 0}
          style={{
            ...styles.button,
            opacity: content.trim().length === 0 ? 0.5 : 1,
            cursor: content.trim().length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          提交评论
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    padding: '12px 16px',
    borderTop: '1px solid #f0f0f0',
    backgroundColor: '#fafbfc',
    borderRadius: '0 0 5px 5px',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    fontSize: '13px',
    lineHeight: 1.5,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    color: '#212529',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.2s ease',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  hint: {
    fontSize: '11px',
    color: '#adb5bd',
  },
  button: {
    padding: '5px 14px',
    backgroundColor: '#007bff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'background-color 0.15s ease, opacity 0.15s ease',
  },
};
