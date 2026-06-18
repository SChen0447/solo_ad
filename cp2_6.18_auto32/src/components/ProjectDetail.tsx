import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Project,
  Task,
  calculateWorkHours,
  getUniqueAssignees,
  getDateRange,
  WorkHoursStats,
} from '../utils/helpers';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onAddTask: () => void;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTasks: (fromIndex: number, toIndex: number) => void;
}

interface GanttBar {
  taskId: string;
  taskName: string;
  hours: number;
  assignee: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const GANTT_CONFIG = {
  yAxisWidth: 90,
  rowHeight: 46,
  headerHeight: 44,
  dayWidth: 40,
  barHeight: 28,
  padding: 12,
  barRadius: 4,
};

export default function ProjectDetail({
  project,
  onBack,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
}: ProjectDetailProps) {
  const stats = useMemo<WorkHoursStats>(() => calculateWorkHours(project.tasks), [project.tasks]);
  const assignees = useMemo(() => getUniqueAssignees(project.tasks), [project.tasks]);
  const dates = useMemo(() => getDateRange(project.startDate, project.tasks), [project.startDate, project.tasks]);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<GanttBar[]>([]);
  const [hoverBar, setHoverBar] = useState<GanttBar | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const totalWidth = GANTT_CONFIG.yAxisWidth + GANTT_CONFIG.padding * 2 + dates.length * GANTT_CONFIG.dayWidth;
  const totalHeight = GANTT_CONFIG.headerHeight + GANTT_CONFIG.padding + Math.max(1, assignees.length) * GANTT_CONFIG.rowHeight + 20;

  useEffect(() => {
    renderGantt();
  }, [project.tasks, assignees, dates, hoverBar]);

  function renderGantt() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = totalWidth + 'px';
    canvas.style.height = totalHeight + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, totalWidth, totalHeight);

