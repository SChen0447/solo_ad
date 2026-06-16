import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Deck } from '../types';
import { getDueCards } from '../utils/sm2';
import { simpleMarkdown } from '../App';

interface Props {
  decks: Deck[];
  onCreateDeck: (name: string, desc: string) => void;
  onUpdateDeck: (deckId: string, name: string, desc: string) => void;
  onDeleteDeck: (deckId: string) => void;
  onAddCard: (deckId: string, front: string, back: string) => void;
  onDeleteCard: (deckId: string, cardId: string) => void;
  onStartReview: (deckId: string) => void;
}

export default function DeckManager({
  decks,
  onCreateDeck,
  onUpdateDeck,
  onDeleteDeck,
  onAddCard,
  onDeleteCard,
  onStartReview,
}: Props) {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const currentDeck = useMemo(
    () => decks.find((d) => d.id === deckId) || null,
    [decks, deckId]
  );

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const dueCount = currentDeck ? getDueCards(currentDeck.cards).length : 0;

  const openEditModal = () => {
    if (!currentDeck) return;
    setEditName(currentDeck.name);
    setEditDesc(currentDeck.description);
    setShowEdit(true);
  };

  const handleCreateSubmit = () => {
    if (!newName.trim()) return;
    onCreateDeck(newName.trim(), newDesc.trim());
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
  };

  const handleEditSubmit = () => {
    if (!currentDeck || !editName.trim()) return;
    onUpdateDeck(currentDeck.id, editName.trim(), editDesc.trim());
    setShowEdit(false);
  };

  const handleDeleteConfirm = () => {
    if (!currentDeck) return;
    onDeleteDeck(currentDeck.id);
    setShowDelete(false);
    navigate('/');
  };

  const handleAddCardSubmit = () => {
    if (!currentDeck || !cardFront.trim() || !cardBack.trim()) return;
    onAddCard(currentDeck.id, cardFront.trim(), cardBack.trim());
    setCardFront('');
    setCardBack('');
    setShowAddCard(false);
  };

  const truncateText = (text: string, max: number = 80) => {
    const clean = text.replace(/[#*`>\-]/g, '').trim();
    if (clean.length <= max) return clean;
    return clean.slice(0, max) + '...';
  };

  if (!currentDeck) {
    return (
      <div>
        <div className="section-header">
          <div>
            <div className="section-title">全部牌组</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }}>
              共 {decks.length} 个牌组
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            ＋ 新建牌组
          </button>
        </div>

        {decks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div className="empty-title">开始创建你的第一个牌组</div>
            <div className="empty-desc">将知识点整理成牌组，使用间隔重复算法高效复习</div>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              ＋ 创建牌组
            </button>
          </div>
        ) : (
          <div className="decks-grid">
            {decks.map((deck) => {
              const due = getDueCards(deck.cards).length;
              const masteredCount = deck.cards.filter((c) => c.interval >= 21).length;
              return (
                <div
                  key={deck.id}
                  className="deck-card"
                  onClick={() => navigate(`/deck/${deck.id}`)}
                >
                  <div className="deck-card-header">
                    <div>
                      <div className="deck-card-title">{deck.name}</div>
                    </div>
                    <div className="deck-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartReview(deck.id);
                        }}
                        title="开始复习"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                  <div className="deck-card-desc">
                    {deck.description || '暂无描述'}
                  </div>
                  <div className="deck-card-meta">
                    <div className="deck-card-meta-item">🃏 {deck.cards.length}</div>
                    {due > 0 ? (
                      <div className="deck-card-meta-item" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                        ⏰ {due} 待复习
                      </div>
                    ) : deck.cards.length > 0 ? (
                      <div className="deck-card-meta-item" style={{ color: 'var(--color-success)' }}>
                        ✓ 全部完成
                      </div>
                    ) : null}
                    <div className="deck-card-meta-item" style={{ marginLeft: 'auto' }}>
                      📈 {deck.cards.length > 0 ? Math.round((masteredCount / deck.cards.length) * 100) : 0}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showCreate && (
          <Modal title="新建牌组" onClose={() => setShowCreate(false)}>
            <ModalBody>
              <div className="form-group">
                <label className="form-label">牌组名称 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：英语词汇、React Hooks"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">描述</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 80 }}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="简短描述这个牌组"
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>
                取消
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleCreateSubmit} disabled={!newName.trim()}>
                创建
              </button>
            </ModalFooter>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="deck-detail-header">
        <div className="deck-detail-info">
          <h2>{currentDeck.name}</h2>
          <p>
            {currentDeck.description || '暂无描述'} · {currentDeck.cards.length} 张卡片 ·{' '}
            {dueCount > 0 ? (
              <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
                {dueCount} 张待复习
              </span>
            ) : currentDeck.cards.length > 0 ? (
              <span style={{ color: 'var(--color-success)' }}>今日全部完成 ✓</span>
            ) : (
              '暂无卡片'
            )}
          </p>
        </div>
        <div className="deck-detail-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
            ← 返回
          </button>
          <button className="btn btn-outline btn-sm" onClick={openEditModal}>
            ✎ 编辑
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setShowDelete(true)}
          >
            🗑 删除
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onStartReview(currentDeck.id)}
            disabled={dueCount === 0}
            style={dueCount === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            ▶ 开始复习 {dueCount > 0 && `(${dueCount})`}
          </button>
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ fontSize: 16 }}>
            🃏 卡片列表
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddCard(true)}>
            ＋ 添加卡片
          </button>
        </div>

        {currentDeck.cards.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 24px' }}>
            <div className="empty-icon" style={{ fontSize: 48 }}>➕</div>
            <div className="empty-title">还没有卡片</div>
            <div className="empty-desc">添加你的第一张闪卡，开始知识记忆</div>
            <button className="btn btn-primary" onClick={() => setShowAddCard(true)}>
              ＋ 添加卡片
            </button>
          </div>
        ) : (
          <div className="cards-list">
            {[...currentDeck.cards].reverse().map((card) => {
              const isDue = card.nextReviewDate <= Date.now();
              const isMastered = card.interval >= 21;
              let statusBadge: { text: string; color: string } = { text: '待复习', color: 'var(--color-accent)' };
              if (isMastered) statusBadge = { text: '已掌握', color: 'var(--color-success)' };
              else if (!isDue) statusBadge = { text: '学习中', color: 'var(--color-warning)' };

              return (
                <div key={card.id} className="card-item">
                  <div className="card-item-header">
                    <div style={{ flex: 1 }}>
                      <div className="card-item-front">
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: `${statusBadge.color}18`,
                          color: statusBadge.color,
                          fontSize: 11,
                          fontWeight: 600,
                          marginRight: 8,
                          verticalAlign: 'middle',
                        }}>
                          {statusBadge.text}
                        </span>
                        {truncateText(card.front, 120)}
                      </div>
                      <div
                        className="card-item-back"
                        dangerouslySetInnerHTML={{ __html: simpleMarkdown(truncateText(card.back, 150)) }}
                      />
                    </div>
                    <button
                      className="icon-btn danger"
                      onClick={() => {
                        if (confirm('确定删除这张卡片吗？')) {
                          onDeleteCard(currentDeck.id, card.id);
                        }
                      }}
                      title="删除卡片"
                    >
                      🗑
                    </button>
                  </div>
                  <div className="card-item-meta">
                    <span>间隔: {card.interval}天</span>
                    <span>难度: {(card.easinessFactor).toFixed(2)}</span>
                    <span>复习次数: {card.repetitions}</span>
                    <span>
                      下次: {new Date(card.nextReviewDate).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showEdit && (
        <Modal title="编辑牌组" onClose={() => setShowEdit(false)}>
          <ModalBody>
            <div className="form-group">
              <label className="form-label">牌组名称 *</label>
              <input
                type="text"
                className="form-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">描述</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: 80 }}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(false)}>
              取消
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleEditSubmit} disabled={!editName.trim()}>
              保存
            </button>
          </ModalFooter>
        </Modal>
      )}

      {showDelete && (
        <Modal title="删除牌组" onClose={() => setShowDelete(false)}>
          <ModalBody>
            <p style={{ lineHeight: 1.8 }}>
              确定要删除牌组 <strong style={{ color: 'var(--color-danger)' }}>「{currentDeck.name}」</strong> 吗？
            </p>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 8, fontSize: 14 }}>
              该牌组的 {currentDeck.cards.length} 张卡片和所有复习记录将被永久删除，此操作无法撤销。
            </p>
          </ModalBody>
          <ModalFooter>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowDelete(false)}>
              取消
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleDeleteConfirm}>
              确认删除
            </button>
          </ModalFooter>
        </Modal>
      )}

      {showAddCard && (
        <Modal title="添加卡片" onClose={() => setShowAddCard(false)} size="lg">
          <ModalBody>
            <div className="form-group">
              <label className="form-label">正面（问题）* - 支持 Markdown</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: 100 }}
                value={cardFront}
                onChange={(e) => setCardFront(e.target.value)}
                placeholder="例如：React 中 useState Hook 的作用是什么？"
                autoFocus
              />
              {cardFront.trim() && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                    预览：
                  </div>
                  <div
                    className="markdown-preview"
                    dangerouslySetInnerHTML={{ __html: simpleMarkdown(cardFront) }}
                  />
                </div>
              )}
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>背面（答案）* - 支持 Markdown</label>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setPreviewMode(!previewMode)}
                  style={{ padding: '4px 12px', fontSize: 12 }}
                >
                  {previewMode ? '✎ 编辑' : '👁 预览'}
                </button>
              </div>
              {previewMode ? (
                <div
                  className="markdown-preview"
                  style={{ minHeight: 140 }}
                  dangerouslySetInnerHTML={{ __html: simpleMarkdown(cardBack || '*暂无内容*') }}
                />
              ) : (
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 140 }}
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  placeholder={`例如：\nuseState 用于在函数组件中添加状态。\n\n\`\`\`js\nconst [count, setCount] = useState(0);\n\`\`\`\n\n- 返回**状态值**和**更新函数**\n- 参数为**初始状态**`}
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddCard(false)}>
              取消
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddCardSubmit}
              disabled={!cardFront.trim() || !cardBack.trim()}
            >
              添加
            </button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  size = 'md',
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: 'md' | 'lg';
}) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={size === 'lg' ? { maxWidth: 640 } : {}}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalBody({ children }: { children: React.ReactNode }) {
  return <div className="modal-body">{children}</div>;
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="modal-footer">{children}</div>;
}
