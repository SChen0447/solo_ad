import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { VoteType, CreateRoomResponse } from '../../shared/types';

const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'create' | 'join' | 'success'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [voteType, setVoteType] = useState<VoteType>('single');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreateRoomResponse | null>(null);

  const addOption = () => {
    if (options.length < 8) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedOpts = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!title.trim()) {
      setError('请输入投票主题');
      return;
    }
    if (trimmedOpts.length < 2) {
      setError('至少需要2个有效选项');
      return;
    }
    if (trimmedOpts.length > 8) {
      setError('最多支持8个选项');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          options: trimmedOpts,
          voteType,
        }),
      });
      if (!res.ok) throw new Error('创建失败');
      const data: CreateRoomResponse = await res.json();
      setCreated(data);
      setMode('success');
    } catch (err) {
      setError('创建房间失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = joinCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('请输入6位房间码');
      return;
    }
    navigate(`/vote/${code}`);
  };

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '32px 24px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 700,
            color: '#e2e8f0',
            marginBottom: '8px',
            letterSpacing: '-0.5px',
          }}
        >
          QuickVote
        </h1>
        <p style={{ color: '#a0aec0', fontSize: '16px' }}>
          轻量级投票与观点收集工具，无需注册，即刻开始
        </p>
      </div>

      {mode !== 'success' && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '28px',
          }}
        >
          <button
            onClick={() => {
              setMode('create');
              setError('');
            }}
            style={{
              padding: '10px 28px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              backgroundColor: mode === 'create' ? '#6b46c1' : '#2d3748',
              color: '#fff',
              transition: 'background-color 0.2s',
            }}
          >
            创建投票
          </button>
          <button
            onClick={() => {
              setMode('join');
              setError('');
            }}
            style={{
              padding: '10px 28px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              backgroundColor: mode === 'join' ? '#6b46c1' : '#2d3748',
              color: '#fff',
              transition: 'background-color 0.2s',
            }}
          >
            加入投票
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(229, 62, 62, 0.15)',
            border: '1px solid rgba(229, 62, 62, 0.4)',
            borderRadius: '10px',
            color: '#fc8181',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {mode === 'create' && (
        <div
          style={{
            backgroundColor: '#2d3748',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          }}
        >
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>投票主题 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：团队下周团建去哪里？"
                style={inputStyle}
                maxLength={100}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>描述（可选）</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="补充说明..."
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                maxLength={500}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>投票类型</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[
                  { v: 'single' as VoteType, label: '单选' },
                  { v: 'multiple' as VoteType, label: '多选' },
                  { v: 'ranking' as VoteType, label: '排序' },
                ].map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setVoteType(t.v)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '8px',
                      border: voteType === t.v ? '2px solid #6b46c1' : '2px solid #4a5568',
                      backgroundColor: voteType === t.v ? 'rgba(107,70,193,0.2)' : 'transparent',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>
                选项 * ({options.length}/8)
                {voteType === 'ranking' && '（排序模式需拖动调整顺序）'}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {options.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: '#6b46c1',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {voteType === 'ranking' ? options.length - idx : idx + 1}
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={`选项 ${idx + 1}`}
                      style={{ ...inputStyle, margin: 0 }}
                      maxLength={100}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'rgba(229, 62, 62, 0.2)',
                          color: '#fc8181',
                          cursor: 'pointer',
                          fontSize: '18px',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 8 && (
                  <button
                    type="button"
                    onClick={addOption}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: '2px dashed #4a5568',
                      backgroundColor: 'transparent',
                      color: '#a0aec0',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s',
                    }}
                  >
                    + 添加选项
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#6b46c1',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
            >
              {loading ? '创建中...' : '创建投票房间'}
            </button>
          </form>
        </div>
      )}

      {mode === 'join' && (
        <div
          style={{
            backgroundColor: '#2d3748',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            maxWidth: '420px',
            margin: '0 auto',
          }}
        >
          <form onSubmit={handleJoin}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ ...labelStyle, textAlign: 'center', display: 'block' }}>
                输入6位房间码
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="XXXXXX"
                style={{
                  ...inputStyle,
                  fontSize: '32px',
                  textAlign: 'center',
                  letterSpacing: '12px',
                  padding: '16px',
                }}
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#6b46c1',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              加入投票
            </button>
          </form>
        </div>
      )}

      {mode === 'success' && created && (
        <div
          style={{
            backgroundColor: '#2d3748',
            borderRadius: '16px',
            padding: '36px 28px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            maxWidth: '520px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(56, 161, 105, 0.2)',
              color: '#48bb78',
              fontSize: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            ✓
          </div>
          <h2 style={{ color: '#e2e8f0', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
            投票房间创建成功！
          </h2>
          <p style={{ color: '#a0aec0', marginBottom: '28px' }}>
            请保存以下信息并分享给参与者
          </p>

          <div
            style={{
              backgroundColor: '#1a202c',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
            }}
          >
            <div style={{ color: '#a0aec0', fontSize: '13px', marginBottom: '6px' }}>房间码</div>
            <div
              style={{
                fontSize: '36px',
                fontWeight: 700,
                color: '#6b46c1',
                letterSpacing: '8px',
              }}
            >
              {created.code}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(237, 137, 54, 0.1)',
              border: '1px solid rgba(237, 137, 54, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}
          >
            <div style={{ color: '#ed8936', fontSize: '13px', marginBottom: '6px' }}>
              ⚠️ 管理密钥（仅创建者可见）
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#fbd38d',
                letterSpacing: '3px',
                fontFamily: 'monospace',
              }}
            >
              {created.adminKey}
            </div>
            <div style={{ color: '#a0aec0', fontSize: '12px', marginTop: '8px' }}>
              用于管理面板操作，请妥善保存
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate(`/vote/${created.code}`)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#6b46c1',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              进入投票
            </button>
            <button
              onClick={() => navigate(`/result/${created.code}`)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '2px solid #4a5568',
                backgroundColor: 'transparent',
                color: '#e2e8f0',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              查看结果
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#e2e8f0',
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '8px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '10px',
  border: '2px solid #4a5568',
  backgroundColor: '#1a202c',
  color: '#e2e8f0',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  marginBottom: '4px',
};

export default LobbyPage;
