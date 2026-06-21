import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import RoomCard from './components/RoomCard';
import ForceGraph from './components/ForceGraph';

interface Member {
  id: string;
  room_id: string;
  name: string;
  color: string;
}

interface Room {
  id: string;
  code: string;
  activity_name: string;
  creator_id: string;
  status: string;
  created_at: string;
  members: Member[];
}

interface Evaluation {
  id: string;
  to_member_id: string;
  style: string;
  content: string;
  created_at: string;
}

const STYLE_COLORS: Record<string, string> = {
  encourage: '#48bb78',
  constructive: '#ed8936',
  humorous: '#9f7aea'
};

const STYLE_NAMES: Record<string, string> = {
  encourage: '鼓励型',
  constructive: '建设型',
  humorous: '幽默型'
};

const STYLE_PROMPTS: Record<string, string> = {
  encourage: '在TA身上，我最欣赏的一点是...',
  constructive: '如果让我给TA一个小建议，我会说...',
  humorous: '关于TA，我最想讲的段子是...'
};

function CreateRoomPage() {
  const navigate = useNavigate();
  const [activityName, setActivityName] = useState('');
  const [members, setMembers] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addMember = () => {
    if (members.length < 15) {
      setMembers([...members, '']);
    }
  };

  const removeMember = (index: number) => {
    if (members.length > 2) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const updateMember = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const handleSubmit = async () => {
    const validMembers = members.filter(m => m.trim());
    if (!activityName.trim()) {
      setError('请输入活动名称');
      return;
    }
    if (validMembers.length < 2) {
      setError('至少需要2位成员');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityName: activityName.trim(),
          memberNames: validMembers.map(m => m.trim())
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '创建失败');
      }

      localStorage.setItem(`room_${data.code}_memberId`, data.creatorId);
      navigate(`/room/${data.code}`);
    } catch (err: any) {
      setError(err.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 640,
      margin: '0 auto',
      padding: '40px 20px',
      minHeight: '100vh'
    }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: 700,
        textAlign: 'center',
        marginBottom: 32,
        color: '#2d3748'
      }}>
        创建评价房间
      </h1>

      {error && (
        <div style={{
          background: '#fff5f5',
          color: '#c53030',
          padding: 12,
          borderRadius: 12,
          marginBottom: 20,
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      <div style={{
        background: '#fff',
        padding: 28,
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
            color: '#2d3748'
          }}>
            活动名称
          </label>
          <input
            type="text"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            placeholder="如：黑客松团队复盘"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              fontSize: 16,
              outline: 'none',
              transition: 'box-shadow 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = '0 0 0 4px rgba(237, 137, 54, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12
          }}>
            <label style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#2d3748'
            }}>
              成员名单 ({members.length}/15)
            </label>
            {members.length < 15 && (
              <button
                onClick={addMember}
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  color: '#ed8936',
                  border: '1px solid #ed8936',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                + 添加成员
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.map((member, index) => (
              <div key={index} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={member}
                  onChange={(e) => updateMember(index, e.target.value)}
                  placeholder={`成员 ${index + 1}`}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'box-shadow 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = '0 0 0 4px rgba(237, 137, 54, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {members.length > 2 && (
                  <button
                    onClick={() => removeMember(index)}
                    style={{
                      width: 40,
                      background: '#fff5f5',
                      color: '#c53030',
                      border: '1px solid #fed7d7',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontSize: 18
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 12,
            display: 'block',
            color: '#2d3748'
          }}>
            评价风格模板
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {Object.entries(STYLE_NAMES).map(([key, name]) => (
              <div
                key={key}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: `2px solid ${STYLE_COLORS[key]}`,
                  background: `${STYLE_COLORS[key]}10`,
                  textAlign: 'center',
                  fontSize: 13
                }}
              >
                <div style={{
                  fontWeight: 600,
                  color: STYLE_COLORS[key],
                  marginBottom: 4
                }}>
                  {name}
                </div>
                <div style={{
                  fontSize: 11,
                  color: '#718096',
                  lineHeight: 1.4
                }}>
                  {STYLE_PROMPTS[key]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: loading ? '#cbd5e0' : '#ed8936',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {loading ? '创建中...' : '创建房间'}
        </button>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/join" style={{
            color: '#ed8936',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500
          }}>
            已有房间码？直接加入 →
          </Link>
        </div>
      </div>
    </div>
  );
}

function JoinRoomPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const handleCheckRoom = async () => {
    if (!code.trim()) {
      setError('请输入房间码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/rooms/${code.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '房间不存在');
      setRoom(data);
    } catch (err: any) {
      setError(err.message || '房间不存在');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (!selectedMemberId) {
      setError('请选择你的身份');
      return;
    }
    localStorage.setItem(`room_${room!.code}_memberId`, selectedMemberId);
    navigate(`/room/${room!.code}`);
  };

  return (
    <div style={{
      maxWidth: 520,
      margin: '0 auto',
      padding: '40px 20px',
      minHeight: '100vh'
    }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: 700,
        textAlign: 'center',
        marginBottom: 32,
        color: '#2d3748'
      }}>
        加入评价房间
      </h1>

      {error && (
        <div style={{
          background: '#fff5f5',
          color: '#c53030',
          padding: 12,
          borderRadius: 12,
          marginBottom: 20,
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      <div style={{
        background: '#fff',
        padding: 28,
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        {!room ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
                color: '#2d3748'
              }}>
                8位房间码
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="输入房间码，如：AB12CD34"
                maxLength={8}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: 20,
                  letterSpacing: 4,
                  textAlign: 'center',
                  outline: 'none',
                  fontFamily: 'monospace',
                  transition: 'box-shadow 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.boxShadow = '0 0 0 4px rgba(237, 137, 54, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <button
              onClick={handleCheckRoom}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: loading ? '#cbd5e0' : '#ed8936',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '查询中...' : '查询房间'}
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                fontSize: 13,
                color: '#718096',
                marginBottom: 6
              }}>
                活动名称
              </div>
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#2d3748'
              }}>
                {room.activity_name}
              </div>
              <div style={{
                marginTop: 8,
                fontSize: 12,
                color: '#a0aec0'
              }}>
                房间码: {room.code}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 10,
                color: '#2d3748'
              }}>
                请选择你的身份
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {room.members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    style={{
                      padding: 12,
                      background: selectedMemberId === m.id ? `${m.color}30` : '#f7fafc',
                      border: selectedMemberId === m.id ? `2px solid ${m.color}` : '2px solid transparent',
                      borderRadius: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: m.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 700
                    }}>
                      {m.name.charAt(0)}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleJoin}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: '#ed8936',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              进入房间
            </button>
          </>
        )}

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/" style={{
            color: '#ed8936',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500
          }}>
            ← 返回创建房间
          </Link>
        </div>
      </div>
    </div>
  );
}

function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [evaluatedByMe, setEvaluatedByMe] = useState<string[]>([]);
  const [memberEvalCount, setMemberEvalCount] = useState<Record<string, number>>({});
  const [currentMemberId, setCurrentMemberId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (code) {
      const memberId = localStorage.getItem(`room_${code}_memberId`);
      if (!memberId) {
        navigate(`/join`);
        return;
      }
      setCurrentMemberId(memberId);
      loadData(memberId);
    }
  }, [code]);

  const loadData = async (memberId: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}/evaluations?memberId=${memberId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoom(data.room);
      setEvaluations(data.evaluations);
      setEvaluatedByMe(data.evaluatedByMember[memberId] || []);
      setMemberEvalCount(data.memberEvalCount || {});
      if (data.isComplete && data.room.status === 'ended') {
        navigate(`/result/${code}`);
      }
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberClick = (memberId: string) => {
    if (memberId === currentMemberId) return;
    if (evaluatedByMe.includes(memberId)) return;
    navigate(`/evaluate/${code}/${memberId}`);
  };

  const handleEndRoom = async () => {
    if (!room || !code) return;
    try {
      const res = await fetch(`/api/rooms/${code}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: currentMemberId })
      });
      if (!res.ok) throw new Error('只有创建者可以结束评价');
      navigate(`/result/${code}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: '#718096' }}>加载中...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: '#c53030', marginBottom: 16 }}>{error || '加载失败'}</div>
        <Link to="/join" style={{ color: '#ed8936' }}>返回</Link>
      </div>
    );
  }

  const isCreator = currentMemberId === room.creator_id;
  const totalPossible = room.members.length * (room.members.length - 1);

  return (
    <div style={{
      padding: '24px 20px',
      maxWidth: 1200,
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      <div style={{
        background: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <div style={{ fontSize: 13, color: '#718096', marginBottom: 4 }}>活动名称</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2d3748' }}>
              {room.activity_name}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: '#a0aec0' }}>
              房间码: <span style={{ fontFamily: 'monospace', letterSpacing: 2 }}>{room.code}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              padding: '8px 16px',
              background: '#f7fafc',
              borderRadius: 8,
              fontSize: 13
            }}>
              进度: {evaluations.length}/{totalPossible}
            </div>
            {isCreator && (
              <button
                onClick={handleEndRoom}
                style={{
                  padding: '10px 20px',
                  background: '#2d3748',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                结束评价并查看结果
              </button>
            )}
          </div>
        </div>
      </div>

      <RoomCard
        members={room.members}
        evaluatedByMe={evaluatedByMe}
        memberEvalCount={memberEvalCount}
        currentMemberId={currentMemberId}
        onMemberClick={handleMemberClick}
      />

      <div style={{
        marginTop: 24,
        background: '#fff',
        padding: 16,
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{ fontSize: 13, color: '#718096', marginBottom: 8 }}>评价风格说明</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(STYLE_NAMES).map(([key, name]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: STYLE_COLORS[key]
              }} />
              <span style={{ fontSize: 13, color: '#4a5568' }}>
                {name}: {STYLE_PROMPTS[key]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvaluatePage() {
  const { code, memberId } = useParams<{ code: string; memberId: string }>();
  const navigate = useNavigate();
  const [targetMember, setTargetMember] = useState<Member | null>(null);
  const [style, setStyle] = useState<string>('encourage');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentMemberId, setCurrentMemberId] = useState('');

  useEffect(() => {
    if (code) {
      const mId = localStorage.getItem(`room_${code}_memberId`);
      if (!mId) {
        navigate('/join');
        return;
      }
      setCurrentMemberId(mId);
      loadRoom(mId);
    }
  }, [code]);

  const loadRoom = async (mId: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const target = data.members.find((m: Member) => m.id === memberId);
      if (!target) throw new Error('成员不存在');
      setTargetMember(target);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async () => {
    const minLength = 15;
    if (content.trim().length < minLength) {
      setError(`评价内容至少需要 ${minLength} 个字，当前 ${content.trim().length} 字`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: (targetMember as any).room_id || '',
          fromMemberId: currentMemberId,
          toMemberId: memberId,
          style,
          content: content.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate(`/room/${code}`);
    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  if (error && !targetMember) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: '#c53030', marginBottom: 16 }}>{error}</div>
        <Link to={`/room/${code}`} style={{ color: '#ed8936' }}>返回房间</Link>
      </div>
    );
  }

  if (!targetMember) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;
  }

  return (
    <div style={{
      maxWidth: 640,
      margin: '0 auto',
      padding: '40px 20px',
      minHeight: '100vh'
    }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: 700,
        textAlign: 'center',
        marginBottom: 24,
        color: '#2d3748'
      }}>
        写评价
      </h1>

      {error && (
        <div style={{
          background: '#fff5f5',
          color: '#c53030',
          padding: 12,
          borderRadius: 12,
          marginBottom: 20,
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      <div style={{
        background: '#fff',
        padding: 28,
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        marginBottom: 20
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 28,
          padding: 20,
          background: `${targetMember.color}15`,
          borderRadius: 12
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: targetMember.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 24,
            fontWeight: 700,
            flexShrink: 0
          }}>
            {targetMember.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#718096', marginBottom: 4 }}>评价对象</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#2d3748' }}>
              {targetMember.name}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 12,
            color: '#2d3748'
          }}>
            选择评价风格
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {Object.entries(STYLE_NAMES).map(([key, name]) => (
              <button
                key={key}
                onClick={() => setStyle(key)}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: style === key ? `2px solid ${STYLE_COLORS[key]}` : '2px solid transparent',
                  background: style === key ? `${STYLE_COLORS[key]}15` : '#f7fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  fontWeight: 700,
                  color: STYLE_COLORS[key],
                  marginBottom: 4,
                  fontSize: 15
                }}>
                  {name}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
            color: '#2d3748'
          }}>
            评价内容
          </label>
          <div style={{
            padding: '10px 14px',
            background: `${STYLE_COLORS[style]}10`,
            borderRadius: 10,
            marginBottom: 10,
            fontSize: 13,
            color: STYLE_COLORS[style],
            fontStyle: 'italic'
          }}>
            提示：{STYLE_PROMPTS[style]}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请输入你的评价内容（至少15字，匿名提交）"
            rows={6}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              fontSize: 15,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'box-shadow 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = `0 0 0 4px ${STYLE_COLORS[style]}30`;
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none';
            }}
          />
          <div style={{
            marginTop: 8,
            fontSize: 12,
            color: content.trim().length >= 15 ? '#48bb78' : '#a0aec0',
            textAlign: 'right'
          }}>
            {content.trim().length}/15 字
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: loading ? '#cbd5e0' : STYLE_COLORS[style],
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {loading ? '提交中...' : '匿名提交评价'}
        </button>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => navigate(`/room/${code}`)}
          style={{
            padding: '10px 24px',
            background: 'transparent',
            color: '#718096',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          取消，返回房间
        </button>
      </div>
    </div>
  );
}

function ResultPage() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const svgRef = (window as any).svgRefTemp = null;

  useEffect(() => {
    if (code) {
      const memberId = localStorage.getItem(`room_${code}_memberId`);
      loadData();
      if (memberId) checkCreator(memberId);
    }
  }, [code]);

  const checkCreator = async (memberId: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      const roomData = await res.json();
      if (roomData.creator_id === memberId) {
        setIsCreator(true);
      }
    } catch {}
  };

  const loadData = async () => {
    try {
      const res = await fetch(`/api/rooms/${code}/evaluations`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    window.open(`/api/rooms/${code}/export/csv`, '_blank');
  };

  const exportSVG = () => {
    const svgEl = document.querySelector('#force-graph-container svg');
    if (!svgEl) {
      alert('SVG 尚未加载完成');
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluation_${code}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: '#c53030', marginBottom: 16 }}>{error || '加载失败'}</div>
      </div>
    );
  }

  const { room, members, evaluationsByMember, wordFreqByMember } = data;

  return (
    <div style={{
      padding: '24px 20px',
      maxWidth: 1400,
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      <div style={{
        background: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <div style={{ fontSize: 13, color: '#718096', marginBottom: 4 }}>全景评价结果</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2d3748' }}>
              {room.activity_name}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: '#a0aec0' }}>
              房间码: <span style={{ fontFamily: 'monospace', letterSpacing: 2 }}>{room.code}</span>
              {' · '}共 {data.evaluations.length} 条评价
              {room.status === 'ended' && <span style={{ color: '#48bb78' }}> · 已发布</span>}
            </div>
          </div>
          {isCreator && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={exportSVG}
                style={{
                  padding: '10px 18px',
                  background: '#4299e1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                导出 SVG
              </button>
              <button
                onClick={exportCSV}
                style={{
                  padding: '10px 18px',
                  background: '#48bb78',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                导出 CSV
              </button>
            </div>
          )}
        </div>
      </div>

      <div id="force-graph-container" className="fade-in-scale" style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        minHeight: 500
      }}>
        <ForceGraph
          members={members}
          evaluationsByMember={evaluationsByMember}
          wordFreqByMember={wordFreqByMember}
        />
      </div>

      <div style={{
        marginTop: 24,
        background: '#fff',
        padding: 20,
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#2d3748' }}>
          详细评价列表
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {members.map((member: Member) => (
            <div key={member.id} style={{
              padding: 16,
              background: `${member.color}08`,
              borderRadius: 12,
              border: `1px solid ${member.color}30`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: member.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700
                }}>
                  {member.name.charAt(0)}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#2d3748' }}>
                  {member.name}
                </div>
                <div style={{
                  marginLeft: 'auto',
                  fontSize: 12,
                  color: '#718096'
                }}>
                  {evaluationsByMember[member.id]?.length || 0} 条
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {evaluationsByMember[member.id]?.map((ev: any, idx: number) => (
                  <div key={idx} style={{
                    padding: '10px 12px',
                    background: '#fff',
                    borderRadius: 8,
                    borderLeft: `3px solid ${STYLE_COLORS[ev.style]}`
                  }}>
                    <div style={{
                      fontSize: 11,
                      color: STYLE_COLORS[ev.style],
                      fontWeight: 600,
                      marginBottom: 4
                    }}>
                      {STYLE_NAMES[ev.style]}
                    </div>
                    <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.5 }}>
                      {ev.content}
                    </div>
                  </div>
                ))}
                {(!evaluationsByMember[member.id] || evaluationsByMember[member.id].length === 0) && (
                  <div style={{ fontSize: 13, color: '#a0aec0', fontStyle: 'italic' }}>
                    暂无评价
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <Link to="/" style={{ color: '#ed8936', textDecoration: 'none', fontSize: 14 }}>
          ← 返回首页
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateRoomPage />} />
      <Route path="/join" element={<JoinRoomPage />} />
      <Route path="/room/:code" element={<RoomPage />} />
      <Route path="/evaluate/:code/:memberId" element={<EvaluatePage />} />
      <Route path="/result/:code" element={<ResultPage />} />
    </Routes>
  );
}
