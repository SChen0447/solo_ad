import React, { useState, useCallback, useMemo } from 'react';
import {
  Skill,
  TeamMember,
  SkillScoresMap,
  SkillScore,
  getScoreColor,
  getScoreLabel
} from '../utils/skillData';

interface SkillMatrixProps {
  skills: Skill[];
  members: TeamMember[];
  skillScores: SkillScoresMap;
  selectedMemberId: string | null;
  onSelectMember: (memberId: string) => void;
  onUpdateScore: (memberId: string, skillId: string, score: number, note: string) => void;
}

interface EditingCell {
  memberId: string;
  skillId: string;
}

const SkillMatrix: React.FC<SkillMatrixProps> = ({
  skills,
  members,
  skillScores,
  selectedMemberId,
  onSelectMember,
  onUpdateScore
}) => {
  const [hoveredCell, setHoveredCell] = useState<EditingCell | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editScore, setEditScore] = useState<number>(1);
  const [editNote, setEditNote] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);

  const avatarColors = useMemo(() => {
    const colors = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
      'linear-gradient(135deg, #30cfd0, #330867)'
    ];
    const map: Record<string, string> = {};
    members.forEach((m, i) => {
      map[m.id] = colors[i % colors.length];
    });
    return map;
  }, [members]);

  const handleCellClick = useCallback((memberId: string, skillId: string) => {
    const scoreData = skillScores[memberId]?.[skillId];
    if (scoreData) {
      setEditingCell({ memberId, skillId });
      setEditScore(scoreData.score);
      setEditNote(scoreData.note);
      setTimeout(() => setShowEditModal(true), 10);
    }
  }, [skillScores]);

  const handleSaveEdit = useCallback(() => {
    if (editingCell) {
      onUpdateScore(editingCell.memberId, editingCell.skillId, editScore, editNote);
      setShowEditModal(false);
      setTimeout(() => {
        setEditingCell(null);
      }, 300);
    }
  }, [editingCell, editScore, editNote, onUpdateScore]);

  const handleCloseEdit = useCallback(() => {
    setShowEditModal(false);
    setTimeout(() => {
      setEditingCell(null);
    }, 300);
  }, []);

  const getCellStyle = useCallback((score: number, isSelectedRow: boolean, isHovered: boolean): React.CSSProperties => {
    const baseColor = getScoreColor(score);
    return {
      backgroundColor: baseColor,
      transform: isHovered ? 'scale(1.3)' : 'scale(1)',
      zIndex: isHovered ? 10 : 1,
      boxShadow: isHovered
        ? `0 8px 25px ${baseColor}80, 0 0 15px ${baseColor}40`
        : isSelectedRow
          ? `0 2px 8px ${baseColor}40`
          : 'none',
      opacity: selectedMemberId && !isSelectedRow ? 0.5 : 1
    };
  }, [selectedMemberId]);

  return (
    <div style={{
      position: 'relative',
      padding: '24px',
      borderRadius: '20px',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <h2 style={{
          fontSize: '22px',
          fontWeight: 600,
          background: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>技能热力矩阵</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {[1, 2, 3, 4, 5].map(level => (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                backgroundColor: getScoreColor(level),
                boxShadow: `0 2px 6px ${getScoreColor(level)}50`
              }} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                {getScoreLabel(level)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: '4px',
          minWidth: `${skills.length * 80 + 180}px`
        }}>
          <thead>
            <tr>
              <th style={{
                position: 'sticky',
                left: 0,
                zIndex: 20,
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.9)',
                background: 'rgba(22, 33, 62, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '10px',
                minWidth: '160px'
              }}>成员 / 技能</th>
              {skills.map(skill => (
                <th key={skill.id} style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.9)',
                  background: 'rgba(102, 126, 234, 0.15)',
                  borderRadius: '10px',
                  minWidth: '72px',
                  whiteSpace: 'nowrap'
                }}>
                  {skill.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map(member => {
              const isSelectedRow = selectedMemberId === member.id;
              return (
                <tr
                  key={member.id}
                  onClick={() => onSelectMember(member.id)}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <td style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 5,
                    padding: '10px 16px',
                    background: isSelectedRow
                      ? 'rgba(102, 126, 234, 0.25)'
                      : 'rgba(22, 33, 62, 0.7)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    border: isSelectedRow
                      ? '1px solid rgba(102, 126, 234, 0.5)'
                      : '1px solid transparent'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: avatarColors[member.id],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#fff',
                        boxShadow: `0 4px 12px rgba(0,0,0,0.3)`
                      }}>
                        {member.avatar}
                      </div>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#fff'
                        }}>{member.name}</div>
                        <div style={{
                          fontSize: '11px',
                          color: 'rgba(255,255,255,0.5)'
                        }}>{member.email}</div>
                      </div>
                    </div>
                  </td>
                  {skills.map(skill => {
                    const cellKey = `${member.id}-${skill.id}`;
                    const scoreData: SkillScore | undefined = skillScores[member.id]?.[skill.id];
                    const score = scoreData?.score ?? 1;
                    const note = scoreData?.note ?? '';
                    const isHovered = hoveredCell?.memberId === member.id && hoveredCell?.skillId === skill.id;
                    const isEditing = editingCell?.memberId === member.id && editingCell?.skillId === skill.id;

                    return (
                      <td
                        key={cellKey}
                        style={{ padding: '4px', textAlign: 'center' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellClick(member.id, skill.id);
                        }}
                        onMouseEnter={() => setHoveredCell({ memberId, skillId })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: '64px',
                            height: '50px',
                            margin: '0 auto',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            ...getCellStyle(score, isSelectedRow, isHovered || isEditing)
                          }}
                        >
                          <span style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: score >= 3 ? 'rgba(0,0,0,0.85)' : '#fff',
                            textShadow: score >= 3 ? 'none' : '0 1px 2px rgba(0,0,0,0.3)'
                          }}>
                            {score}
                          </span>

                          {isHovered && !isEditing && (
                            <div style={{
                              position: 'absolute',
                              bottom: 'calc(100% + 12px)',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: 'rgba(15, 20, 40, 0.98)',
                              backdropFilter: 'blur(10px)',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              border: '1px solid rgba(102, 126, 234, 0.3)',
                              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                              whiteSpace: 'nowrap',
                              zIndex: 100,
                              animation: 'fadeInUp 0.2s ease'
                            }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#fff',
                                marginBottom: '6px'
                              }}>
                                {skill.name}: {getScoreLabel(score)} ({score}/5)
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: 'rgba(255,255,255,0.7)'
                              }}>{note}</div>
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                border: '8px solid transparent',
                                borderTopColor: 'rgba(15, 20, 40, 0.98)'
                              }} />
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingCell && (
        <div
          onClick={handleCloseEdit}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: showEditModal ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '420px',
              padding: '28px',
              borderRadius: '20px',
              background: 'linear-gradient(145deg, rgba(30,40,70,0.98), rgba(20,28,50,0.98))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              transform: showEditModal ? 'scale(1) rotateX(0deg)' : 'scale(0.7) rotateX(-15deg)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              animation: showEditModal ? undefined : undefined
            }}
          >
            <h3 style={{
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '20px',
              background: 'linear-gradient(135deg, #667eea, #f093fb)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              编辑技能评分
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: 'rgba(255,255,255,0.8)',
                marginBottom: '12px'
              }}>熟练度评分</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    onClick={() => setEditScore(level)}
                    style={{
                      flex: 1,
                      height: '52px',
                      borderRadius: '12px',
                      border: editScore === level
                        ? '2px solid rgba(255,255,255,0.8)'
                        : '2px solid transparent',
                      background: getScoreColor(level),
                      color: level >= 3 ? 'rgba(0,0,0,0.85)' : '#fff',
                      fontSize: '18px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: editScore === level ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: editScore === level
                        ? `0 6px 20px ${getScoreColor(level)}60`
                        : 'none'
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div style={{
                marginTop: '8px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.6)',
                textAlign: 'center'
              }}>
                当前: {getScoreLabel(editScore)}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: 'rgba(255,255,255,0.8)',
                marginBottom: '10px'
              }}>备注说明</label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={3}
                placeholder="输入技能掌握情况说明..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(102,126,234,0.5)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCloseEdit}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 15px rgba(102,126,234,0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102,126,234,0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102,126,234,0.4)';
                }}
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillMatrix;