    drawHeader(ctx);
    drawRows(ctx);
    const bars = drawBars(ctx);
    barsRef.current = bars;
    if (hoverBar) drawHoverHighlight(ctx, hoverBar);
  }

  function drawHeader(ctx: CanvasRenderingContext2D) {
    const { yAxisWidth, headerHeight, dayWidth, padding } = GANTT_CONFIG;
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, totalWidth, headerHeight);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(totalWidth, headerHeight);
    ctx.stroke();

    ctx.fillStyle = '#374151';
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('成员', yAxisWidth / 2, headerHeight / 2);

    dates.forEach((d, idx) => {
      const x = yAxisWidth + padding + idx * dayWidth + dayWidth / 2;
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px -apple-system, sans-serif';
      const dayLabel = `${d.getMonth() + 1}/${d.getDate()}`;
      ctx.fillText(dayLabel, x, headerHeight / 2);
      if (d.getDay() === 0 || d.getDay() === 6) {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.06)';
        const colX = yAxisWidth + padding + idx * dayWidth;
        ctx.fillRect(colX, headerHeight, dayWidth, totalHeight - headerHeight);
      }
    });
  }

  function drawRows(ctx: CanvasRenderingContext2D) {
    const { yAxisWidth, rowHeight, headerHeight, padding } = GANTT_CONFIG;
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    for (let i = 0; i <= assignees.length; i++) {
      const y = headerHeight + i * rowHeight;
      ctx.beginPath();
      ctx.moveTo(yAxisWidth, y);
      ctx.lineTo(totalWidth, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#1f2937';
    ctx.font = '500 13px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    assignees.forEach((name, i) => {
      const y = headerHeight + i * rowHeight + rowHeight / 2;
      ctx.fillStyle = '#374151';
      ctx.fillText(name, yAxisWidth - padding, y);
    });
    if (assignees.length === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('为任务分配负责人以查看甘特图', totalWidth / 2, headerHeight + 60);
    }
  }

  function drawBars(ctx: CanvasRenderingContext2D): GanttBar[] {
    const bars: GanttBar[] = [];
    if (assignees.length === 0) return bars;
    const { yAxisWidth, headerHeight, rowHeight, barHeight, dayWidth, padding, barRadius } = GANTT_CONFIG;

    const cumulativeDays: Record<string, number> = {};
    assignees.forEach(a => { cumulativeDays[a] = 0; });

    project.tasks.forEach(task => {
      if (!task.assignee || !task.assignee.trim()) return;
      const memberIndex = assignees.indexOf(task.assignee.trim());
      if (memberIndex === -1) return;
      const startDay = cumulativeDays[task.assignee.trim()];
      const hours = Number(task.estimatedHours) || 0;
      const durationDays = Math.max(1, Math.ceil(hours / 8));
      cumulativeDays[task.assignee.trim()] = startDay + durationDays;

      if (startDay + durationDays > dates.length) return;

      const x = yAxisWidth + padding + startDay * dayWidth + 4;
      const y = headerHeight + memberIndex * rowHeight + (rowHeight - barHeight) / 2;
      const width = Math.max(dayWidth * durationDays - 8, 24);
      const height = barHeight;

      drawRoundedRect(ctx, x, y, width, height, barRadius, task.color, task.completed);
      ctx.fillStyle = task.completed ? '#16a34a' : '#1f2937';
      ctx.font = '600 11px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const label = task.name.length > Math.floor(width / 8) ? task.name.slice(0, Math.floor(width / 8)) + '…' : task.name;
      ctx.fillText(label, x + 8, y + height / 2);

      bars.push({
        taskId: task.id,
        taskName: task.name,
        hours,
        assignee: task.assignee,
        color: task.color,
        x, y, width, height,
      });
    });
    return bars;
  }

  function drawHoverHighlight(ctx: CanvasRenderingContext2D, bar: GanttBar) {
    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    const { barRadius } = GANTT_CONFIG;
    roundRectPath(ctx, bar.x - 2, bar.y - 2, bar.width + 4, bar.height + 4, barRadius + 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, completed: boolean) {
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (completed) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
      roundRectPath(ctx, x, y, w, h, r);
      ctx.fill();
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, x, y, w, h, r);
      ctx.stroke();
    }
  }

  function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = barsRef.current.find(b => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height);
    if (hit) {
      setHoverBar(hit);
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setHoverBar(null);
      setTooltipPos(null);
    }
  }

  function handleCanvasMouseLeave() {
    setHoverBar(null);
    setTooltipPos(null);
  }

  const handleDragStart = (idx: number) => {
    setDragIndex(idx);
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };
  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== idx) {
      onReorderTasks(dragIndex, idx);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const circumference = 2 * Math.PI * 24;
  const dashOffset = circumference * (1 - stats.completionPercent / 100);

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← 返回看板</button>
        <h2 className="detail-title">{project.name}</h2>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          开始日期：{project.startDate}
        </div>
      </div>

      <div className="detail-layout">
        <div>
          <div className="task-section">
            <div className="section-title">
              <span>📝 任务清单（{project.tasks.length}）</span>
              <button className="add-task-btn" onClick={onAddTask}>+ 新任务</button>
            </div>

            <ul className="task-list">
              {project.tasks.map((task, idx) => (
                <li
                  key={task.id}
                  className={
                    'task-item ' +
                    (dragIndex === idx ? 'dragging ' : '') +
                    (dragOverIndex === idx ? 'drag-over ' : '') +
                    (task.completed ? 'task-completed' : '')
                  }
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="task-row">
                    <input
                      type="checkbox"
                      className="task-checkbox"
                      checked={task.completed}
                      onChange={(e) => onUpdateTask(task.id, { completed: e.target.checked })}
                    />
                    <div className="task-content">
                      <input
                        type="text"
                        className="task-name-input"
                        value={task.name}
                        onChange={(e) => onUpdateTask(task.id, { name: e.target.value })}
                        placeholder="任务名称"
                      />
                      <div className="task-meta">
                        <input
                          type="number"
                          className="task-hours-input"
                          min={0}
                          step={1}
                          value={task.estimatedHours}
                          onChange={(e) => onUpdateTask(task.id, { estimatedHours: Number(e.target.value) })}
                        />
                        <span style={{ fontSize: 12, color: '#6b7280' }}>小时</span>
                        <input
                          type="text"
                          className="task-assignee-input"
                          value={task.assignee}
                          onChange={(e) => onUpdateTask(task.id, { assignee: e.target.value })}
                          placeholder="负责人姓名"
                        />
                        <button
                          className="delete-task-btn"
                          onClick={() => {
                            if (confirm(`确定删除任务「${task.name}」？`)) {
                              onDeleteTask(task.id);
                            }
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {project.tasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>
                暂无任务，点击右上角「新任务」添加
              </div>
            )}

            <div className="stats-section">
              <div className="stats-row">
                <div className="progress-ring-wrap">
                  <svg width="60" height="60" viewBox="0 0 60 60">
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#16a34a" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="30"
                      cy="30"
                      r="24"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="6"
                    />
                    <circle
                      cx="30"
                      cy="30"
                      r="24"
                      fill="none"
                      stroke="url(#progressGradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      style={{
                        transition: 'stroke-dashoffset 0.5s ease-out',
                      }}
                    />
                  </svg>
                  <div className="progress-text">{stats.completionPercent}%</div>
                </div>
                <div className="stats-details">
                  <div className="stats-item">
                    <span className="stats-label">总预估工时</span>
                    <span className="stats-value total">{stats.totalHours} h</span>
                  </div>
                  <div className="stats-item">
                    <span className="stats-label">已完成工时</span>
                    <span className="stats-value completed">{stats.completedHours} h</span>
                  </div>
                  <div className="stats-item">
                    <span className="stats-label">剩余工时</span>
                    <span className="stats-value remaining">{stats.remainingHours} h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="gantt-section">
          <div className="section-title">
            <span>📈 资源分配甘特图</span>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>
              按负责人展示任务时间线（每天8工时）
            </span>
          </div>

          {project.tasks.length === 0 ? (
            <div className="gantt-empty">
              <div className="gantt-empty-icon">📊</div>
              <div>添加任务并分配负责人以生成甘特图</div>
            </div>
          ) : (
            <div className="gantt-canvas-wrap" style={{ position: 'relative' }}>
              <canvas
                ref={canvasRef}
                className="gantt-canvas"
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={handleCanvasMouseLeave}
              />
              {hoverBar && tooltipPos && (
                <div
                  style={{
                    position: 'absolute',
                    left: tooltipPos.x + 14,
                    top: tooltipPos.y + 14,
                    background: 'rgba(31, 41, 55, 0.95)',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    pointerEvents: 'none',
                    zIndex: 10,
                    boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{hoverBar.taskName}</div>
                  <div style={{ opacity: 0.85 }}>负责人：{hoverBar.assignee}</div>
                  <div style={{ opacity: 0.85 }}>预估工时：{hoverBar.hours} 小时</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
