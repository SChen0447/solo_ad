import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp, Version, formatDate } from '../data/store';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdown(md: string, highlight?: string): string {
  let html = escapeHtml(md);
  const lines = html.split('\n');
  const output: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let inTable = false;
  let tableLines: string[] = [];

  const closeCodeBlock = () => {
    const numLines = codeLines.length;
    const maxWidth = String(numLines).length;
    const lineNumbersHtml = Array.from({ length: numLines }, (_, i) => {
      return `<span class="md-lineno" style="display:block;text-align:right;padding-right:12px;color:#64748B;user-select:none;min-width:${maxWidth * 8 + 12}px;border-right:1px solid rgba(255,255,255,0.1);">${i + 1}</span>`;
    }).join('');
    const codeHtml = codeLines
      .map((l) => `<span style="display:block;padding-left:12px;">${l || '&nbsp;'}</span>`)
      .join('');
    output.push(
      `<pre class="md-codeblock" style="background:#1E293B;color:#E2E8F0;border-radius:8px;padding:16px 0;margin:16px 0;overflow-x:auto;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.6;"><div class="md-code-inner" style="display:flex;"><div style="flex-shrink:0;">${lineNumbersHtml}</div><div style="flex:1;overflow-x:auto;">${codeHtml}</div></div></pre>`
    );
    codeLines = [];
    inCodeBlock = false;
  };

  const closeTable = () => {
    if (tableLines.length < 2) {
      output.push(...tableLines);
    } else {
      const [header, sep, ...bodyRows] = tableLines;
      const headerCells = header
        .split('|')
        .map((c) => c.trim())
        .filter((_, i, arr) => i > 0 && i < arr.length - 1 || (i === 0 && c !== '') || (i === arr.length - 1 && c !== ''));
      const hAligns = sep
        .split('|')
        .map((c) => c.trim())
        .filter((_, i, arr) => i > 0 && i < arr.length - 1 || (i === 0 && c !== '') || (i === arr.length - 1 && c !== ''))
        .map((c) => {
          if (c.startsWith(':') && c.endsWith(':')) return 'center';
          if (c.endsWith(':')) return 'right';
          return 'left';
        });

      const styleText = (s: string) => {
        return s
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;">$1</code>');
      };

      let tableHtml = '<div style="overflow-x:auto;margin:16px 0;"><table style="width:100%;border-collapse:collapse;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;font-size:14px;">';
      tableHtml += '<thead><tr style="background:#F1F5F9;">';
      headerCells.forEach((cell, i) => {
        tableHtml += `<th style="padding:10px 14px;text-align:${hAligns[i] || 'left'};font-weight:600;color:#0F172A;border-bottom:1px solid #E2E8F0;">${styleText(cell)}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';
      bodyRows.forEach((row, ri) => {
        const cells = row
          .split('|')
          .map((c) => c.trim())
          .filter((_, i, arr) => i > 0 && i < arr.length - 1 || (i === 0 && c !== '') || (i === arr.length - 1 && c !== ''));
        tableHtml += `<tr style="${ri % 2 === 0 ? 'background:#FFFFFF;' : 'background:#F8FAFC;'}">`;
        cells.forEach((cell, i) => {
          tableHtml += `<td style="padding:10px 14px;text-align:${hAligns[i] || 'left'};color:#475569;border-bottom:1px solid #F1F5F9;">${styleText(cell)}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      output.push(tableHtml);
    }
    tableLines = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        closeCodeBlock();
      } else {
        if (inTable) closeTable();
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (trimmed.includes('|') && (trimmed.startsWith('|') || line.match(/^\s*[^|]+\|/))) {
      if (!inTable) {
        inTable = true;
        tableLines = [trimmed];
      } else {
        tableLines.push(trimmed);
      }
      continue;
    } else if (inTable) {
      closeTable();
    }

    const hlRegex = highlight ? new RegExp(`(${escapeHtml(highlight)})`, 'gi') : null;
    const applyHl = (s: string) => {
      if (!hlRegex) return s;
      return s.replace(hlRegex, '<mark style="background-color:#FEF3C7;color:#92400E;border-radius:2px;padding:0 2px;">$1</mark>');
    };

    const styleInline = (text: string) => {
      let t = text;
      t = t.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;" />');
      t = t.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#2563EB;text-decoration:underline;">$1</a>');
      t = t.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;">$1</strong>');
      t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
      t = t.replace(/`([^`]+)`/g, '<code style="background:#F1F5F9;color:#BE123C;padding:2px 6px;border-radius:4px;font-family:\'SF Mono\',Menlo,monospace;font-size:0.9em;">$1</code>');
      return applyHl(t);
    };

    if (trimmed === '') {
      output.push('');
      continue;
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      const level = (trimmed.match(/^#+/) as RegExpMatchArray)[0].length;
      const sizes = ['28px', '22px', '18px', '16px', '15px', '14px'];
      const colors = ['#0F172A', '#0F172A', '#1E293B', '#1E293B', '#334155', '#334155'];
      output.push(
        `<h${level} style="font-size:${sizes[level - 1]};font-weight:600;color:${colors[level - 1]};margin:${level === 1 ? '32px 0 20px' : '24px 0 12px'};line-height:1.3;${level === 1 ? 'padding-bottom:12px;border-bottom:1px solid #F1F5F9;' : ''}">${styleInline(trimmed.replace(/^#{1,6}\s/, ''))}</h${level}>`
      );
      continue;
    }

    if (trimmed.startsWith('>')) {
      output.push(
        `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #2563EB;background:#EFF6FF;border-radius:0 8px 8px 0;color:#475569;font-style:italic;">${styleInline(trimmed.replace(/^>\s?/, ''))}</blockquote>`
      );
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      output.push(
        `<li style="margin-left:8px;padding:4px 0;color:#475569;line-height:1.7;">${styleInline(trimmed.replace(/^\d+\.\s/, ''))}</li>`
      );
      continue;
    }

    if (/^[-*+]\s/.test(trimmed)) {
      output.push(
        `<li style="margin-left:8px;padding:4px 0;color:#475569;line-height:1.7;list-style:none;position:relative;padding-left:18px;"><span style="position:absolute;left:0;top:11px;width:5px;height:5px;background:#94A3B8;border-radius:50%;"></span>${styleInline(trimmed.replace(/^[-*+]\s/, ''))}</li>`
      );
      continue;
    }

    output.push(`<p style="margin:12px 0;color:#334155;font-size:15px;line-height:1.75;">${styleInline(trimmed)}</p>`);
  }

  if (inCodeBlock) closeCodeBlock();
  if (inTable) closeTable();

  const listWrapped: string[] = [];
  let inList = false;
  output.forEach((line) => {
    if (line.startsWith('<li')) {
      if (!inList) {
        listWrapped.push('<ul style="margin:12px 0;padding:0;">');
        inList = true;
      }
      listWrapped.push(line);
    } else {
      if (inList) {
        listWrapped.push('</ul>');
        inList = false;
      }
      listWrapped.push(line);
    }
  });
  if (inList) listWrapped.push('</ul>');

  return listWrapped.join('\n');
}

function DiffView({
  oldVer,
  newVer,
  onClose,
}: {
  oldVer: Version;
  newVer: Version;
  onClose: () => void;
}) {
  const oldLines = oldVer.content.split('\n');
  const newLines = newVer.content.split('\n');

  const { left, right } = useMemo(() => {
    const setOld = new Set(oldLines);
    const setNew = new Set(newLines);
    const maxLen = Math.max(oldLines.length, newLines.length);
    const l: { text: string; type: 'same' | 'removed' | 'empty' }[] = [];
    const r: { text: string; type: 'same' | 'added' | 'empty' }[] = [];

    let oi = 0,
      ni = 0;
    while (oi < oldLines.length || ni < newLines.length) {
      if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
        l.push({ text: oldLines[oi], type: 'same' });
        r.push({ text: newLines[ni], type: 'same' });
        oi++;
        ni++;
      } else if (oi < oldLines.length && !setNew.has(oldLines[oi])) {
        l.push({ text: oldLines[oi], type: 'removed' });
        r.push({ text: '', type: 'empty' });
        oi++;
      } else if (ni < newLines.length && !setOld.has(newLines[ni])) {
        l.push({ text: '', type: 'empty' });
        r.push({ text: newLines[ni], type: 'added' });
        ni++;
      } else {
        if (oi < oldLines.length) {
          l.push({ text: oldLines[oi], type: 'same' });
          oi++;
        }
        if (ni < newLines.length) {
          r.push({ text: newLines[ni], type: 'same' });
          ni++;
        }
      }
    }
    return { left: l, right: r };
  }, [oldVer.content, newVer.content]);

  const renderDiff = (text: string, type: 'same' | 'removed' | 'added' | 'empty') => {
    if (type === 'empty') return <span>&nbsp;</span>;
    const bgColor =
      type === 'removed' ? 'rgba(239, 68, 68, 0.10)' : type === 'added' ? 'rgba(16, 185, 129, 0.10)' : 'transparent';

    let styled = escapeHtml(text);
    if (type === 'removed') {
      styled = `<span style="text-decoration:line-through;color:#DC2626;">${styled}</span>`;
    } else if (type === 'added') {
      styled = `<span style="text-decoration:underline;text-decoration-color:#10B981;text-decoration-thickness:2px;color:#047857;">${styled}</span>`;
    }

    return (
      <div
        style={{
          padding: '4px 12px',
          background: bgColor,
          borderRadius: '2px',
          fontFamily: "'SF Mono', Menlo, monospace",
          fontSize: '13px',
          lineHeight: 1.6,
          minHeight: '21px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        dangerouslySetInnerHTML={{ __html: styled || '&nbsp;' }}
      />
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>
              版本对比
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
              {oldVer.version}（{oldVer.author.name}） → {newVer.version}（{newVer.author.name}）
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              background: '#F1F5F9',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E2E8F0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F1F5F9';
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0px',
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
          }}
        >
          <div style={{ borderRight: '1px solid #F1F5F9' }}>
            <div
              style={{
                padding: '12px 16px',
                background: '#FEF2F2',
                fontSize: '13px',
                fontWeight: 600,
                color: '#DC2626',
                position: 'sticky',
                top: 0,
                borderBottom: '1px solid #FECACA',
              }}
            >
              旧版本 · {oldVer.version}
            </div>
            <div style={{ padding: '8px 0' }}>
              {left.map((item, i) => (
                <div key={'ol' + i}>{renderDiff(item.text, item.type as 'same' | 'removed' | 'empty')}</div>
              ))}
            </div>
          </div>
          <div>
            <div
              style={{
                padding: '12px 16px',
                background: '#ECFDF5',
                fontSize: '13px',
                fontWeight: 600,
                color: '#047857',
                position: 'sticky',
                top: 0,
                borderBottom: '1px solid #A7F3D0',
              }}
            >
              新版本 · {newVer.version}
            </div>
            <div style={{ padding: '8px 0' }}>
              {right.map((item, i) => (
                <div key={'nr' + i}>{renderDiff(item.text, item.type as 'same' | 'added' | 'empty')}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingPanel({
  onSave,
  onHistory,
  onShare,
  saveState,
}: {
  onSave: () => void;
  onHistory: () => void;
  onShare: () => void;
  saveState: 'idle' | 'saving' | 'success';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setPos({
        x: Math.max(window.innerWidth - rect.width - 32, window.innerWidth - 220),
        y: 120,
      });
      initialized.current = true;
    }
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragging) return;
      const newX = Math.min(Math.max(e.clientX - dragOffset.current.x, 0), window.innerWidth - 180);
      const newY = Math.min(Math.max(e.clientY - dragOffset.current.y, 60), window.innerHeight - 60);
      setPos({ x: newX, y: newY });
    };
    const handleUp = () => setDragging(false);
    if (dragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging]);

  const btnStyle = (isActive: boolean) => ({
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: 'none',
    background: isActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: isActive ? '#2563EB' : '#475569',
    transition: 'all 0.15s',
    position: 'relative' as const,
  });

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 80,
        borderRadius: '8px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.12)',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          height: '16px',
          cursor: 'move',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '4px',
          borderRadius: '4px',
        }}
        onMouseDown={(e) => {
          if (!panelRef.current) return;
          const rect = panelRef.current.getBoundingClientRect();
          dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          setDragging(true);
        }}
      >
        <div
          style={{
            width: '32px',
            height: '3px',
            borderRadius: '2px',
            background: '#CBD5E1',
            opacity: 0.8,
          }}
        />
      </div>

      <button
        onClick={onSave}
        disabled={saveState !== 'idle'}
        style={{
          ...btnStyle(saveState === 'success'),
          ...(saveState !== 'idle' ? { cursor: 'default' } : {}),
        }}
        title="保存文档"
        onMouseEnter={(e) => {
          if (saveState === 'idle') e.currentTarget.style.background = 'rgba(37, 99, 235, 0.12)';
        }}
        onMouseLeave={(e) => {
          if (saveState === 'idle') e.currentTarget.style.background = 'transparent';
        }}
      >
        {saveState === 'saving' && (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <circle cx="12" cy="12" r="9" stroke="#2563EB" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {saveState === 'idle' && <span>💾</span>}
        {saveState === 'success' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13L9 17L19 7"
              stroke="#10B981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <button
        onClick={onHistory}
        style={btnStyle(false)}
        title="历史版本"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
          e.currentTarget.style.color = '#10B981';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#475569';
        }}
      >
        📜
      </button>

      <button
        onClick={onShare}
        style={btnStyle(false)}
        title="分享"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)';
          e.currentTarget.style.color = '#F59E0B';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#475569';
        }}
      >
        🔗
      </button>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function HistoryTimeline({
  versions,
  onClose,
  onCompare,
}: {
  versions: Version[];
  onClose: () => void;
  onCompare: (oldVer: Version, newVer: Version) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const sortedVersions = [...versions].reverse();

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.4)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '70vh',
          background: '#FFFFFF',
          borderRadius: '16px 16px 0 0',
          transform: mounted ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📜</span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F172A' }}>
              历史版本
            </h3>
            <span
              style={{
                fontSize: '12px',
                color: '#64748B',
                background: '#F1F5F9',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {versions.length} 个版本
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: '#F1F5F9',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#475569',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px' }}>
          {sortedVersions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>暂无历史版本</div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '8px',
                  bottom: '8px',
                  width: '2px',
                  background: 'linear-gradient(180deg, #E2E8F0, #F8FAFC)',
                }}
              />
              {sortedVersions.map((ver, idx) => (
                <div
                  key={ver.id}
                  style={{
                    position: 'relative',
                    marginBottom: idx === sortedVersions.length - 1 ? 0 : '16px',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '14px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: idx === 0 ? '#10B981' : '#FFFFFF',
                      border: `2px solid ${idx === 0 ? '#10B981' : '#CBD5E1'}`,
                      zIndex: 1,
                    }}
                  />
                  <div
                    style={{
                      background: idx === 0 ? 'rgba(16, 185, 129, 0.04)' : '#FFFFFF',
                      border: `1px solid ${idx === 0 ? 'rgba(16, 185, 129, 0.2)' : '#F1F5F9'}`,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: idx === 0 ? '#10B981' : '#0F172A',
                          }}
                        >
                          {ver.version}
                        </span>
                        {idx === 0 && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#10B981',
                              background: 'rgba(16, 185, 129, 0.12)',
                              padding: '2px 8px',
                              borderRadius: '999px',
                            }}
                          >
                            当前
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#64748B' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>{ver.author.avatar}</span>
                          {ver.author.name}
                        </span>
                        <span>·</span>
                        <span>{formatDate(ver.modifiedAt)}</span>
                      </div>
                    </div>
                    {idx > 0 && (
                      <button
                        onClick={() => onCompare(ver, sortedVersions[idx - 1])}
                        style={{
                          padding: '7px 14px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#2563EB',
                          background: 'rgba(37, 99, 235, 0.08)',
                          border: '1px solid rgba(37, 99, 235, 0.12)',
                          borderRadius: '7px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)';
                        }}
                      >
                        对比
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShareModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '22px' }}>🔗</span>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F172A' }}>分享文档</h3>
        </div>
        <div
          style={{
            padding: '12px 14px',
            background: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            fontSize: '13px',
            color: '#475569',
            wordBreak: 'break-all',
            marginBottom: '16px',
            fontFamily: "'SF Mono', Menlo, monospace",
          }}
        >
          {url}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={copy}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#FFFFFF',
              background: copied ? '#10B981' : '#2563EB',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {copied ? '✓ 已复制' : '复制链接'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              color: '#475569',
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DocEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDocument, updateDocument, state } = useApp();
  const doc = id ? getDocument(id) : undefined;

  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success'>('idle');
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [diffPair, setDiffPair] = useState<{ old: Version; new: Version } | null>(null);

  useEffect(() => {
    if (doc) {
      setEditingTitle(doc.title);
      setEditingContent(doc.content);
    }
  }, [doc?.id]);

  const handleSave = () => {
    if (!doc) return;
    setSaveState('saving');
    setTimeout(() => {
      updateDocument(doc.id, editingTitle, editingContent);
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2000);
    }, 1500);
  };

  if (!doc) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '20px',
          color: '#64748B',
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📄</div>
        <p style={{ fontSize: '16px', margin: '0 0 16px' }}>文档不存在</p>
        <Link
          to="/"
          style={{
            padding: '10px 20px',
            background: '#2563EB',
            color: '#FFFFFF',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        >
          返回首页
        </Link>
      </div>
    );
  }

  const displayTitle = isEditing ? editingTitle : doc.title;
  const displayContent = isEditing ? editingContent : doc.content;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', paddingRight: '220px', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#64748B',
        }}
      >
        <Link
          to="/"
          style={{
            color: '#2563EB',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          ← 返回列表
        </Link>
        <span>/</span>
        <span style={{ color: '#94A3B8' }}>{doc.category}</span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        {isEditing ? (
          <input
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#0F172A',
              border: '2px solid #2563EB',
              borderRadius: '8px',
              padding: '8px 12px',
              outline: 'none',
              flex: 1,
              minWidth: '200px',
              background: '#FFFFFF',
            }}
          />
        ) : (
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#0F172A',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {displayTitle}
          </h1>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              if (isEditing) {
                setEditingTitle(doc.title);
                setEditingContent(doc.content);
              }
              setIsEditing((e) => !e);
            }}
            style={{
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: isEditing ? '#DC2626' : '#2563EB',
              background: isEditing ? 'rgba(239, 68, 68, 0.08)' : 'rgba(37, 99, 235, 0.08)',
              border: `1px solid ${isEditing ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 99, 235, 0.15)'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {isEditing ? '取消编辑' : '✏️ 编辑'}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 16px',
          background: '#F8FAFC',
          borderRadius: '10px',
          marginBottom: '28px',
          flexWrap: 'wrap',
          fontSize: '13px',
          color: '#64748B',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 500,
            color: doc.categoryColor,
            background: `${doc.categoryColor}15`,
          }}
        >
          {doc.category}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${doc.categoryColor}40, ${doc.categoryColor}20)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
            }}
          >
            {doc.author.avatar}
          </div>
          <span>作者 {doc.author.name}</span>
        </div>
        <span>·</span>
        <span>创建于 {formatDate(doc.createdAt)}</span>
        <span>·</span>
        <span>更新于 {formatDate(doc.updatedAt)}</span>
        <span>·</span>
        <span>📜 {doc.versions.length} 个版本</span>
      </div>

      {isEditing ? (
        <textarea
          value={editingContent}
          onChange={(e) => setEditingContent(e.target.value)}
          style={{
            width: '100%',
            minHeight: '600px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            fontSize: '15px',
            lineHeight: 1.75,
            fontFamily: "'SF Mono', Menlo, Monaco, monospace",
            outline: 'none',
            resize: 'vertical',
            background: '#FCFCFD',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#2563EB';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        />
      ) : (
        <article
          style={{
            padding: '0 4px',
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }}
        />
      )}

      <FloatingPanel
        onSave={handleSave}
        onHistory={() => setShowHistory(true)}
        onShare={() => setShowShare(true)}
        saveState={saveState}
      />

      {showHistory && (
        <HistoryTimeline
          versions={doc.versions}
          onClose={() => setShowHistory(false)}
          onCompare={(oldVer, newVer) => {
            setDiffPair({ old: oldVer, new: newVer });
            setShowHistory(false);
          }}
        />
      )}

      {diffPair && (
        <DiffView
          oldVer={diffPair.old}
          newVer={diffPair.new}
          onClose={() => setDiffPair(null)}
        />
      )}

      {showShare && (
        <ShareModal
          url={typeof window !== 'undefined' ? window.location.href : ''}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
