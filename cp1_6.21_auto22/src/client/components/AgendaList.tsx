import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Agenda, Topic } from '../../shared/types';

interface Props {
  agendas: Agenda[];
  onRefresh: () => void;
  onOpen: (agenda: Agenda) => void;
}

const AgendaList: React.FC<Props> = ({ agendas, onRefresh, onOpen }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    time: new Date().toISOString().slice(0, 16),
    participants: '',
    description: '',
  });
  const [topics, setTopics] = useState<{ title: string; assignee: string; deadline: string }[]>([
    { title: '', assignee: '', deadline: '' },
  ]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    await fetch('/api/agendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        participants: form.participants.split(',').map((p) => p.trim()).filter(Boolean),
        topics,
      }),
    });
    setForm({ title: '', time: new Date().toISOString().slice(0, 16), participants: '', description: '' });
    setTopics([{ title: '', assignee: '', deadline: '' }]);
    setShowModal(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/agendas/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    onRefresh();
  };

  const addTopicRow = () => {
    setTopics([...topics, { title: '', assignee: '', deadline: '' }]);
  };

  const updateTopicRow = (index: number, field: string, value: string) => {
    const updated = [...topics];
    updated[index] = { ...updated[index], [field]: value };
    setTopics(updated);
  };

  const removeTopicRow = (index: number) => {
    if (topics.length <= 1) return;
    setTopics(topics.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="page-header">
        <h1>📅 会议议程</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 新建议程
        </button>
      </div>

      {agendas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>暂无会议议程</h3>
          <p>点击"新建议程"开始创建</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {agendas.map((agenda) => (
            <div
              key={agenda._id}
              className="card agenda-card"
              onClick={() => onOpen(agenda)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--slate-800)', marginBottom: 4 }}>
                    {agenda.title}
                  </h3>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--slate-500)', marginBottom: 8 }}>
                    <span>🕐 {new Date(agenda.time).toLocaleString('zh-CN')}</span>
                    <span>👥 {agenda.participants.length} 人</span>
                    <span>📋 {agenda.topics.length} 个议题</span>
                  </div>
                  {agenda.description && (
                    <p style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 8 }}>{agenda.description}</p>
                  )}
                  {agenda.participants.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {agenda.participants.map((p, i) => (
                        <span
                          key={i}
                          style={{
                            background: 'var(--sky-100)',
                            color: 'var(--sky-700)',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(agenda._id);
                  }}
                  style={{ color: 'var(--red-500)', flexShrink: 0 }}
                >
                  🗑
                </button>
              </div>
              {agenda.topics.length > 0 && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--slate-100)', paddingTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 6 }}>
                    议题进度
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {agenda.topics.map((t, i) => (
                      <span
                        key={t.id}
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: t.completed ? 'var(--green-100)' : 'var(--slate-100)',
                          color: t.completed ? 'var(--green-700)' : 'var(--slate-600)',
                        }}
                      >
                        {t.completed ? '✓' : '○'} {t.title || `议题${i + 1}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deletingId && (
        <div className="modal-overlay" onClick={() => setDeletingId(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认删除</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--slate-600)' }}>
                确定要删除此议程吗？相关备注和行动项也将被删除。
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeletingId(null)}>取消</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deletingId)}>删除</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新建会议议程</h3>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>会议标题</label>
                <input
                  className="form-input"
                  placeholder="输入会议标题..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>会议时间</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>参会人员（逗号分隔）</label>
                <input
                  className="form-input"
                  placeholder="张三, 李四, 王五..."
                  value={form.participants}
                  onChange={(e) => setForm({ ...form, participants: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>主题描述</label>
                <textarea
                  className="form-input"
                  placeholder="简要描述会议主题..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>议题列表</label>
                {topics.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginBottom: 8,
                      alignItems: 'center',
                    }}
                  >
                    <input
                      className="form-input"
                      placeholder="议题标题"
                      value={t.title}
                      onChange={(e) => updateTopicRow(i, 'title', e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <input
                      className="form-input"
                      placeholder="负责人"
                      value={t.assignee}
                      onChange={(e) => updateTopicRow(i, 'assignee', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      className="form-input"
                      type="date"
                      value={t.deadline}
                      onChange={(e) => updateTopicRow(i, 'deadline', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {topics.length > 1 && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeTopicRow(i)}
                        style={{ color: 'var(--red-500)' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button className="btn btn-ghost" onClick={addTopicRow} style={{ fontSize: 13 }}>
                  + 添加议题
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-success" onClick={handleSubmit}>创建议程</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaList;
