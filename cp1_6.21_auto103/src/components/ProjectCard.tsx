import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Trash2, Edit3, Check, X } from 'lucide-react';
import { Project, TimeLog, getProjectColor, getProjectBorderColor, computeAfterTax } from '../types';

interface Props {
  project: Project;
  timeLogs: TimeLog[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Project>) => void;
  onDeleteTimeLog: (id: string) => void;
  searchQuery: string;
}

export default function ProjectCard({ project, timeLogs, onDelete, onUpdate, onDeleteTimeLog, searchQuery }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: project.name,
    hourlyRate: project.hourlyRate,
    estimatedHours: project.estimatedHours,
    clientName: project.clientName,
  });

  const projectLogs = timeLogs.filter((t) => t.projectId === project.id);
  const totalHours = projectLogs.reduce((sum, t) => sum + t.hours, 0);
  const totalIncome = totalHours * project.hourlyRate;
  const afterTaxIncome = computeAfterTax(totalIncome);

  const bgColor = getProjectColor(project.hourlyRate);
  const borderColor = getProjectBorderColor(project.hourlyRate);

  function highlightText(text: string, query: string) {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} style={{ backgroundColor: '#FBBF24', color: '#1F2937', borderRadius: '2px', padding: '0 2px' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  function handleSave() {
    onUpdate(project.id, editForm);
    setEditing(false);
  }

  function handleCancel() {
    setEditForm({
      name: project.name,
      hourlyRate: project.hourlyRate,
      estimatedHours: project.estimatedHours,
      clientName: project.clientName,
    });
    setEditing(false);
  }

  return (
    <div
      style={{
        background: '#374151',
        borderRadius: '12px',
        borderLeft: `4px solid ${borderColor}`,
        overflow: 'hidden',
        transition: 'box-shadow 0.3s ease, transform 0.3s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        onClick={() => !editing && setExpanded(!expanded)}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                style={editInputStyle}
                placeholder="项目名称"
              />
              <input
                value={editForm.clientName}
                onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                style={editInputStyle}
                placeholder="客户名称"
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  value={editForm.hourlyRate}
                  onChange={(e) => setEditForm({ ...editForm, hourlyRate: Number(e.target.value) })}
                  style={{ ...editInputStyle, width: '120px' }}
                  placeholder="费率"
                />
                <input
                  type="number"
                  value={editForm.estimatedHours}
                  onChange={(e) => setEditForm({ ...editForm, estimatedHours: Number(e.target.value) })}
                  style={{ ...editInputStyle, width: '120px' }}
                  placeholder="预估工时"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleSave} style={saveBtnStyle}><Check size={14} /> 保存</button>
                <button onClick={handleCancel} style={cancelBtnStyle}><X size={14} /> 取消</button>
              </div>
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px', color: '#F9FAFB' }}>
                {highlightText(project.name, searchQuery)}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>
                客户：{highlightText(project.clientName, searchQuery)}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: bgColor }}>
                ¥{afterTaxIncome.toFixed(0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                {totalHours}小时 · ¥{project.hourlyRate}/h
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                style={iconBtnStyle}
                title="编辑"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                style={iconBtnStyle}
                title="删除"
              >
                <Trash2 size={16} />
              </button>
              {expanded ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #4B5563', padding: '16px 20px', background: '#2D3748' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px', color: '#D1D5DB' }}>
            工时记录 ({projectLogs.length})
          </h4>
          {projectLogs.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>暂无工时记录</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {projectLogs
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((log) => (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: '#374151',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.85rem', color: '#D1D5DB' }}>
                        {format(new Date(log.date), 'yyyy-MM-dd')}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#9CA3AF', marginLeft: '12px' }}>
                        {log.hours}小时
                      </span>
                      {log.note && (
                        <span style={{ fontSize: '0.8rem', color: '#6B7280', marginLeft: '12px' }}>
                          {log.note}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteTimeLog(log.id)}
                      style={{ ...iconBtnStyle, padding: '4px' }}
                      title="删除记录"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
            </div>
          )}
          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#6B7280' }}>
            税前收入：¥{totalIncome.toFixed(2)} | 税后收入（20%税率）：¥{afterTaxIncome.toFixed(2)} | 预估工时：{project.estimatedHours}小时
          </div>
        </div>
      )}
    </div>
  );
}

const editInputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #4B5563',
  background: '#1F2937',
  color: '#F3F4F6',
  fontSize: '0.9rem',
  outline: 'none',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#9CA3AF',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 0.2s, background 0.2s',
};

const saveBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 12px',
  borderRadius: '6px',
  border: 'none',
  background: '#10B981',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '0.85rem',
};

const cancelBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid #4B5563',
  background: 'transparent',
  color: '#9CA3AF',
  cursor: 'pointer',
  fontSize: '0.85rem',
};
