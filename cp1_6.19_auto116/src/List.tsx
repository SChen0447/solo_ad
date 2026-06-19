import React, { useEffect, useState, useMemo } from 'react';
import hljs from 'highlight.js';
import { Snippet } from './Storage';
import { LANGUAGES, LANG_COLORS } from './Editor';

interface ListProps {
  snippets: Snippet[];
  onSelect: (hash: string) => void;
}

const FILTER_ALL = '__all__';

const containerStyle: React.CSSProperties = {
  animation: 'fadeSlideUp 0.5s ease forwards',
};

const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginBottom: '24px',
};

const filterTagBase: React.CSSProperties = {
  padding: '6px 16px',
  borderRadius: '20px',
  fontSize: '13px',
  cursor: 'pointer',
  border: '1px solid #45475a',
  background: '#2a2a3e',
  color: '#a6adc8',
  transition: 'all 0.3s ease',
  userSelect: 'none',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
  gap: '20px',
};

const cardStyle: React.CSSProperties = {
  background: '#2a2a3e',
  borderRadius: '12px',
  overflow: 'hidden',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
};

const cardHoverStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
};

const codePreviewStyle: React.CSSProperties = {
  padding: '14px 16px',
  background: '#1e1e2e',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '12px',
  lineHeight: '1.5',
  color: '#cdd6f4',
  maxHeight: '180px',
  overflow: 'hidden',
  position: 'relative',
};

const codePreviewOverlay: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '48px',
  background: 'linear-gradient(transparent, #1e1e2e)',
};

const cardFooterStyle: React.CSSProperties = {
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderTop: '1px solid #3a3a5c',
};

const langBadgeStyle = (lang: string): React.CSSProperties => ({
  padding: '3px 10px',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: 600,
  background: LANG_COLORS[lang] ? `${LANG_COLORS[lang]}22` : '#cba6f722',
  color: LANG_COLORS[lang] || '#cba6f7',
  border: `1px solid ${LANG_COLORS[lang] || '#cba6f7'}44`,
});

const timeStyle: React.CSSProperties = {
  color: '#585b70',
  fontSize: '12px',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getPreviewLines(code: string): string {
  return code.split('\n').slice(0, 10).join('\n');
}

function SnippetCard({ snippet, index, onClick }: { snippet: Snippet; index: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 50);
    return () => clearTimeout(timer);
  }, [index]);

  const highlighted = useMemo(() => {
    const preview = getPreviewLines(snippet.code);
    try {
      return hljs.highlight(preview, { language: snippet.language }).value;
    } catch {
      return hljs.highlightAuto(preview).value;
    }
  }, [snippet.code, snippet.language]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardStyle,
        ...(hovered ? cardHoverStyle : {}),
        opacity: visible ? 1 : 0,
        transform: visible ? (hovered ? 'translateY(-2px)' : 'translateY(0)') : 'translateY(20px)',
        transition: 'opacity 0.4s ease, transform 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      <div style={codePreviewStyle}>
        <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', background: 'transparent', whiteSpace: 'pre' }}>
          <code className={`hljs language-${snippet.language}`} dangerouslySetInnerHTML={{ __html: highlighted }} style={{ background: 'transparent', padding: 0, fontFamily: 'inherit' }} />
        </pre>
        <div style={codePreviewOverlay} />
      </div>
      <div style={cardFooterStyle}>
        <span style={langBadgeStyle(snippet.language)}>
          {LANGUAGES.find((l) => l.value === snippet.language)?.label || snippet.language}
        </span>
        <span style={timeStyle}>{formatTime(snippet.createdAt)}</span>
      </div>
    </div>
  );
}

export default function List({ snippets, onSelect }: ListProps) {
  const [filter, setFilter] = useState(FILTER_ALL);

  const uniqueLangs = useMemo(() => {
    const set = new Set(snippets.map((s) => s.language));
    return Array.from(set);
  }, [snippets]);

  const filtered = useMemo(() => {
    if (filter === FILTER_ALL) return snippets;
    return snippets.filter((s) => s.language === filter);
  }, [snippets, filter]);

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={filterBarStyle}>
        <span
          onClick={() => setFilter(FILTER_ALL)}
          style={{
            ...filterTagBase,
            background: filter === FILTER_ALL ? '#cba6f733' : '#2a2a3e',
            color: filter === FILTER_ALL ? '#cba6f7' : '#a6adc8',
            borderColor: filter === FILTER_ALL ? '#cba6f7' : '#45475a',
            transform: filter === FILTER_ALL ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          全部
        </span>
        {uniqueLangs.map((lang) => (
          <span
            key={lang}
            onClick={() => setFilter(lang)}
            style={{
              ...filterTagBase,
              background: filter === lang ? `${LANG_COLORS[lang] || '#cba6f7'}33` : '#2a2a3e',
              color: filter === lang ? (LANG_COLORS[lang] || '#cba6f7') : '#a6adc8',
              borderColor: filter === lang ? (LANG_COLORS[lang] || '#cba6f7') : '#45475a',
              transform: filter === lang ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {LANGUAGES.find((l) => l.value === lang)?.label || lang}
          </span>
        ))}
      </div>
      <div style={gridStyle}>
        {filtered.map((snippet, i) => (
          <SnippetCard key={snippet.id} snippet={snippet} index={i} onClick={() => onSelect(snippet.hash)} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#585b70', padding: '60px 0', fontSize: '15px' }}>
          暂无代码片段，快去创建一个吧 ✨
        </div>
      )}
    </div>
  );
}
