import React, { useState } from 'react';
import type { Tree } from '../types';

interface TreeDetailProps {
  tree: Tree;
  onBack: () => void;
  onClaim: () => void;
  onAddRecord: (record: { date: string; height: number; description: string; photoUrl: string }) => void;
  currentUserId: string;
}

const TreeDetail: React.FC<TreeDetailProps> = ({ tree, onBack, onClaim, onAddRecord, currentUserId }) => {
  const [showForm, setShowForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    height: 100,
    description: '',
    photoUrl: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddRecord(newRecord);
    setShowForm(false);
    setNewRecord({
      date: new Date().toISOString().split('T')[0],
      height: 100,
      description: '',
      photoUrl: '',
    });
  };

  const isClaimed = !!tree.claimerId;
  const isOwner = tree.claimerId === currentUserId;

  const sortedRecords = [...tree.growthRecords].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="page tree-detail">
      <div className="back-btn" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        返回地图
      </div>

      <div className="tree-detail-header">
        <div
          className="tree-detail-circle"
          style={{ background: tree.speciesColor || '#BDBDBD' }}
        >
          🌳
        </div>
        <div className="tree-detail-info">
          <h2>{tree.name}</h2>
          <p>品种: {tree.species}</p>
          {isClaimed ? (
            <>
              <p>认养人: {tree.claimerName}</p>
              <p>认养日期: {tree.claimDate}</p>
            </>
          ) : (
            <p style={{ color: '#F57C00' }}>待认养</p>
          )}
        </div>
      </div>

      {!isClaimed && (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ marginBottom: 12 }}>这棵树还没有被认养，点击下方按钮认养这棵树。</p>
          <button className="btn" onClick={onClaim}>立即认养</button>
        </div>
      )}

      <div className="card">
        <h3 className="section-title" style={{ marginBottom: 20 }}>成长记录</h3>

        {sortedRecords.length === 0 ? (
          <div className="empty">暂无成长记录</div>
        ) : (
          <div className="timeline">
            {sortedRecords.map(record => (
              <div key={record.id} className="timeline-item">
                <div className="timeline-date">{record.date}</div>
                <div className="timeline-height">高度: {record.height} cm</div>
                <div className="timeline-desc">{record.description}</div>
                {record.photoUrl && (
                  <img
                    src={record.photoUrl}
                    alt="生长记录"
                    style={{ marginTop: 8, maxWidth: 200, borderRadius: 8 }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <>
            <button
              className="btn"
              style={{ marginTop: 16 }}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '取消' : '添加记录'}
            </button>

            {showForm && (
              <form className="add-record-form" onSubmit={handleSubmit}>
                <h4>添加生长记录</h4>
                <div className="form-group">
                  <label>日期</label>
                  <input
                    type="date"
                    value={newRecord.date}
                    onChange={e => setNewRecord(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>高度 (cm)</label>
                  <input
                    type="number"
                    value={newRecord.height}
                    onChange={e => setNewRecord(prev => ({ ...prev, height: Number(e.target.value) }))}
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>描述</label>
                  <textarea
                    value={newRecord.description}
                    onChange={e => setNewRecord(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>照片URL (可选)</label>
                  <input
                    type="url"
                    value={newRecord.photoUrl}
                    onChange={e => setNewRecord(prev => ({ ...prev, photoUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <button type="submit" className="btn">保存记录</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TreeDetail;
