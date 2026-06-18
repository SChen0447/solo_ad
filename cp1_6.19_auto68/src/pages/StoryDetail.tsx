import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStoryStore, Segment } from '../store/storyStore';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

const ITEM_HEIGHT = 60;
const BUFFER = 5;

function VirtualTimeline({
  segments,
  selectedId,
  onSelect,
  onBranch,
  branchIds,
}: {
  segments: Segment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBranch: (segmentId: string) => void;
  branchIds: Set<string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
    setContainerHeight(el.clientHeight);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const totalHeight = segments.length * ITEM_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
  const endIndex = Math.min(segments.length, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER);
  const visibleItems = segments.slice(startIndex, endIndex);

  return (
    <div className="timeline-scroll" ref={containerRef} onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          {segments.map((seg, i) => {
            const isSelected = seg.id === selectedId;
            const isBranch = branchIds.has(seg.id);
            const top = i * ITEM_HEIGHT;
            if (top < startIndex * ITEM_HEIGHT - BUFFER * ITEM_HEIGHT || top > endIndex * ITEM_HEIGHT) return null;
            return (
              <div
                key={seg.id}
                className={`timeline-item ${isSelected ? 'selected' : ''} ${isBranch ? 'branch' : ''} segment-slide-in`}
                style={{ top: `${top}px`, position: 'absolute', width: '100%' }}
                onClick={() => onSelect(seg.id)}
              >
                <div className="timeline-line">
                  <div className={`timeline-dot ${isSelected ? 'active' : ''} ${isBranch ? 'branch-dot' : ''}`} />
                  {i < segments.length - 1 && <div className="timeline-connector" />}
                </div>
                <div className="timeline-info">
                  <span className="timeline-author">{seg.author}</span>
                  <span className="timeline-time">{timeAgo(seg.createdAt)}</span>
                </div>
                <button
                  className="btn-branch-add"
                  onClick={(e) => { e.stopPropagation(); onBranch(seg.id); }}
                  title="创建分支"
                >
                  +
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function StoryDetail() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    currentStory,
    fetchStory,
    addSegment,
    createBranch,
    selectedSegmentId,
    setSelectedSegmentId,
    userNickname,
    setNickname,
    loading,
  } = useStoryStore();

  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchFromId, setBranchFromId] = useState<string | null>(null);
  const [branchContent, setBranchContent] = useState('');
  const [showNickModal, setShowNickModal] = useState(false);
  const [nickInput, setNickInput] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (code) fetchStory(code);
  }, [code, fetchStory]);

  useEffect(() => {
    if (!userNickname) {
      setShowNickModal(true);
    }
  }, [userNickname]);

  const branchIds = useMemo(() => {
    const ids = new Set<string>();
    if (currentStory) {
      currentStory.branches.forEach((b) => {
        b.segments.forEach((s) => ids.add(s.id));
      });
    }
    return ids;
  }, [currentStory]);

  const selectedSegment = useMemo(() => {
    if (!currentStory || !selectedSegmentId) return null;
    return currentStory.segments.find((s) => s.id === selectedSegmentId) || null;
  }, [currentStory, selectedSegmentId]);

  const handleAddSegment = async () => {
    setError('');
    const trimmed = content.trim();
    if (!trimmed) {
      setError('段落内容不能为空');
      return;
    }
    if (trimmed.length > 500) {
      setError('段落内容不能超过500字');
      return;
    }
    if (!code) return;
    setSubmitting(true);
    try {
      await addSegment(code, {
        content: trimmed,
        author: userNickname || '匿名',
      });
      setContent('');
    } catch (e: any) {
      setError(e.message || '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBranch = (segmentId: string) => {
    setBranchFromId(segmentId);
    setShowBranchModal(true);
  };

  const handleBranchConfirm = async () => {
    if (!code || !branchFromId || !branchContent.trim()) return;
    setSubmitting(true);
    try {
      await createBranch(code, {
        fromSegmentId: branchFromId,
        title: (currentStory?.title || '') + '（分支）',
        author: userNickname || '匿名',
        firstContent: branchContent.trim(),
      });
      setShowBranchModal(false);
      setBranchContent('');
      setBranchFromId(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNickSubmit = () => {
    const trimmed = nickInput.trim();
    if (isValidNickname(trimmed)) {
      setNickname(trimmed);
      setShowNickModal(false);
    }
  };

  function isValidNickname(name: string): boolean {
    if (name.length < 2 || name.length > 16) return false;
    const cn = name.match(/[\u4e00-\u9fa5]/g);
    const cnCount = cn ? cn.length : 0;
    if (cnCount > 0) {
      return cnCount >= 2 && cnCount <= 8 && name.replace(/[\u4e00-\u9fa5]/g, '').length === 0;
    }
    return /^[a-zA-Z0-9_]{4,16}$/.test(name);
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (contentRef.current) {
      contentRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(contentRef.current.scrollHeight, 52), 156);
      contentRef.current.style.height = `${newHeight}px`;
    }
  };

  if (loading && !currentStory) {
    return <div className="loading-text">加载中...</div>;
  }

  if (!currentStory) {
    return <div className="empty-state">故事不存在</div>;
  }

  const useVirtualScroll = currentStory.segments.length > 50;

  return (
    <div className="story-detail">
      <div className="story-detail-header">
        <h2 className="story-detail-title">{currentStory.title}</h2>
        <span className="story-code-badge">邀请码: {currentStory.code}</span>
      </div>

      <div className="story-detail-body">
        <div className="timeline-panel" ref={timelineRef}>
          <div className="timeline-header">时间轴</div>
          {useVirtualScroll ? (
            <VirtualTimeline
              segments={currentStory.segments}
              selectedId={selectedSegmentId}
              onSelect={setSelectedSegmentId}
              onBranch={handleBranch}
              branchIds={branchIds}
            />
          ) : (
            <div className="timeline-list">
              {currentStory.segments.map((seg, i) => {
                const isSelected = seg.id === selectedSegmentId;
                const isBranch = branchIds.has(seg.id);
                return (
                  <div
                    key={seg.id}
                    className={`timeline-item ${isSelected ? 'selected' : ''} ${isBranch ? 'branch' : ''} segment-slide-in`}
                    onClick={() => setSelectedSegmentId(seg.id)}
                  >
                    <div className="timeline-line">
                      <div className={`timeline-dot ${isSelected ? 'active' : ''} ${isBranch ? 'branch-dot' : ''}`} />
                      {i < currentStory.segments.length - 1 && <div className="timeline-connector" />}
                    </div>
                    <div className="timeline-info">
                      <span className="timeline-author">{seg.author}</span>
                      <span className="timeline-time">{timeAgo(seg.createdAt)}</span>
                    </div>
                    <button
                      className="btn-branch-add"
                      onClick={(e) => { e.stopPropagation(); handleBranch(seg.id); }}
                      title="创建分支"
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="timeline-divider" />

        <div className="content-panel">
          {selectedSegment ? (
            <div className="segment-content-wrapper">
              <div className="segment-header">
                <div className="segment-author-info">
                  <div className="segment-avatar">{selectedSegment.author.charAt(0).toUpperCase()}</div>
                  <span className="segment-author-name">{selectedSegment.author}</span>
                </div>
                <span className="segment-timestamp">{timeAgo(selectedSegment.createdAt)}</span>
              </div>
              <div className={`segment-text ${branchIds.has(selectedSegment.id) ? 'branch-text' : ''}`}>
                {selectedSegment.content}
              </div>
            </div>
          ) : (
            <div className="no-segment-selected">点击时间轴节点查看段落内容</div>
          )}

          <div className="continuation-area">
            {error && <div className="form-error">{error}</div>}
            <div className="continuation-input-wrapper">
              <textarea
                ref={contentRef}
                className="continuation-input"
                value={content}
                onChange={handleContentChange}
                placeholder="续写故事..."
                rows={2}
              />
              <button
                className="btn-primary btn-add-segment"
                onClick={handleAddSegment}
                disabled={submitting}
              >
                {submitting ? '...' : '添加段落'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showBranchModal && (
        <div className="modal-overlay" onClick={() => setShowBranchModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>在此处创建分支？</h3>
            <p className="modal-hint">从当前段落开始，创造一个全新的故事走向</p>
            <textarea
              className="form-textarea"
              value={branchContent}
              onChange={(e) => setBranchContent(e.target.value)}
              placeholder="写下分支的第一段..."
              rows={5}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowBranchModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleBranchConfirm} disabled={!branchContent.trim() || submitting}>
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showNickModal && (
        <div className="modal-overlay">
          <div className="modal-content nickname-modal" onClick={(e) => e.stopPropagation()}>
            <h3>设置你的昵称</h3>
            <p className="modal-hint">2-8个中文字符 或 4-16个英文/数字字符</p>
            <input
              className="nick-input"
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNickSubmit()}
              placeholder="输入昵称..."
              autoFocus
            />
            <button className="btn-primary btn-confirm-nick" onClick={handleNickSubmit} disabled={!isValidNickname(nickInput.trim())}>
              确认
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
