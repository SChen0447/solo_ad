import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TeamMember } from '@/types';

interface TaskDetailPanelProps {
  task: Task | null;
  teamMembers: TeamMember[];
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: '待办', color: '#4a5568' },
  { value: 'in-progress', label: '进行中', color: '#2b6cb0' },
  { value: 'blocked', label: '阻塞', color: '#c53030' },
  { value: 'done', label: '完成', color: '#2f855a' },
];

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  teamMembers,
  onClose,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<Task | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({ ...task });
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setFormData(null), 300);
      return () => clearTimeout(timer);
    }
  }, [task]);

  if (!formData) return null;

  const handleChange = (field: keyof Task, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  const handleDelete = () => {
    if (confirm('确定要删除此任务吗？相关依赖也会被移除。')) {
      onDelete(formData.id);
      onClose();
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isVisible
            ? 'rgba(0, 0, 0, 0.5)'
            : 'rgba(0, 0, 0, 0)',
          zIndex: 900,
          transition: 'background 0.3s ease',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 420,
          maxWidth: '100%',
          height: '100vh',
          background: 'linear-gradient(180deg, #1e2633 0%, #171923 100%)',
          borderLeft: '1px solid #2d3748',
          zIndex: 950,
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isVisible ? '-10px 0 40px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid #2d3748',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(56, 178, 172, 0.1) 0%, transparent 100%)',
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: '#38b2ac', fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>
              任务详情
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
              编辑任务信息
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#2d3748',
              border: 'none',
              color: '#a0aec0',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#4a5568';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#2d3748';
              (e.currentTarget as HTMLButtonElement).style.color = '#a0aec0';
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          <div>
            <label style={labelStyle}>任务名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              style={inputStyle}
              placeholder="请输入任务名称"
            />
          </div>

          <div>
            <label style={labelStyle}>任务描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="请输入任务详细描述..."
            />
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>负责人</label>
              <select
                value={formData.assignee}
                onChange={(e) => handleChange('assignee', e.target.value)}
                style={inputStyle}
              >
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>状态</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as TaskStatus)}
                style={inputStyle}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>预估工时 (小时)</label>
              <input
                type="number"
                min={1}
                step={1}
                value={formData.estimatedHours}
                onChange={(e) => handleChange('estimatedHours', Math.max(1, parseInt(e.target.value) || 1))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>实际工时 (小时)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={formData.actualHours}
                onChange={(e) => handleChange('actualHours', Math.max(0, parseInt(e.target.value) || 0))}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>起始天 (从项目开始计)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={formData.startDay}
              onChange={(e) => handleChange('startDay', Math.max(0, parseInt(e.target.value) || 0))}
              style={inputStyle}
            />
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'rgba(56, 178, 172, 0.08)',
              border: '1px solid rgba(56, 178, 172, 0.2)',
            }}
          >
            <div style={{ fontSize: 12, color: '#38b2ac', fontWeight: 600, marginBottom: 10 }}>
              工时进度
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: '#2d3748',
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, (formData.actualHours / formData.estimatedHours) * 100 || 0)}%`,
                  background: 'linear-gradient(90deg, #38b2ac, #4fd1c5)',
                  borderRadius: 4,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#a0aec0' }}>
              {formData.actualHours} / {formData.estimatedHours} 小时 (
              {Math.round((formData.actualHours / formData.estimatedHours) * 100 || 0)}%)
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: '#2d3748',
              fontSize: 12,
              color: '#a0aec0',
              lineHeight: 1.7,
            }}
          >
            💡 <strong style={{ color: '#38b2ac' }}>提示：</strong>
            修改预估工时或起始天后，关键路径和浮动时间将自动重新计算。
            从任务右侧红色端口拖到另一任务左侧青色端口可创建依赖。
          </div>
        </div>

        <div
          style={{
            padding: '20px 28px',
            borderTop: '1px solid #2d3748',
            display: 'flex',
            gap: 12,
            background: 'linear-gradient(0deg, rgba(0,0,0,0.2) 0%, transparent 100%)',
          }}
        >
          <button
            onClick={handleDelete}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              border: '1px solid #fc8181',
              background: 'transparent',
              color: '#fc8181',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'rgba(252, 129, 129, 0.1)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            删除任务
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              border: '1px solid #4a5568',
              background: 'transparent',
              color: '#a0aec0',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#2d3748';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '12px 28px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #38b2ac 0%, #319795 100%)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(56, 178, 172, 0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                'translateY(-1px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 6px 16px rgba(56, 178, 172, 0.4)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 4px 12px rgba(56, 178, 172, 0.3)';
            }}
          >
            保存修改
          </button>
        </div>
      </div>
    </>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#a0aec0',
  marginBottom: 8,
  letterSpacing: 0.3,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 8,
  background: '#1a202c',
  border: '1px solid #4a5568',
  color: '#e2e8f0',
  fontSize: 14,
  outline: 'none',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
};
