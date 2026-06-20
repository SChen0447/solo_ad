import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';

const SKILL_OPTIONS = ['教学', '陪伴老人', '医疗护理', '急救', '维修', '搬运', '耐心', '管理', '清洁', '烹饪', '翻译', '心理咨询'];
const SLOT_OPTIONS = ['工作日上午', '工作日下午', '工作日晚上', '周末上午', '周末下午', '周末全天', '全天'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    nickname: '',
    email: '',
    password: '',
    confirmPwd: '',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const toggle = (arr: string[], setArr: (a: string[]) => void, v: string) => {
    setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (form.password !== form.confirmPwd) { setErr('两次密码不一致'); return; }
    if (form.password.length < 6) { setErr('密码至少6位'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setErr('请输入有效邮箱'); return; }
    if (!form.nickname.trim()) { setErr('请输入昵称'); return; }
    setLoading(true);
    try {
      const res = await api.register({
        nickname: form.nickname.trim(),
        email: form.email.trim(),
        password: form.password,
        skills,
        availableSlots: slots,
      });
      setUser(res.user);
      navigate('/profile');
    } catch (e: any) {
      setErr(e.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{
        background: '#FFF',
        borderRadius: 20,
        padding: 32,
        boxShadow: '0 4px 24px rgba(245, 158, 11, 0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌟</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#292524' }}>成为志愿者</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#78716C' }}>加入我们，一起用爱心温暖社区</p>
        </div>

        {err && (
          <div style={{
            padding: '10px 14px',
            background: '#FEE2E2',
            color: '#B91C1C',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 18,
          }}>⚠️ {err}</div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <FormField label="昵称" required>
            <input
              type="text"
              value={form.nickname}
              onChange={e => setForm({ ...form, nickname: e.target.value })}
              placeholder="请输入昵称"
              style={inputStyle}
            />
          </FormField>

          <FormField label="邮箱" required>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              style={inputStyle}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="密码" required>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="至少6位"
                style={inputStyle}
              />
            </FormField>
            <FormField label="确认密码" required>
              <input
                type="password"
                value={form.confirmPwd}
                onChange={e => setForm({ ...form, confirmPwd: e.target.value })}
                placeholder="再次输入密码"
                style={inputStyle}
              />
            </FormField>
          </div>

          <FormField label="技能标签（可多选）">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SKILL_OPTIONS.map(s => {
                const selected = skills.includes(s);
                return (
                  <button type="button" key={s}
                    onClick={() => toggle(skills, setSkills, s)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: selected ? 'none' : '1px solid #E7E5E4',
                      background: selected ? 'linear-gradient(135deg, #3B82F6, #6366F1)' : '#FFF',
                      color: selected ? '#FFF' : '#57534E',
                      fontSize: 13,
                      fontWeight: selected ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}>{s}</button>
                );
              })}
            </div>
          </FormField>

          <FormField label="可服务时段（可多选）">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SLOT_OPTIONS.map(s => {
                const selected = slots.includes(s);
                return (
                  <button type="button" key={s}
                    onClick={() => toggle(slots, setSlots, s)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: selected ? 'none' : '1px solid #E7E5E4',
                      background: selected ? 'linear-gradient(135deg, #F59E0B, #D97706)' : '#FFF',
                      color: selected ? '#FFF' : '#57534E',
                      fontSize: 13,
                      fontWeight: selected ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}>{s}</button>
                );
              })}
            </div>
          </FormField>

          <button type="submit" disabled={loading}
            style={{
              padding: '13px 24px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#FFF',
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
              transition: 'transform 0.15s',
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
            onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading ? '注册中...' : '🎯 立即注册'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: 22,
          paddingTop: 18,
          borderTop: '1px solid #F5F5F4',
          fontSize: 13,
          color: '#78716C',
        }}>
          已有账号？<Link to="/login" style={{ color: '#F59E0B', fontWeight: 600, textDecoration: 'none' }}>去登录</Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 8,
  border: '1.5px solid #E7E5E4',
  fontSize: 14,
  outline: 'none',
  transition: 'all 0.25s ease',
  background: '#FFF',
  color: '#292524',
};

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: '#44403C',
        marginBottom: 8,
      }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
