import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../App';
import type { Chapter, Volume } from '../types';

interface VolumeWithChapters extends Volume {
  chapters: Chapter[];
}

function getProgressColor(progress: number): string {
  if (progress >= 80) return '#10B981';
  if (progress >= 50) return '#84CC16';
  if (progress >= 30) return '#F59E0B';
  return '#64748B';
}

function Toolbar({ onFormat }: { onFormat: (command: string, value?: string) => void }) {
  const tools = [
    { command: 'bold', label: 'B', title: '加粗', style: { fontWeight: 'bold' } },
    { command: 'italic', label: 'I', title: '斜体', style: { fontStyle: 'italic' } },
    { command: 'underline', label: 'U', title: '下划线', style: { textDecoration: 'underline' } },
    { command: 'strikeThrough', label: 'S', title: '删除线', style: { textDecoration: 'line-through' } },
  ];

  return (
    <div style={styles.toolbar}>
      {tools.map(tool => (
        <button
          key={tool.command}
          onMouseDown={e => {
            e.preventDefault();
            onFormat(tool.command);
          }}
          style={{ ...styles.toolBtn, ...tool.style }}
          title={tool.title}
        >
          {tool.label}
        </button>
      ))}
      <div style={styles.toolDivider} />
      <button
        onMouseDown={e => {
          e.preventDefault();
          onFormat('hiliteColor', '#FBBF24');
        }}
        style={styles.toolBtn}
        title="高亮"
      >
        <span style={{ backgroundColor: '#FBBF24', color: '#1E293B', padding: '0 4px', borderRadius: '2px', fontSize: '11px' }}>A</span>
      </button>
      <button
        onMouseDown={e => {
          e.preventDefault();
          onFormat('insertHTML', `<span style="background-color: rgba(59, 130, 246, 0.2); padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #60A5FA;">[备注]</span>`);
        }}
        style={styles.toolBtn}
        title="插入备注"
      >
        📝
      </button>
    </div>
  );
}

function ChapterTreeItem({
  chapter,
  isSelected,
  onClick,
}: {
  chapter: Chapter;
  isSelected: boolean;
  onClick: () => void;
}) {
  const progressColor = getProgressColor(chapter.progress);

  return (
    <div
      onClick={onClick}
      style={{
        ...styles.chapterItem,
        ...(isSelected ? styles.chapterItemSelected : {}),
      }}
    >
      <div style={styles.chapterItemContent}>
        <span style={styles.chapterTitle}>{chapter.title}</span>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${chapter.progress}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>
      </div>
      <span style={styles.progressText}>{chapter.progress}%</span>
    </div>
  );
}

