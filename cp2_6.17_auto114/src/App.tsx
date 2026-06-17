import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Share2, Check, Columns, ListFilter, ChevronsLeftRight } from 'lucide-react';
import DiffEditor from './components/DiffEditor';
import { computeDiff, DiffLine } from './utils/diffEngine';

type ViewMode = 'side-by-side' | 'unified';
type Language = 'javascript' | 'typescript' | 'python' | 'html' | 'css' | 'java' | 'json';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'java', label: 'Java' },
  { value: 'json', label: 'JSON' },
];

const DEFAULT_ORIGINAL = `function greet(name) {
  console.log("Hello, " + name);
  return true;
}

const users = ["Alice", "Bob"];
for (let i = 0; i < users.length; i++) {
  greet(users[i]);
}`;

const DEFAULT_MODIFIED = `function greet(name, greeting = "Hello") {
  console.log(greeting + ", " + name + "!");
  return { name, greeting };
}

const users = ["Alice", "Bob", "Charlie"];
for (const user of users) {
  greet(user, "Hi");
}`;

interface ShareData {
  original: string;
  modified: string;
  language: Language;
  timestamp: number;
}

function generateShareId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function loadFromShare(shareId: string): ShareData | null {
  try {
    const raw = localStorage.getItem(`share_${shareId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ShareData;
  } catch {
    return null;
  }
}

function saveToShare(data: ShareData): string {
  let id = generateShareId();
  while (localStorage.getItem(`share_${id}`) !== null) {
    id = generateShareId();
  }
  localStorage.setItem(`share_${id}`, JSON.stringify(data));
  return id;
}

function getUrlShareId(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('share');
}

function updateUrlShareId(id: string | null) {
  const url = new URL(window.location.href);
  if (id === null) {
    url.searchParams.delete('share');
  } else {
    url.searchParams.set('share', id);
  }
  window.history.replaceState({}, '', url.toString());
}

export default function App() {
  const [originalCode, setOriginalCode] = useState<string>(DEFAULT_ORIGINAL);
  const [modifiedCode, setModifiedCode] = useState<string>(DEFAULT_MODIFIED);
  const [language, setLanguage] = useState<Language>('javascript');
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [langDropdownOpen, setLangDropdownOpen] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const diffResult: DiffLine[] = useMemo(() => {
    return computeDiff(originalCode, modifiedCode);
  }, [originalCode, modifiedCode]);

  useEffect(() => {
    const shareId = getUrlShareId();
    if (shareId) {
      const data = loadFromShare(shareId);
      if (data) {
        setOriginalCode(data.original);
        setModifiedCode(data.modified);
        setLanguage(data.language);
      } else {
        showToast('分享链接无效或已过期');
        updateUrlShareId(null);
      }
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2000);
  }, []);

  const handleShare = useCallback(async () => {
    const id = saveToShare({
      original: originalCode,
      modified: modifiedCode,
      language,
      timestamp: Date.now(),
    });
    updateUrlShareId(id);
    setShareSuccess(true);
    try {
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${id}`;
      await navigator.clipboard.writeText(shareUrl);
      showToast('分享链接已复制到剪贴板');
    } catch {
      showToast(`分享ID: ${id}（链接已生成）`);
    }
    window.setTimeout(() => setShareSuccess(false), 500);
  }, [originalCode, modifiedCode, language, showToast]);

  const toggleViewMode = useCallback(() => {
    setViewMode(m => (m === 'side-by-side' ? 'unified' : 'side-by-side'));
  }, []);

  const selectLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    setLangDropdownOpen(false);
  }, []);

  return (
    <div className="app-root">
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="app-logo">
            <ChevronsLeftRight size={20} />
            <span className="app-title">CodeDiff</span>
          </div>
        </div>
        <div className="toolbar-center">
          <div className="view-toggle">
            <button
              className={`view-btn${viewMode === 'side-by-side' ? ' active' : ''}`}
              onClick={toggleViewMode}
              title="并排视图"
            >
              <Columns size={16} />
              <span>并排视图</span>
            </button>
            <button
              className={`view-btn${viewMode === 'unified' ? ' active' : ''}`}
              onClick={toggleViewMode}
              title="统一视图"
            >
              <ListFilter size={16} />
              <span>统一视图</span>
            </button>
          </div>
          <div
            className="lang-select-wrapper"
            onMouseLeave={() => setLangDropdownOpen(false)}
          >
            <button
              className="lang-select-btn"
              onClick={() => setLangDropdownOpen(v => !v)}
            >
              {LANGUAGES.find(l => l.value === language)?.label ?? 'JavaScript'}
              <svg width="12" height="12" viewBox="0 0 12 12" className="caret">
                <path d="M3 4.5L6 7.5L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {langDropdownOpen && (
              <div className="lang-dropdown">
                {LANGUAGES.map(lang => (
                  <div
                    key={lang.value}
                    className={`lang-option${lang.value === language ? ' selected' : ''}`}
                    onClick={() => selectLanguage(lang.value)}
                  >
                    {lang.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="toolbar-right">
          <button
            className={`share-btn${shareSuccess ? ' success' : ''}`}
            onClick={handleShare}
            title="生成分享链接"
          >
            {shareSuccess ? <Check size={16} /> : <Share2 size={16} />}
            <span>{shareSuccess ? '已分享' : '分享'}</span>
          </button>
        </div>
      </div>

      <div className="app-main">
        <DiffEditor
          originalCode={originalCode}
          modifiedCode={modifiedCode}
          onOriginalChange={setOriginalCode}
          onModifiedChange={setModifiedCode}
          diffResult={diffResult}
          viewMode={viewMode}
          language={language}
        />
      </div>

      <div className={`toast${toastVisible ? ' show' : ''}`}>
        <div className="toast-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M16.6667 5L7.5 14.1667L3.33333 10"
              stroke="#28a745"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="toast-text">{toastMessage}</span>
      </div>
    </div>
  );
}
