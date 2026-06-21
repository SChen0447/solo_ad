import { useEffect, useRef, useState, useCallback } from 'react';
import type { Employee, SkillCategory } from '../types';

interface EmployeeListProps {
  employees: Employee[];
  onEmployeeClick: (employee: Employee) => void;
  onViewProgress: (employeeId: string) => void;
}

const skillCategoryColors: Record<SkillCategory, string> = {
  frontend: '#3182ce',
  backend: '#38a169',
  devops: '#805ad5',
  data: '#d69e2e',
  design: '#e53e3e',
  management: '#dd6b20',
};

const CARD_HEIGHT = 220;
const CARD_WIDTH = 280;
const CARD_GAP = 20;
const BUFFER = 2;

export default function EmployeeList({
  employees,
  onEmployeeClick,
  onViewProgress,
}: EmployeeListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const recalcColumns = useCallback(() => {
    if (containerRef.current) {
      const width = containerRef.current.clientWidth;
      const col = Math.max(1, Math.floor((width + CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
      setColumns(col);
    }
  }, []);

  useEffect(() => {
    recalcColumns();
    window.addEventListener('resize', recalcColumns);
    return () => window.removeEventListener('resize', recalcColumns);
  }, [recalcColumns]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateHeight = () => setContainerHeight(el.clientHeight);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = Math.ceil(employees.length / columns);
  const totalHeight = rows * (CARD_HEIGHT + CARD_GAP);

  const startRow = Math.max(0, Math.floor(scrollTop / (CARD_HEIGHT + CARD_GAP)) - BUFFER);
  const visibleRows = Math.ceil(containerHeight / (CARD_HEIGHT + CARD_GAP)) + BUFFER * 2;
  const endRow = Math.min(rows, startRow + visibleRows);

  const visibleEmployees: Array<{ employee: Employee; row: number; col: number }> = [];
  for (let r = startRow; r < endRow; r++) {
    for (let c = 0; c < columns; c++) {
      const idx = r * columns + c;
      if (idx < employees.length) {
        visibleEmployees.push({ employee: employees[idx], row: r, col: c });
      }
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div className="employee-list-wrapper">
      <div className="section-header">
        <h2>员工列表</h2>
        <span className="employee-count">共 {employees.length} 人</span>
      </div>
      <div
        ref={containerRef}
        className="employee-list-container"
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleEmployees.map(({ employee, row, col }) => (
            <div
              key={employee.id}
              className={`employee-card ${employee.level}`}
              style={{
                position: 'absolute',
                top: row * (CARD_HEIGHT + CARD_GAP),
                left: col * (CARD_WIDTH + CARD_GAP),
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
              }}
              onClick={() => onEmployeeClick(employee)}
            >
              <div className="card-header">
                <div className="avatar">
                  {employee.name.charAt(0)}
                </div>
                <div className="employee-info">
                  <h3 className="employee-name">{employee.name}</h3>
                  <p className="employee-position">{employee.position}</p>
                  <span className={`level-badge ${employee.level}`}>
                    {employee.level === 'junior' ? '初级' : '高级'}
                  </span>
                </div>
              </div>
              <div className="skills-container">
                {employee.skills.slice(0, 4).map((skill) => (
                  <span
                    key={skill.name}
                    className="skill-tag"
                    style={{ backgroundColor: skillCategoryColors[skill.category] }}
                  >
                    {skill.name}
                  </span>
                ))}
                {employee.skills.length > 4 && (
                  <span className="skill-tag more">+{employee.skills.length - 4}</span>
                )}
              </div>
              <div className="card-actions">
                <button
                  className="btn-secondary ripple"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewProgress(employee.id);
                  }}
                >
                  查看进度
                </button>
                <button className="btn-primary ripple">
                  生成路径
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
