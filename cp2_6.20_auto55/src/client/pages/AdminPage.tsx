import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Activity } from '../api';
import { useAuth } from '../App';

const SKILL_OPTIONS = ['教学', '陪伴老人', '医疗护理', '急救', '维修', '搬运', '耐心', '管理', '清洁', '烹饪', '翻译', '心理咨询'];

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    location: '',
    dateTime: '',
    maxParticipants: '',
    duration: '2',
    description: '',
    skillsRequired: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/login');
      return;
    }
    refresh();
  }, [user, navigate]);

  const refresh = () => {
    api.getActivities().then(setActivities).finally(() => setLoading(false));
  };

  const toggleSkill = (s: string) => {
    setForm(f => ({
      ...f,
      skillsRequired: f.skillsRequired.includes(s)
        ? f.skillsRequired.filter(x => x !== s)
        : [...f.skillsRequired, s],
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.location || !form.dateTime || !form.maxParticipants) {
      showMsg('err', '请填写所有必填项');
      return;
    }
    setSubmitting(true);
    try {
      await api.createActivity({
        name: form.name.trim(),
        location: form.location.trim(),
        dateTime: form.dateTime.replace('T', ' '),
        maxParticipants: parseInt(form.maxParticipants),
        description: form.description.trim(),
        skillsRequired: form.skillsRequired,
        duration: parseInt(form.duration) || 2,
      });
      showMsg('ok', '🎉 活动发布成功！');
      setForm({ name: '', location: '', dateTime: '', maxParticipants: '', duration: '2', description: '', skillsRequired: [] });
      setShowForm(false);
      refresh();
    } catch (e: any) {
      showMsg('err', e.message || '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  if (!user?.isAdmin) return null;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {msg && (
        <div style={{
          position: 'fixed',
          top: 72,
          left: '50%',
          transform: 'translateX(-50%)',
          background: msg.type === 'ok' ? '#DCFCE7' : '#FEE2E2',
          color: msg.type === 'ok' ? '#15803D' : '#B91C1C',
          padding: '10px 22px',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 14,
          zIndex: 90,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>{msg.text}</div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#292524' }}>⚙️ 管理后台</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#78716C' }}>发布和管理社区志愿活动</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 22px',
            borderRadius: 10,
            border: 'none',
            background: showForm ? '#E5E7EB' : 'linear-gradient(135deg, #F59E0B, #D97706)',
            color: showForm ? '#374151' : '#FFF',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 4px 14px rgba(245, 158, 11, 0.3)',
            transition: 'transform 0.15s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >{showForm ? '取消' : '+ 发布新活动'}</button>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{
          background: '#FFF',
          borderRadius: 16,
          padding: 28,
          marginBottom: 24,
          boxShadow: '0 2px 12px rgba(245, 158, 11, 0.06)',
          animation: 'fadeUp 0.3s ease-out both',
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: '#292524' }}>📋 发布新活动</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <AdminField label="活动名称" required>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="请输入活动名称" style={inStyle} />
            </AdminField>
            <AdminField label="活动地点" required>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="请输入活动地点" style={inStyle} />
            </AdminField>
            <AdminField label="日期时间" required>
              <input type="datetime-local" value={form.dateTime} onChange={e => setForm({ ...form, dateTime: e.target.value })}
                style={inStyle} />
            </AdminField>
            <AdminField label="招募人数上限" required>
              <input type="number" min="1" value={form.maxParticipants} onChange={e => setForm({ ...form, maxParticipants: e.target.value })}
                placeholder="例如：20" style={inStyle} />
            </AdminField>
            <AdminField label="活动时长（小时）">
              <input type="number" min="1" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}
                style={inStyle} />
            </AdminField>
            <AdminField label="技能要求（可多选）">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SKILL_OPTIONS.map(s => (
                  <button type="button" key={s} onClick={() => toggleSkill(s)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      border: form.skillsRequired.includes(s) ? 'none' : '1px solid #E7E5E4',
                      background: form.skillsRequired.includes(s) ? '#3B82F6' : '#FFF',
                      color: form.skillsRequired.includes(s) ? '#FFF' : '#57534E',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>{s}</button>
                ))}
              </div>
            </AdminField>
          </div>
          <div style={{ marginTop: 16 }}>
            <AdminField label="活动描述">
              <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="请详细描述活动内容、注意事项等"
                style={{ ...inStyle, resize: 'vertical' }} />
            </AdminField>
          </div>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => setShowForm(false)}
              style={{
                padding: '10px 22px',
                borderRadius: 10,
                border: '1px solid #E7E5E4',
                background: '#FFF',
                color: '#57534E',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}>取消</button>
            <button type="submit" disabled={submitting}
              style={{
                padding: '10px 28px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#FFF',
                fontWeight: 700,
                fontSize: 14,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
                opacity: submitting ? 0.7 : 1,
                transition: 'transform 0.15s',
              }}
              onMouseDown={e => { if (!submitting) e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >{submitting ? '发布中...' : '🚀 发布活动'}</button>
          </div>
        </form>
      )}

      <div style={{
        background: '#FFF',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(245, 158, 11, 0.06)',
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #F5F5F4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#292524' }}>
            📋 活动管理 <span style={{ color: '#A8A29E', fontWeight: 500, fontSize: 13 }}>({activities.length})</span>
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#A8A29E' }}>加载中...</div>
        ) : activities.length === 0 ? (
          <div style={{ padding: 50, textAlign: 'center', color: '#A8A29E' }}>暂无活动，点击上方按钮发布</div>
        ) : (
          activities.map((a, i) => (
            <div key={a.id} style={{
              padding: '16px 24px',
              borderBottom: i < activities.length - 1 ? '1px solid #FAFAF9' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FFFBEB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => navigate(`/activity/${a.id}`)}
            >
              <div style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    background: a.status === 'recruiting' ? '#DCFCE7' : a.status === 'upcoming' ? '#FEF3C7' : '#FEE2E2',
                    color: a.status === 'recruiting' ? '#15803D' : a.status === 'upcoming' ? '#92400E' : '#B91C1C',
                  }}>
                    {a.status === 'recruiting' ? '招募中' : a.status === 'upcoming' ? '即将开始' : '已结束'}
                  </span>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#292524' }}>{a.name}</h3>
                </div>
                <div style={{ fontSize: 13, color: '#78716C', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>📍 {a.location}</span>
                  <span>🗓 {a.dateTime}</span>
                  <span>👥 {a.registeredCount}/{a.maxParticipants}</span>
                  <span>⏱ {a.duration}h</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); navigate(`/activity/${a.id}`); }}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid #FCD34D',
                  background: '#FFFBEB',
                  color: '#B45309',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>查看详情</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const inStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1.5px solid #E7E5E4',
  fontSize: 13,
  outline: 'none',
  transition: 'all 0.25s',
  background: '#FFF',
  color: '#292524',
  boxSizing: 'border-box',
};

function AdminField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        color: '#44403C',
        marginBottom: 6,
      }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