function VolumeSection({
  volume,
  chapters,
  selectedChapterId,
  onSelectChapter,
  isExpanded,
  onToggle,
}: {
  volume: Volume;
  chapters: Chapter[];
  selectedChapterId: string | null;
  onSelectChapter: (chapter: Chapter) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const totalProgress = useMemo(() => {
    if (chapters.length === 0) return 0;
    return Math.round(chapters.reduce((sum, c) => sum + c.progress, 0) / chapters.length);
  }, [chapters]);

  return (
    <div style={styles.volumeSection}>
      <div style={styles.volumeHeader} onClick={onToggle}>
        <span style={styles.volumeToggle}>{isExpanded ? '▼' : '▶'}</span>
        <span style={styles.volumeTitle}>{volume.title}</span>
        <span style={styles.volumeCount}>{chapters.length}章</span>
        <div style={styles.volumeProgress}>
          <div
            style={{
              ...styles.volumeProgressFill,
              width: `${totalProgress}%`,
              backgroundColor: getProgressColor(totalProgress),
            }}
          />
        </div>
      </div>
      {isExpanded && (
        <div style={styles.chapterList}>
          {chapters.map(chapter => (
            <ChapterTreeItem
              key={chapter.id}
              chapter={chapter}
              isSelected={selectedChapterId === chapter.id}
              onClick={() => onSelectChapter(chapter)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChapterEditor() {
  const { chapters, volumes, characters, events, updateChapter } = useAppContext();
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set(volumes.map(v => v.id)));
  const [isFading, setIsFading] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [compareResults, setCompareResults] = useState<{ chapter: Chapter; matches: string[] }[]>([]);

  const volumesWithChapters = useMemo<VolumeWithChapters[]>(() => {
    return volumes.map(vol => ({
      ...vol,
      chapters: chapters.filter(c => c.volumeId === vol.id).sort((a, b) => a.chapterNumber - b.chapterNumber),
    }));
  }, [volumes, chapters]);

  useEffect(() => {
    if (chapters.length > 0 && !selectedChapter) {
      setSelectedChapter(chapters[0]);
    }
  }, [chapters]);

  useEffect(() => {
    if (selectedChapter && editorRef.current) {
      editorRef.current.innerHTML = selectedChapter.content;
    }
  }, [selectedChapter?.id]);

  const handleSelectChapter = (chapter: Chapter) => {
    if (chapter.id === selectedChapter?.id) return;
    setIsFading(true);
    setTimeout(() => {
      setSelectedChapter(chapter);
      setIsFading(false);
    }, 150);
  };

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current && selectedChapter) {
      updateChapter(selectedChapter.id, { content: editorRef.current.innerHTML });
    }
  };

  const handleContentChange = () => {
    if (editorRef.current && selectedChapter) {
      updateChapter(selectedChapter.id, { content: editorRef.current.innerHTML });
    }
  };

  const toggleVolume = (volumeId: string) => {
    setExpandedVolumes(prev => {
      const next = new Set(prev);
      if (next.has(volumeId)) {
        next.delete(volumeId);
      } else {
        next.add(volumeId);
      }
      return next;
    });
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedChapter) {
      const progress = parseInt(e.target.value);
      updateChapter(selectedChapter.id, { progress });
    }
  };

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim());
    }
  };

  const findSimilarContent = () => {
    if (!selectedText || !selectedChapter) {
      setCompareResults([]);
      setShowCompare(true);
      return;
    }

    const keywords = selectedText.split(/[，。！？、\s]+/).filter(w => w.length >= 2);
    const characterNames = characters.map(c => c.name);
    const allKeywords = [...keywords, ...characterNames.filter(name => selectedText.includes(name))];

    const results = chapters
      .filter(c => c.id !== selectedChapter.id)
      .map(chapter => {
        const matches: string[] = [];
        const plainText = chapter.content.replace(/<[^>]*>/g, '');
        allKeywords.forEach(kw => {
          if (plainText.includes(kw) && !matches.includes(kw)) {
            matches.push(kw);
          }
        });
        return { chapter, matches };
      })
      .filter(r => r.matches.length > 0)
      .sort((a, b) => b.matches.length - a.matches.length)
      .slice(0, 5);

    setCompareResults(results);
    setShowCompare(true);
  };

  const getRelatedEvents = (chapterId: string) => {
    return events.filter(e => e.chapterIds.includes(chapterId));
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h3 style={styles.sidebarTitle}>章节大纲</h3>
          <span style={styles.sidebarCount}>{chapters.length} 章</span>
        </div>
        <div style={styles.treeContainer}>
          {volumesWithChapters.map(volume => (
            <VolumeSection
              key={volume.id}
              volume={volume}
              chapters={volume.chapters}
              selectedChapterId={selectedChapter?.id || null}
              onSelectChapter={handleSelectChapter}
              isExpanded={expandedVolumes.has(volume.id)}
              onToggle={() => toggleVolume(volume.id)}
            />
          ))}
        </div>
      </div>

      <div style={styles.editorPane}>
        {selectedChapter ? (
          <>
            <div style={styles.editorHeader}>
              <div>
                <h2 style={styles.chapterMainTitle}>{selectedChapter.title}</h2>
                <span style={styles.volumeLabel}>{selectedChapter.volumeTitle}</span>
              </div>
              <div style={styles.progressControl}>
                <span style={styles.progressLabel}>进度</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedChapter.progress}
                  onChange={handleProgressChange}
                  style={styles.progressSlider}
                />
                <span style={{ ...styles.progressValue, color: getProgressColor(selectedChapter.progress) }}>
                  {selectedChapter.progress}%
                </span>
              </div>
            </div>

            <Toolbar onFormat={handleFormat} />

            <div style={styles.editorContainer}>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleContentChange}
                onMouseUp={handleSelection}
                onKeyUp={handleSelection}
                style={{
                  ...styles.editor,
                  opacity: isFading ? 0 : 1,
                  transition: 'opacity 0.3s ease-in-out',
                }}
              />
            </div>

            {selectedText && (
              <div style={styles.selectionBar}>
                <span style={styles.selectionText}>
                  已选中: "{selectedText.length > 30 ? selectedText.slice(0, 30) + '...' : selectedText}"
                </span>
                <button style={styles.compareBtn} onClick={findSimilarContent}>
                  🔍 跨章节对比
                </button>
              </div>
            )}

            <div style={styles.eventsSection}>
              <h4 style={styles.eventsTitle}>相关事件</h4>
              <div style={styles.eventsList}>
                {getRelatedEvents(selectedChapter.id).length > 0 ? (
                  getRelatedEvents(selectedChapter.id).map(evt => (
                    <div key={evt.id} style={styles.eventTag}>
                      <div
                        style={{
                          ...styles.eventDot,
                          backgroundColor:
                            evt.type === 'main' ? '#F59E0B' :
                            evt.type === 'side' ? '#10B981' :
                            evt.type === 'memory' ? '#8B5CF6' : '#EC4899',
                        }}
                      />
                      <span style={styles.eventName}>{evt.name}</span>
                      <span style={styles.eventDate}>{evt.date}</span>
                    </div>
                  ))
                ) : (
                  <span style={styles.noEvents}>暂无关联事件</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📖</div>
            <p style={styles.emptyText}>请从左侧选择一个章节开始编辑</p>
          </div>
        )}
      </div>

      {showCompare && (
        <>
          <div style={styles.compareOverlay} onClick={() => setShowCompare(false)} />
          <div style={styles.comparePanel}>
            <div style={styles.compareHeader}>
              <h3 style={styles.compareTitle}>跨章节视角对比</h3>
              <button style={styles.closeBtn} onClick={() => setShowCompare(false)}>✕</button>
            </div>
            <div style={styles.compareBody}>
              <p style={styles.compareDesc}>
                匹配关键词: {selectedText || '无'}
              </p>
              {compareResults.length > 0 ? (
                <div style={styles.compareList}>
                  {compareResults.map(({ chapter, matches }) => (
                    <div
                      key={chapter.id}
                      style={styles.compareItem}
                      onClick={() => {
                        handleSelectChapter(chapter);
                        setShowCompare(false);
                      }}
                    >
                      <div style={styles.compareItemHeader}>
                        <span style={styles.compareChapterTitle}>{chapter.title}</span>
                        <span style={styles.compareMatchCount}>{matches.length} 个匹配</span>
                      </div>
                      <div style={styles.compareMatches}>
                        {matches.map(m => (
                          <span key={m} style={styles.matchTag}>{m}</span>
                        ))}
                      </div>
                      <div style={styles.compareProgressBar}>
                        <div
                          style={{
                            ...styles.compareProgressFill,
                            width: `${chapter.progress}%`,
                            backgroundColor: getProgressColor(chapter.progress),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={styles.noMatches}>未找到相似内容的章节</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  sidebar: {
    width: '320px',
    minWidth: '320px',
    backgroundColor: '#172033',
    borderRight: '1px solid #2D3A4F',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 20px 16px',
    borderBottom: '1px solid #2D3A4F',
  },
  sidebarTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#F59E0B',
    margin: 0,
  },
  sidebarCount: {
    fontSize: '12px',
    color: '#64748B',
  },
  treeContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  volumeSection: {
    marginBottom: '4px',
  },
  volumeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  volumeToggle: {
    fontSize: '10px',
    color: '#64748B',
    width: '12px',
  },
  volumeTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#CBD5E1',
    flex: 1,
  },
  volumeCount: {
    fontSize: '11px',
    color: '#64748B',
  },
  volumeProgress: {
    width: '40px',
    height: '4px',
    backgroundColor: '#2D3A4F',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  volumeProgressFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s',
  },
  chapterList: {
    paddingLeft: '20px',
  },
  chapterItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px 8px 12px',
    margin: '2px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  chapterItemSelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  chapterItemContent: {
    flex: 1,
    minWidth: 0,
  },
  chapterTitle: {
    fontSize: '13px',
    color: '#94A3B8',
    display: 'block',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  progressBar: {
    height: '3px',
    backgroundColor: '#2D3A4F',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: '11px',
    color: '#64748B',
    marginLeft: '8px',
    minWidth: '32px',
    textAlign: 'right',
  },
  editorPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  editorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 32px',
    borderBottom: '1px solid #2D3A4F',
  },
  chapterMainTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#F59E0B',
    margin: '0 0 4px 0',
  },
  volumeLabel: {
    fontSize: '13px',
    color: '#64748B',
  },
  progressControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  progressLabel: {
    fontSize: '13px',
    color: '#94A3B8',
  },
  progressSlider: {
    width: '120px',
    accentColor: '#F59E0B',
  },
  progressValue: {
    fontSize: '14px',
    fontWeight: 600,
    minWidth: '40px',
    textAlign: 'right',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '10px 24px',
    backgroundColor: '#172033',
    borderBottom: '1px solid #2D3A4F',
  },
  toolBtn: {
    width: '32px',
    height: '32px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#94A3B8',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  toolDivider: {
    width: '1px',
    height: '20px',
    backgroundColor: '#334155',
    margin: '0 8px',
  },
  editorContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px',
  },
  editor: {
    minHeight: '100%',
    fontSize: '15px',
    lineHeight: 1.8,
    color: '#E2E8F0',
    outline: 'none',
    maxWidth: '720px',
    margin: '0 auto',
  },
  selectionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#172033',
    borderTop: '1px solid #2D3A4F',
  },
  selectionText: {
    fontSize: '13px',
    color: '#94A3B8',
  },
  compareBtn: {
    padding: '8px 16px',
    backgroundColor: '#F59E0B',
    border: 'none',
    borderRadius: '6px',
    color: '#1E293B',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  eventsSection: {
    padding: '16px 32px',
    borderTop: '1px solid #2D3A4F',
    backgroundColor: '#172033',
  },
  eventsTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#94A3B8',
    margin: '0 0 10px 0',
  },
  eventsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  eventTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#1E293B',
    borderRadius: '16px',
    border: '1px solid #2D3A4F',
  },
  eventDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  eventName: {
    fontSize: '12px',
    color: '#CBD5E1',
  },
  eventDate: {
    fontSize: '11px',
    color: '#64748B',
  },
  noEvents: {
    fontSize: '12px',
    color: '#64748B',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  emptyIcon: {
    fontSize: '64px',
    opacity: 0.3,
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748B',
  },
  compareOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  comparePanel: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '500px',
    maxHeight: '80vh',
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    border: '1px solid #334155',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    zIndex: 1000,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeIn 0.25s ease-out',
  },
  compareHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #2D3A4F',
  },
  compareTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#F59E0B',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px',
  },
  compareBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
  compareDesc: {
    fontSize: '13px',
    color: '#94A3B8',
    margin: '0 0 16px 0',
    padding: '8px 12px',
    backgroundColor: '#172033',
    borderRadius: '6px',
  },
  compareList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  compareItem: {
    padding: '12px 14px',
    backgroundColor: '#172033',
    borderRadius: '8px',
    border: '1px solid #2D3A4F',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  compareItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  compareChapterTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#CBD5E1',
  },
  compareMatchCount: {
    fontSize: '11px',
    color: '#F59E0B',
  },
  compareMatches: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '8px',
  },
  matchTag: {
    padding: '2px 8px',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#FBBF24',
    fontSize: '11px',
    borderRadius: '10px',
  },
  compareProgressBar: {
    height: '3px',
    backgroundColor: '#2D3A4F',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  compareProgressFill: {
    height: '100%',
    borderRadius: '2px',
  },
  noMatches: {
    fontSize: '13px',
    color: '#64748B',
    textAlign: 'center',
    padding: '32px 0',
  },
};

export default ChapterEditor;
