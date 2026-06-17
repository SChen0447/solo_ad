import React from 'react';
import type { SupportedLanguage, LanguageOption } from '@/types';

const LANGUAGES: LanguageOption[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
];

interface ToolbarProps {
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onCopyLeft: () => void;
  onCopyRight: () => void;
  onCopyMerged: () => void;
}

const Toolbar = React.memo(function Toolbar({
  language,
  onLanguageChange,
  onCopyLeft,
  onCopyRight,
  onCopyMerged,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <select
          className="language-select"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
      <div className="toolbar-right">
        <button className="toolbar-btn" onClick={onCopyLeft}>
          <span className="btn-icon">←</span>
          <span className="btn-text">复制左版</span>
        </button>
        <button className="toolbar-btn" onClick={onCopyRight}>
          <span className="btn-icon">→</span>
          <span className="btn-text">复制右版</span>
        </button>
        <button className="toolbar-btn" onClick={onCopyMerged}>
          <span className="btn-icon">↔</span>
          <span className="btn-text">复制合并版</span>
        </button>
      </div>
    </header>
  );
});

export default Toolbar;
