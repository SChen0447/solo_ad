import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import {
  fetchProjects,
  fetchMembers,
  fetchTimeRecords,
  submitTimeRecord,
  type Project,
  type Member,
  type TimeRecord,
} from '@/api';

interface ProjectGroup {
  project: Project;
  members: Member[];
  expanded: boolean;
}

type SubmitState = 'idle' | 'loading' | 'success';

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TimeEntry() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [records, setRecords] = useState<TimeRecord[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [inputHours, setInputHours] = useState<number>(8);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);

  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const today = formatDate(new Date());

  const loadData = useCallback(async () => {
    const [ps, ms, rs] = await Promise.all([
      fetchProjects(),
      fetchMembers(),
      fetchTimeRecords({ startDate: today, endDate: today }),
    ]);
    setProjects(ps);
    setRecords(rs);

    const gs: ProjectGroup[] = ps.map((p) => ({
      project: p,
      members: ms.filter((m) => m.projectIds.includes(p.id)),
      expanded: false,
    }));
    setGroups(gs);
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchMembers(selectedProjectId).then(setAvailableMembers).catch(() => {});
      setSelectedMemberId('');
    } else {
      setAvailableMembers([]);
      setSelectedMemberId('');
    }
  }, [selectedProjectId]);

  const toggleGroup = (projectId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.project.id === projectId ? { ...g, expanded: !g.expanded } : g
      )
    );
  };

  const getMemberTodayHours = (memberId: string): number => {
    return records
      .filter((r) => r.memberId === memberId && r.date === today)
      .reduce((sum, r) => sum + r.hours, 0);
  };

  const handleSubmit = async () => {
    if (!selectedProjectId || !selectedMemberId || !selectedDate || inputHours <= 0) {
      setErrorMsg('请填写完整信息');
      return;
    }
    setErrorMsg('');
    setSubmitState('loading');

    try {
      await submitTimeRecord({
        projectId: selectedProjectId,
        memberId: selectedMemberId,
        date: selectedDate,
        hours: inputHours,
      });

      setTimeout(() => {
        setSubmitState('success');
        setTimeout(() => {
          setSubmitState('idle');
          setInputHours(8);
        }, 1500);
      }, 800);

      loadData();
    } catch {
      setSubmitState('idle');
      setErrorMsg('提交失败，请重试');
    }
  };

  return (
    <div style={{ display: 'flex', gap: 24, minHeight: 500 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: 16,
          }}
        >
          项目成员列表
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groups.map((g) => (
            <div
              key={g.project.id}
              style={{
                borderRadius: 10,
                background: '#fff',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
              }}
            >
              <div
                onClick={() => toggleGroup(g.project.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                {g.expanded ? (
                  <ChevronDown size={16} color="#6b7280" />
                ) : (
                  <ChevronRight size={16} color="#6b7280" />
                )}
                <span style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>
                  {g.project.name}
                </span>
                <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>
                  {g.members.length}人
                </span>
              </div>

              <div
                style={{
                  maxHeight: g.expanded ? 500 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.3s ease-out',
                }}
              >
                {g.expanded && (
                  <div
                    style={{
                      padding: '4px 16px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {g.members.map((m) => {
                      const todayH = getMemberTodayHours(m.id);
                      return (
                        <Link
                          key={m.id}
                          to={`/members/${m.id}`}
                          style={{ textDecoration: 'none' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: 8,
                              background: '#f9fafb',
                              transition: 'background 0.15s',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLDivElement).style.background =
                                '#f3f4f6';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLDivElement).style.background =
                                '#f9fafb';
                            }}
                          >
                            <span
                              style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}
                            >
                              {m.name}
                            </span>
                            {todayH > 0 && (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: '#6b7280',
                                  background: '#e0f2fe',
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                }}
                              >
                                今日 {todayH}h
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          width: 340,
          flexShrink: 0,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          padding: 24,
          alignSelf: 'flex-start',
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: 20,
          }}
        >
          快速录入
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}
            >
              项目名称
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
                color: '#1f2937',
                background: '#fff',
                outline: 'none',
              }}
            >
              <option value="">请选择项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}
            >
              成员姓名
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              disabled={!selectedProjectId}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
                color: '#1f2937',
                background: selectedProjectId ? '#fff' : '#f3f4f6',
                outline: 'none',
              }}
            >
              <option value="">请选择成员</option>
              {availableMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}
            >
              日期
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
                color: '#1f2937',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}
            >
              工时（小时）
            </label>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={inputHours}
              onChange={(e) => setInputHours(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
                color: '#1f2937',
                outline: 'none',
              }}
            />
          </div>

          {errorMsg && (
            <div style={{ fontSize: 13, color: '#ef4444' }}>{errorMsg}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitState !== 'idle'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '12px 0',
              borderRadius: 10,
              border: 'none',
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
              background:
                submitState === 'idle'
                  ? '#3b82f6'
                  : submitState === 'loading'
                  ? '#93c5fd'
                  : '#22c55e',
              cursor: submitState === 'idle' ? 'pointer' : 'default',
              transition: 'background 0.3s ease-out',
              position: 'relative',
            }}
          >
            {submitState === 'idle' && '提交工时'}
            {submitState === 'loading' && (
              <>
                <Loader2
                  size={18}
                  style={{
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                提交中...
              </>
            )}
            {submitState === 'success' && (
              <>
                <CheckCircle size={18} />
                提交成功
              </>
            )}
          </button>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
