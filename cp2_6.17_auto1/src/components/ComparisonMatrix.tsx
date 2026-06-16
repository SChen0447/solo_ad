import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getProjectByShortCode, updateScore, isLoading, subscribeLoading } from '@/utils/api';
import { DIMENSIONS } from '@/types';
import type { Project, TechSolution } from '@/types';
import './ComparisonMatrix.css';

interface MatrixCellProps {
  solution: TechSolution;
  dimension: string;
  readOnly: boolean;
  onScoreChange: (rating: number, description: string) => void;
}

const StarRating: React.FC<{
  rating: number;
  readOnly: boolean;
  onChange?: (rating: number) => void;
}> = ({ rating, readOnly, onChange }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className={`star ${(hoverRating || rating) >= star ? 'active' : ''}`}
          onMouseEnter={() => !readOnly && setHoverRating(star)}
          onMouseLeave={() => !readOnly && setHoverRating(0)}
          onClick={() => !readOnly && onChange?.(star)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const MatrixCell: React.FC<MatrixCellProps> = React.memo(({ solution, dimension, readOnly, onScoreChange }) => {
  const score = solution.scores[dimension];
  const [showTooltip, setShowTooltip] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(score?.description || '');
  const [localRating, setLocalRating] = useState(score?.rating || 3);

  const handleRatingChange = useCallback((newRating: number) => {
    setLocalRating(newRating);
    onScoreChange(newRating, score?.description || '');
  }, [score?.description, onScoreChange]);

  const handleDescSave = useCallback(() => {
    setEditingDesc(false);
    onScoreChange(localRating, descValue);
  }, [localRating, descValue, onScoreChange]);

  return (
    <div
      className="matrix-cell"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <StarRating
        rating={localRating}
        readOnly={readOnly}
        onChange={handleRatingChange}
      />
      {!readOnly && !editingDesc && (
        <div
          className="cell-description"
          onClick={() => setEditingDesc(true)}
        >
          {score?.description || '点击添加说明'}
        </div>
      )}
      {!readOnly && editingDesc && (
        <input
          type="text"
          className="cell-desc-input"
          value={descValue}
          onChange={e => setDescValue(e.target.value)}
          onBlur={handleDescSave}
          onKeyDown={e => e.key === 'Enter' && handleDescSave()}
          autoFocus
          placeholder="输入评分说明"
        />
      )}
      {readOnly && score?.description && (
        <div className="cell-description">{score.description}</div>
      )}
      {showTooltip && score?.description && (
        <div className="tooltip visible">{score.description}</div>
      )}
    </div>
  );
});

MatrixCell.displayName = 'MatrixCell';

interface ComparisonMatrixProps {
  isShareMode?: boolean;
}

const ComparisonMatrix: React.FC<ComparisonMatrixProps> = ({ isShareMode = false }) => {
  const { id, shortCode } = useParams<{ id: string; shortCode: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStackMode, setIsStackMode] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeLoading(setGlobalLoading);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const checkWidth = () => {
      setIsStackMode(window.innerWidth < 900);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError('');
        let data: Project;
        if (isShareMode && shortCode) {
          data = await getProjectByShortCode(shortCode);
        } else if (id) {
          data = await getProject(id);
        } else {
          throw new Error('无效的访问方式');
        }
        setProject(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id, shortCode, isShareMode]);

  const handleScoreChange = useCallback(async (solutionId: string, dimension: string, rating: number, description: string) => {
    if (!project || isShareMode) return;
    try {
      await updateScore(project.id, { solutionId, dimension, rating, description });
      setProject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          solutions: prev.solutions.map(s =>
            s.id === solutionId
              ? { ...s, scores: { ...s.scores, [dimension]: { rating, description } } }
              : s
          )
        };
      });
    } catch (err) {
      console.error('更新评分失败:', err);
    }
  }, [project, isShareMode]);

  const generateShareLink = useCallback(async () => {
    if (!project) return;
    const shareUrl = `${window.location.origin}/share/${project.shortCode}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [project]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const gridTemplateColumns = useMemo(() => {
    if (!project) return '';
    return `120px repeat(${project.solutions.length}, minmax(140px, 1fr))`;
  }, [project]);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="error-container">
        <div className="error-box">
          <h2>加载失败</h2>
          <p>{error || '项目不存在'}</p>
          <button className="btn btn-primary ripple" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="matrix-page" ref={containerRef}>
      {globalLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {isShareMode && (
        <div className="share-header">
          <div className="share-header-content">
            <h1>{project.name}</h1>
            <p className="project-desc">{project.description}</p>
            <p className="project-meta">创建于 {formatDate(project.createdAt)}</p>
          </div>
        </div>
      )}

      <div className="matrix-layout">
        <aside className="solutions-sidebar">
          <div className="sidebar-header">
            <h2>方案列表</h2>
            {!isShareMode && (
              <button
                className="btn btn-secondary ripple btn-sm"
                onClick={generateShareLink}
              >
                {shareCopied ? '✓ 已复制' : '🔗 分享'}
              </button>
            )}
          </div>
          <div className="solutions-list">
            {project.solutions.map((solution, index) => (
              <div key={solution.id} className="solution-item card fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="solution-item-header">
                  <span className="solution-item-index">{index + 1}</span>
                  <h3>{solution.name}</h3>
                  {solution.version && <span className="solution-version">v{solution.version}</span>}
                </div>
                {solution.tags.length > 0 && (
                  <div className="solution-tags">
                    {solution.tags.map((tag, i) => (
                      <span key={i} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
                {solution.advantages.length > 0 && (
                  <div className="solution-pros">
                    <h4>优势</h4>
                    <ul>
                      {solution.advantages.map((adv, i) => (
                        <li key={i}>✓ {adv}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {solution.disadvantages.length > 0 && (
                  <div className="solution-cons">
                    <h4>劣势</h4>
                    <ul>
                      {solution.disadvantages.map((dis, i) => (
                        <li key={i}>✗ {dis}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          {!isShareMode && (
            <div className="sidebar-footer">
              <button
                className="btn btn-primary ripple btn-large w-full"
                onClick={() => navigate(`/projects/${project.id}/vote`)}
              >
                进入投票
              </button>
            </div>
          )}
          {isShareMode && (
            <div className="sidebar-footer">
              <button
                className="btn btn-primary ripple btn-large w-full"
                onClick={() => navigate(`/projects/${project.id}/vote`)}
              >
                参与投票
              </button>
            </div>
          )}
        </aside>

        <main className="matrix-content">
          <div className="matrix-header">
            <h1>{project.name}</h1>
            <p>{project.description}</p>
          </div>

          {!isStackMode ? (
            <div className="matrix-grid" style={{ gridTemplateColumns }}>
              <div className="matrix-header-cell corner-cell"></div>
              {project.solutions.map(solution => (
                <div key={solution.id} className="matrix-header-cell">
                  {solution.name}
                  {solution.version && <span className="version-tag">v{solution.version}</span>}
                </div>
              ))}
              {DIMENSIONS.map(dimension => (
                <React.Fragment key={dimension}>
                  <div className="matrix-row-header">{dimension}</div>
                  {project.solutions.map(solution => (
                    <MatrixCell
                      key={`${solution.id}-${dimension}`}
                      solution={solution}
                      dimension={dimension}
                      readOnly={isShareMode}
                      onScoreChange={(rating, desc) => handleScoreChange(solution.id, dimension, rating, desc)}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="matrix-cards">
              {project.solutions.map((solution, index) => (
                <div key={solution.id} className="matrix-card card fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="matrix-card-header">
                    <h3>{solution.name}</h3>
                    {solution.version && <span className="version-tag">v{solution.version}</span>}
                  </div>
                  <div className="matrix-card-scroll">
                    <div className="matrix-card-body">
                      {DIMENSIONS.map(dimension => (
                        <div key={dimension} className="matrix-card-row">
                          <div className="matrix-card-row-label">{dimension}</div>
                          <MatrixCell
                            solution={solution}
                            dimension={dimension}
                            readOnly={isShareMode}
                            onScoreChange={(rating, desc) => handleScoreChange(solution.id, dimension, rating, desc)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {isShareMode && (
        <div className="watermark">
          由 {project.createdBy} 创建
        </div>
      )}
    </div>
  );
};

export default ComparisonMatrix;
