import React, { useReducer, useState, useCallback } from 'react';
import type { ServiceItem, Comment, ProposalVersion, ProposalStatus, Proposal } from '../data/types';
import { formatCurrency, formatDateTime, mockProposals, statusLabels } from '../data/mockData';

interface ProposalPageProps {
  proposalId: string;
  onBack: () => void;
}

type State = {
  proposal: Proposal;
  editing: {
    title: string;
    description: string;
    services: ServiceItem[];
    clientName: string;
    clientEmail: string;
  };
  activeVersionId: string | null;
  isFlipping: boolean;
};

type Action =
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_CLIENT_NAME'; payload: string }
  | { type: 'SET_CLIENT_EMAIL'; payload: string }
  | { type: 'UPDATE_SERVICE'; payload: { id: string; field: keyof ServiceItem; value: string | number } }
  | { type: 'ADD_SERVICE' }
  | { type: 'REMOVE_SERVICE'; payload: string }
  | { type: 'SAVE_VERSION' }
  | { type: 'RESTORE_VERSION'; payload: string }
  | { type: 'ADD_COMMENT'; payload: Comment }
  | { type: 'FINISH_FLIP' };

const calcTotal = (services: ServiceItem[]): number =>
  services.reduce((sum, s) => sum + s.unitPrice * s.quantity, 0);

const generateId = (): string => Math.random().toString(36).slice(2, 10);

const createEmptyService = (): ServiceItem => ({
  id: generateId(),
  name: '',
  description: '',
  unitPrice: 0,
  quantity: 1,
  unit: '项'
});

const initState = (proposal: Proposal): State => ({
  proposal,
  editing: {
    title: proposal.title,
    description: proposal.description,
    services: JSON.parse(JSON.stringify(proposal.services)),
    clientName: proposal.clientName,
    clientEmail: proposal.clientEmail
  },
  activeVersionId: null,
  isFlipping: false
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_TITLE':
      return {
        ...state,
        editing: { ...state.editing, title: action.payload },
        activeVersionId: null
      };
    case 'SET_DESCRIPTION':
      return {
        ...state,
        editing: { ...state.editing, description: action.payload },
        activeVersionId: null
      };
    case 'SET_CLIENT_NAME':
      return {
        ...state,
        editing: { ...state.editing, clientName: action.payload },
        activeVersionId: null
      };
    case 'SET_CLIENT_EMAIL':
      return {
        ...state,
        editing: { ...state.editing, clientEmail: action.payload },
        activeVersionId: null
      };
    case 'UPDATE_SERVICE': {
      const { id, field, value } = action.payload;
      const newServices = state.editing.services.map(s =>
        s.id === id ? { ...s, [field]: value } : s
      );
      return {
        ...state,
        editing: { ...state.editing, services: newServices },
        activeVersionId: null
      };
    }
    case 'ADD_SERVICE':
      return {
        ...state,
        editing: {
          ...state.editing,
          services: [...state.editing.services, createEmptyService()]
        },
        activeVersionId: null
      };
    case 'REMOVE_SERVICE':
      return {
        ...state,
        editing: {
          ...state.editing,
          services: state.editing.services.filter(s => s.id !== action.payload)
        },
        activeVersionId: null
      };
    case 'SAVE_VERSION': {
      const total = calcTotal(state.editing.services);
      const newVersion: ProposalVersion = {
        id: generateId(),
        title: state.editing.title,
        description: state.editing.description,
        services: JSON.parse(JSON.stringify(state.editing.services)),
        totalAmount: total,
        clientName: state.editing.clientName,
        clientEmail: state.editing.clientEmail,
        companyName: state.proposal.companyName,
        companyEmail: state.proposal.companyEmail,
        companyAddress: state.proposal.companyAddress,
        companyPhone: state.proposal.companyPhone,
        createdAt: Date.now()
      };
      const newProposal: Proposal = {
        ...state.proposal,
        title: state.editing.title,
        description: state.editing.description,
        services: JSON.parse(JSON.stringify(state.editing.services)),
        totalAmount: total,
        clientName: state.editing.clientName,
        clientEmail: state.editing.clientEmail,
        lastUpdated: Date.now(),
        versions: [...state.proposal.versions, newVersion]
      };
      return {
        ...state,
        proposal: newProposal,
        activeVersionId: newVersion.id,
        isFlipping: true
      };
    }
    case 'RESTORE_VERSION': {
      const version = state.proposal.versions.find(v => v.id === action.payload);
      if (!version) return state;
      return {
        ...state,
        editing: {
          title: version.title,
          description: version.description,
          services: JSON.parse(JSON.stringify(version.services)),
          clientName: version.clientName,
          clientEmail: version.clientEmail
        },
        activeVersionId: version.id,
        isFlipping: true
      };
    }
    case 'ADD_COMMENT':
      return {
        ...state,
        proposal: {
          ...state.proposal,
          comments: [...state.proposal.comments, action.payload]
        }
      };
    case 'FINISH_FLIP':
      return { ...state, isFlipping: false };
    default:
      return state;
  }
}

