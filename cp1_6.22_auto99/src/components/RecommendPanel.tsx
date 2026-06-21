import { useState } from 'react';
import type { Employee, Course, Milestone } from '../types';

interface RecommendPanelProps {
  employee: Employee | null;
  courses: Course[];
  milestones: Milestone[];
  onCoursesReorder: (courses: Course[]) => void;
  onMilestoneDateChange: (milestoneId: string, date: string) => void;
  onMilestoneComplete: (milestoneId: string) => void;
  onSavePlan: () => void;
}

const difficultyColors: Record<string, string> = {
  low: '#48bb78',
  medium: '#ecc94b',
  high: '#fc8181',
};

const difficultyLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export default function RecommendPanel({
  employee,
  courses,
  milestones,
  onCoursesReorder,
  onMilestoneDateChange,
  onMilestoneComplete,
  onSavePlan,
}: RecommendPanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newCourses = [...courses];
      const [removed] = newCourses.splice(draggedIndex, 1);
      newCourses.splice(dragOverIndex, 0, removed);
      onCoursesReorder(newCourses);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (!employee) {
    return (
      <div className="recommend-panel empty">
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>请点击左侧员工卡片</p>
          <p className="empty-sub">查看智能推荐学习路径</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommend-panel">
      <div className="panel-header">
        <h2>学习路径推荐</h2>
        <div className="selected-employee">
          <span className="selected-name">{employee.name}</span>
          <span className="selected-position">{employee.position}</span>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">推荐课程</h3>
        <div className="course-list">
          {courses.map((course, index) => (
            <div
              key={course.id}
              className={`course-card ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="course-order">{index + 1}</div>
              <div className="course-content">
                <div className="course-title">{course.title}</div>
                <div className="course-meta">
                  <span className="course-duration">⏱ {course.duration}小时</span>
                  <span
                    className="course-difficulty"
                    style={{ backgroundColor: difficultyColors[course.difficulty] }}
                  >
                    {difficultyLabels[course.difficulty]}
                  </span>
                </div>
              </div>
              <div className="drag-handle">⋮⋮</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">里程碑设置</h3>
        <div className="milestone-list">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="milestone-item">
              <div className="milestone-info">
                <span className={`milestone-dot ${milestone.completed ? 'completed' : ''}`} />
                <span className="milestone-name">{milestone.name}</span>
              </div>
              <div className="milestone-actions">
                <input
                  type="date"
                  className="date-input"
                  value={milestone.dueDate}
                  onChange={(e) => onMilestoneDateChange(milestone.id, e.target.value)}
                />
                {!milestone.completed ? (
                  <button
                    className="btn-sm ripple"
                    onClick={() => onMilestoneComplete(milestone.id)}
                  >
                    完成
                  </button>
                ) : (
                  <span className="completed-badge">✓ 已完成</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="btn-save ripple" onClick={onSavePlan}>
        生成计划
      </button>
    </div>
  );
}
