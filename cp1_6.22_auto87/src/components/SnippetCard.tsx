import { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-json';
import type { Snippet } from '../data/snippets';
import {
  LANGUAGE_COLORS,
  LANGUAGE_PRISM_MAP,
  hashStringToColor,
  hashStringToTextColor,
} from '../data/snippets';

interface SnippetCardProps {
  snippet: Snippet;
  searchKeyword?: string;
  onShare: () => void;
}

function highlightText(text: string, keyword: string) {
  if (!keyword.trim()) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>
  );
}

export default function SnippetCard({ snippet, searchKeyword = '', onShare }: SnippetCardProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  const langColor = LANGUAGE_COLORS[snippet.language];
  const prismLang = LANGUAGE_PRISM_MAP[snippet.language];

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [snippet.code, snippet.language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = snippet.code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="snippet-card" style={{ ['--lang-color' as string]: langColor }}>
      <div className="card-color-bar" />
      <div className="card-content">
        <div className="card-header">
          <div className="card-lang-badge" style={{ backgroundColor: `${langColor}20`, color: langColor }}>
            {snippet.language.toUpperCase()}
          </div>
          <button
            className="icon-btn share-btn"
            onClick={onShare}
            title="分享链接"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>

        <h3 className="card-title">
          {highlightText(snippet.title, searchKeyword)}
        </h3>

        <p className="card-description">
          {highlightText(snippet.description, searchKeyword)}
        </p>

        <div className="card-code-wrapper">
          <pre className={`language-${prismLang}`}>
            <code ref={codeRef} className={`language-${prismLang}`}>
              {snippet.code}
            </code>
          </pre>
        </div>

        <div className="card-footer">
          <div className="card-tags">
            {snippet.tags.map(tag => (
              <span
                key={tag}
                className="card-tag"
                style={{
                  backgroundColor: hashStringToColor(tag),
                  color: hashStringToTextColor(tag),
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <button
            className={`icon-btn copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="复制代码"
          >
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#38a169' }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .snippet-card {
          width: 320px;
          border-radius: 12px;
          background: #f7fafc;
          box-shadow: rgba(0, 0, 0, 0.08) 0px 2px 8px;
          display: flex;
          flex-direction: row;
          overflow: hidden;
          transition: transform 0.25s ease-out, box-shadow 0.25s ease-out;
          position: relative;
        }

        .snippet-card:hover {
          transform: translateY(-5px);
          box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.12);
        }

        .card-color-bar {
          width: 2px;
          min-width: 2px;
          background: var(--lang-color);
          transition: background 0.25s ease-out;
        }

        .snippet-card:hover .card-color-bar {
          background: linear-gradient(180deg, var(--lang-color), var(--lang-color));
          width: 2px;
        }

        .card-content {
          flex: 1;
          padding: 16px;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .card-lang-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 12px;
          letter-spacing: 0.5px;
        }

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 6px;
          line-height: 1.4;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
        }

        .card-description {
          font-size: 13px;
          color: #4a5568;
          line-height: 1.5;
          margin-bottom: 12px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .card-code-wrapper {
          margin-bottom: 12px;
          border-radius: 8px;
          overflow: hidden;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
          gap: 8px;
        }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }

        .card-tag {
          font-size: 11px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 12px;
          white-space: nowrap;
          transition: opacity 0.15s;
        }

        .card-tag:hover {
          opacity: 0.8;
        }

        .icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: #4a5568;
          transition: background-color 0.15s, transform 0.1s;
          flex-shrink: 0;
        }

        .icon-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .icon-btn:active {
          transform: scale(0.95);
        }

        .copy-btn.copied {
          background: rgba(56, 161, 105, 0.1);
        }
      `}</style>
    </div>
  );
}