const StarRating: React.FC<{ rating: number; onChange?: (r: number) => void; size?: 'sm' | 'md' }> = ({
  rating,
  onChange,
  size = 'md'
}) => {
  const [hovered, setHovered] = useState(0);
  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <div className="rating-input" style={{ cursor: onChange ? 'pointer' : 'default' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <svg
          key={star}
          className={`rating-star ${star <= (hovered || rating) ? 'filled' : ''}`}
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={star <= (hovered || rating) ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          onClick={() => onChange && onChange(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
};

const ProposalPreview: React.FC<{
  title: string;
  description: string;
  services: ServiceItem[];
  clientName: string;
  clientEmail: string;
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  companyPhone: string;
  isFlipping: boolean;
  onFlipEnd: () => void;
}> = ({
  title,
  description,
  services,
  clientName,
  clientEmail,
  companyName,
  companyEmail,
  companyAddress,
  companyPhone,
  isFlipping,
  onFlipEnd
}) => {
  const subtotal = calcTotal(services);
  const total = subtotal;

  return (
    <div className="preview-card">
      <div
        className={`preview-card-inner ${isFlipping ? 'flip' : ''}`}
        onTransitionEnd={onFlipEnd}
      >
        <div className="preview-card-front">
          <div className="preview-pdf-toolbar">
            <div className="preview-pdf-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>{title || '项目报价单'}.pdf</span>
            </div>
            <div className="preview-pdf-actions">
              <button className="preview-pdf-icon-btn" title="打印">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
              </button>
              <button className="preview-pdf-icon-btn" title="下载">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button className="preview-pdf-icon-btn" title="分享">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
            </div>
          </div>

          <div className="preview-header">
            <h2 className="preview-title">{title || '项目报价单'}</h2>
            <p className="preview-subtitle">QUOTATION · 专业服务报价</p>
          </div>
          <div className="preview-body">
            <div className="preview-info-row">
              <div className="preview-info-block">
                <div className="preview-info-label">我方信息</div>
                <div className="preview-info-name">{companyName || '公司名称'}</div>
                <div className="preview-info-detail">
                  {companyAddress || '公司地址'}
                  <br />
                  {companyPhone || '联系电话'}
                  <br />
                  {companyEmail || '公司邮箱'}
                </div>
              </div>
              <div className="preview-info-divider" />
              <div className="preview-info-block preview-info-right">
                <div className="preview-info-label">客户信息</div>
                <div className="preview-info-name">{clientName || '客户姓名'}</div>
                <div className="preview-info-detail">
                  {clientEmail || '客户邮箱'}
                </div>
              </div>
            </div>

            <div className="preview-divider" />

            <p className="preview-desc">{description || '暂无项目描述'}</p>

            <table className="preview-table">
              <thead>
                <tr>
                  <th style={{ width: '38%' }}>服务项目</th>
                  <th style={{ width: '18%' }} className="text-right">单价</th>
                  <th style={{ width: '12%' }} className="text-center">数量</th>
                  <th style={{ width: '10%' }} className="text-center">单位</th>
                  <th style={{ width: '22%' }} className="text-right">金额</th>
                </tr>
              </thead>
              <tbody>
                {services.map(service => (
                  <tr key={service.id}>
                    <td>
                      <div className="service-name">{service.name || '服务名称'}</div>
                      {service.description && (
                        <div className="service-desc">{service.description}</div>
                      )}
                    </td>
                    <td className="text-right">{formatCurrency(service.unitPrice)}</td>
                    <td className="text-center">{service.quantity}</td>
                    <td className="text-center">{service.unit}</td>
                    <td className="text-right">
                      {formatCurrency(service.unitPrice * service.quantity)}
                    </td>
                  </tr>
                ))}
                <tr className="subtotal-row">
                  <td colSpan={4}>小计</td>
                  <td className="text-right">{formatCurrency(subtotal)}</td>
                </tr>
              </tbody>
            </table>

            <div className="preview-total-row">
              <span className="preview-total-label">总计：</span>
              <span className="preview-total-value">{formatCurrency(total)}</span>
            </div>

            <div className="preview-watermark">Proposal Manager</div>
          </div>
          <div className="preview-footer">
            感谢您的信任与支持 · 本报价单有效期30天 · 如有疑问请随时联系
          </div>
        </div>

        <div className="preview-card-back">
          <div className="preview-header">
            <h2 className="preview-title">历史版本</h2>
            <p className="preview-subtitle">VERSION HISTORY</p>
          </div>
          <div className="preview-body" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <p>版本切换中...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProposalPage: React.FC<ProposalPageProps> = ({ proposalId, onBack }) => {
  const proposal = mockProposals.find(p => p.id === proposalId) || mockProposals[0];
  const [state, dispatch] = useReducer(reducer, proposal, initState);
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState(5);
  const [status, setStatus] = useState<ProposalStatus>(proposal.status);

  const activeVersion = state.activeVersionId
    ? state.proposal.versions.find(v => v.id === state.activeVersionId)
    : null;

  const previewData = activeVersion
    ? {
        title: activeVersion.title,
        description: activeVersion.description,
        services: activeVersion.services,
        clientName: activeVersion.clientName,
        clientEmail: activeVersion.clientEmail,
        companyName: activeVersion.companyName || state.proposal.companyName,
        companyEmail: activeVersion.companyEmail || state.proposal.companyEmail,
        companyAddress: activeVersion.companyAddress || state.proposal.companyAddress,
        companyPhone: activeVersion.companyPhone || state.proposal.companyPhone
      }
    : {
        title: state.editing.title,
        description: state.editing.description,
        services: state.editing.services,
        clientName: state.editing.clientName,
        clientEmail: state.editing.clientEmail,
        companyName: state.proposal.companyName,
        companyEmail: state.proposal.companyEmail,
        companyAddress: state.proposal.companyAddress,
        companyPhone: state.proposal.companyPhone
      };

  const handleServiceChange = useCallback((id: string, field: keyof ServiceItem, value: string) => {
    let parsed: string | number = value;
    if (field === 'unitPrice' || field === 'quantity') {
      parsed = parseFloat(value) || 0;
    }
    dispatch({ type: 'UPDATE_SERVICE', payload: { id, field, value: parsed } });
  }, []);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: generateId(),
      author: '访客用户',
      content: commentText.trim(),
      rating: commentRating,
      timestamp: Date.now()
    };
    dispatch({ type: 'ADD_COMMENT', payload: newComment });
    setCommentText('');
    setCommentRating(5);
  };

  const handleSaveVersion = () => {
    dispatch({ type: 'SAVE_VERSION' });
  };

  const handleRestoreVersion = (versionId: string) => {
    dispatch({ type: 'RESTORE_VERSION', payload: versionId });
  };

  const handleFlipEnd = () => {
    dispatch({ type: 'FINISH_FLIP' });
  };

  const sortedVersions = [...state.proposal.versions].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="page-container">
      <div className="back-link" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        返回看板
      </div>

      <div className="proposal-detail">
        <div className="detail-main">
          <div className="editor-section">
            <div className="editor-form">
              <h2 className="section-title">编辑提案</h2>

              <div className="form-group">
                <label className="form-label">项目状态</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={e => setStatus(e.target.value as ProposalStatus)}
                >
                  {(['draft', 'sent', 'accepted', 'rejected'] as ProposalStatus[]).map(s => (
                    <option key={s} value={s}>{statusLabels[s]}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">项目标题</label>
                <input
                  type="text"
                  className="form-input"
                  value={state.editing.title}
                  onChange={e => dispatch({ type: 'SET_TITLE', payload: e.target.value })}
                  placeholder="请输入项目标题"
                />
              </div>

              <div className="form-group">
                <label className="form-label">项目描述</label>
                <textarea
                  className="form-textarea"
                  value={state.editing.description}
                  onChange={e => dispatch({ type: 'SET_DESCRIPTION', payload: e.target.value })}
                  placeholder="请输入项目描述"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">客户姓名</label>
                  <input
                    type="text"
                    className="form-input"
                    value={state.editing.clientName}
                    onChange={e => dispatch({ type: 'SET_CLIENT_NAME', payload: e.target.value })}
                    placeholder="客户姓名"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">客户邮箱</label>
                  <input
                    type="email"
                    className="form-input"
                    value={state.editing.clientEmail}
                    onChange={e => dispatch({ type: 'SET_CLIENT_EMAIL', payload: e.target.value })}
                    placeholder="客户邮箱"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">服务项目清单</label>
                <div className="services-list">
                  {state.editing.services.map(service => (
                    <div key={service.id} className="service-item-row">
                      <div className="form-group" style={{ gridColumn: '1 / -2' }}>
                        <label className="form-label" style={{ fontSize: 12 }}>服务名称</label>
                        <input
                          type="text"
                          className="form-input"
                          value={service.name}
                          onChange={e => handleServiceChange(service.id, 'name', e.target.value)}
                          placeholder="服务名称"
                        />
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => dispatch({ type: 'REMOVE_SERVICE', payload: service.id })}
                        title="删除"
                      >
                        ×
                      </button>
                      <div className="form-group service-item-desc" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label" style={{ fontSize: 12 }}>服务描述</label>
                        <textarea
                          className="form-textarea"
                          value={service.description}
                          onChange={e => handleServiceChange(service.id, 'description', e.target.value)}
                          placeholder="服务范围、交付物等说明"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 12 }}>单价</label>
                        <input
                          type="number"
                          className="form-input"
                          value={service.unitPrice}
                          onChange={e => handleServiceChange(service.id, 'unitPrice', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 12 }}>数量</label>
                        <input
                          type="number"
                          className="form-input"
                          value={service.quantity}
                          onChange={e => handleServiceChange(service.id, 'quantity', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 12 }}>单位</label>
                        <select
                          className="form-select"
                          value={service.unit}
                          onChange={e => handleServiceChange(service.id, 'unit', e.target.value)}
                        >
                          <option value="项">项</option>
                          <option value="人天">人天</option>
                          <option value="套">套</option>
                          <option value="个">个</option>
                          <option value="小时">小时</option>
                          <option value="月">月</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 12 }}>小计</label>
                        <div style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {formatCurrency(service.unitPrice * service.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="add-service-btn"
                  onClick={() => dispatch({ type: 'ADD_SERVICE' })}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  添加服务项
                </button>
              </div>

              <div className="total-amount-box">
                <span className="total-amount-label">总金额</span>
                <span className="total-amount-value">
                  {formatCurrency(calcTotal(state.editing.services))}
                </span>
              </div>

              <div className="form-actions">
                <button className="btn-pill btn-pill-primary" onClick={handleSaveVersion}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  保存版本
                </button>
                <button className="btn-pill btn-pill-ghost" onClick={onBack}>
                  取消
                </button>
              </div>
            </div>

            <div className="editor-preview">
              <h2 className="section-title" style={{ marginBottom: 16 }}>
                实时预览
                {state.activeVersionId && (
                  <span style={{ fontSize: 12, color: 'var(--color-primary)', marginLeft: 8, fontWeight: 400 }}>
                    （查看历史版本）
                  </span>
                )}
              </h2>
              <ProposalPreview
                {...previewData}
                isFlipping={state.isFlipping}
                onFlipEnd={handleFlipEnd}
              />
            </div>
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              版本历史
            </h3>
            <div className="timeline">
              {sortedVersions.map((version, index) => (
                <div
                  key={version.id}
                  className={`timeline-item ${state.activeVersionId === version.id ? 'active' : ''}`}
                  onClick={() => handleRestoreVersion(version.id)}
                >
                  <div className="timeline-dot" />
                  <div className="timeline-item-title">
                    版本 {sortedVersions.length - index}
                  </div>
                  <div className="timeline-item-date">
                    {formatDateTime(version.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              客户反馈 ({state.proposal.comments.length})
            </h3>

            <div className="comment-form">
              <div style={{ marginBottom: 8 }}>
                <span className="form-label">您的评分</span>
                <StarRating rating={commentRating} onChange={setCommentRating} />
              </div>
              <textarea
                className="comment-input"
                placeholder="写下您的评论和反馈..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
              />
              <button
                className="btn-pill btn-pill-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleAddComment}
                disabled={!commentText.trim()}
              >
                提交评论
              </button>
            </div>

            <div className="comment-list">
              {[...state.proposal.comments]
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">{comment.author}</span>
                      <span className="comment-time">{formatDateTime(comment.timestamp)}</span>
                    </div>
                    <p className="comment-content">{comment.content}</p>
                    <div className="comment-rating">
                      {[1, 2, 3, 4, 5].map(s => (
                        <svg
                          key={s}
                          className="star-icon"
                          viewBox="0 0 24 24"
                          fill={s <= comment.rating ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalPage;
