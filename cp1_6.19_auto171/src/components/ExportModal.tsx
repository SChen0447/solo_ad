import { useState } from 'react';
import { paramSerializer } from '@/utils/ParamSerializer';
import './ExportModal.css';

interface ExportModalProps {
  cssCode: string;
  onClose: () => void;
}

export function ExportModal({ cssCode, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await paramSerializer.copyToClipboard(cssCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 300);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">导出 CSS 代码</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <pre className="code-block">
            <code>{cssCode}</code>
          </pre>
        </div>
        <div className="modal-footer">
          <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
            {copied ? '✓ 已复制' : '📋 复制代码'}
          </button>
        </div>
        {copied && <div className="toast">复制成功!</div>}
      </div>
    </div>
  );
}
