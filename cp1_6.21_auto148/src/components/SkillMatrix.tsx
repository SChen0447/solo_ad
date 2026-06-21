import { useRef, useEffect, useState, useCallback } from 'react';
import { Member, Skill, categoryColors, categoryNames } from '../types';

interface SkillMatrixProps {
  members: Member[];
  skills: Skill[];
}

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  memberName: string;
  skillName: string;
  proficiency: number;
  lastUpdated: string;
}

type SortMode = 'total' | 'category';

function SkillMatrix({ members, skills }: SkillMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sortMode, setSortMode] = useState<SortMode>('total');
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false,
    x: 0,
    y: 0,
    memberName: '',
    skillName: '',
    proficiency: 0,
    lastUpdated: '',
  });

  const cellSize = 50;
  const rowHeaderWidth = 120;
  const colHeaderHeight = 60;
  const padding = 20;

  const getSortedMembers = useCallback(() => {
    const sorted = [...members];
    if (sortMode === 'total') {
      sorted.sort((a, b) => {
        const totalA = a.skills.reduce((sum, s) => sum + s.proficiency, 0);
        const totalB = b.skills.reduce((sum, s) => sum + s.proficiency, 0);
        return totalB - totalA;
      });
    }
    return sorted;
  }, [members, sortMode]);

  const getSortedSkills = useCallback(() => {
    const sorted = [...skills];
    if (sortMode === 'category') {
      const categoryOrder = ['frontend', 'backend', 'database', 'testing', 'devops'];
      sorted.sort((a, b) => {
        const catA = categoryOrder.indexOf(a.category);
        const catB = categoryOrder.indexOf(b.category);
        if (catA !== catB) return catA - catB;
        return a.name.localeCompare(b.name);
      });
    }
    return sorted;
  }, [skills, sortMode]);

  const getColorForProficiency = (proficiency: number) => {
    if (proficiency === 0) return 'rgba(100, 116, 139, 0.3)';
    if (proficiency < 40) return 'rgba(34, 197, 94, 0.2)';
    if (proficiency < 70) return 'rgba(34, 197, 94, 0.5)';
    return 'rgba(34, 197, 94, 0.85)';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sortedMembers = getSortedMembers();
    const sortedSkills = getSortedSkills();

    const width = rowHeaderWidth + sortedSkills.length * cellSize + padding * 2;
    const height = colHeaderHeight + sortedMembers.length * cellSize + padding * 2;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    ctx.clearRect(0, 0, width, height);

    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle';

    sortedSkills.forEach((skill, colIndex) => {
      const x = padding + rowHeaderWidth + colIndex * cellSize + cellSize / 2;
      const y = padding + colHeaderHeight / 2;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.fillText(skill.name, 0, 0);

      const categoryColor = categoryColors[skill.category]?.bg || '#6b7280';
      ctx.fillStyle = categoryColor;
      ctx.beginPath();
      ctx.arc(-ctx.measureText(skill.name).width / 2 - 10, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    sortedMembers.forEach((member, rowIndex) => {
      const x = padding + rowHeaderWidth - 10;
      const y = padding + colHeaderHeight + rowIndex * cellSize + cellSize / 2;

      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'right';
      ctx.fillText(member.name, x, y);

      const totalProficiency = member.skills.reduce((sum, s) => sum + s.proficiency, 0);
      const avgProficiency = Math.round(totalProficiency / Math.max(member.skills.length, 1));
      ctx.fillStyle = avgProficiency >= 70 ? '#34d399' : avgProficiency >= 40 ? '#fbbf24' : '#94a3b8';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${avgProficiency}%`, x, y + 15);
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    });

    sortedMembers.forEach((member, rowIndex) => {
      sortedSkills.forEach((skill, colIndex) => {
        const x = padding + rowHeaderWidth + colIndex * cellSize;
        const y = padding + colHeaderHeight + rowIndex * cellSize;

        const memberSkill = member.skills.find(s => s.skillId === skill.id);
        const proficiency = memberSkill?.proficiency || 0;

        ctx.fillStyle = getColorForProficiency(proficiency);
        ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

        if (proficiency > 0) {
          ctx.fillStyle = proficiency >= 70 ? '#ffffff' : '#e2e8f0';
          ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${proficiency}`, x + cellSize / 2, y + cellSize / 2);
        }
      });
    });

    const endTime = performance.now();
    console.log(`Heatmap rendered in ${(endTime - startTime).toFixed(2)}ms`);
  }, [getSortedMembers, getSortedSkills]);

  useEffect(() => {
    drawHeatmap();
  }, [drawHeatmap]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const sortedMembers = getSortedMembers();
    const sortedSkills = getSortedSkills();

    const gridX = x - padding - rowHeaderWidth;
    const gridY = y - padding - colHeaderHeight;

    if (gridX >= 0 && gridY >= 0 &&
        gridX < sortedSkills.length * cellSize &&
        gridY < sortedMembers.length * cellSize) {
      const colIndex = Math.floor(gridX / cellSize);
      const rowIndex = Math.floor(gridY / cellSize);

      const member = sortedMembers[rowIndex];
      const skill = sortedSkills[colIndex];
      const memberSkill = member?.skills.find(s => s.skillId === skill?.id);

      if (member && skill) {
        setTooltip({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          memberName: member.name,
          skillName: skill.name,
          proficiency: memberSkill?.proficiency || 0,
          lastUpdated: memberSkill?.lastUpdated || new Date().toISOString(),
        });
        return;
      }
    }

    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="glass-strong" style={styles.container}>
      <div style={styles.header}>
        <div style={styles.sortControls}>
          <span style={styles.sortLabel}>排序方式:</span>
          <button
            style={{
              ...styles.sortBtn,
              ...(sortMode === 'total' ? styles.sortBtnActive : {}),
            }}
            onClick={() => setSortMode('total')}
          >
            按总熟练度
          </button>
          <button
            style={{
              ...styles.sortBtn,
              ...(sortMode === 'category' ? styles.sortBtnActive : {}),
            }}
            onClick={() => setSortMode('category')}
          >
            按类别分组
          </button>
        </div>

        <div style={styles.legend}>
          <span style={styles.legendLabel}>熟练度:</span>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: 'rgba(100, 116, 139, 0.3)' }} />
            <span>无</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: 'rgba(34, 197, 94, 0.2)' }} />
            <span>低</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: 'rgba(34, 197, 94, 0.5)' }} />
            <span>中</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: 'rgba(34, 197, 94, 0.85)' }} />
            <span>高</span>
          </div>
        </div>
      </div>

      <div style={styles.categoryLegend}>
        {Object.entries(categoryNames).map(([key, name]) => (
          <div key={key} style={styles.categoryLegendItem}>
            <div
              style={{
                ...styles.categoryDot,
                backgroundColor: categoryColors[key]?.bg || '#6b7280',
              }}
            />
            <span>{name}</span>
          </div>
        ))}
      </div>

      <div ref={containerRef} style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={styles.canvas}
        />
      </div>

      {tooltip.visible && (
        <div
          style={{
            ...styles.tooltip,
            left: tooltip.x + 15,
            top: tooltip.y + 15,
          }}
        >
          <div style={styles.tooltipHeader}>
            <span style={styles.tooltipMember}>{tooltip.memberName}</span>
            <span style={styles.tooltipSkill}>{tooltip.skillName}</span>
          </div>
          <div style={styles.tooltipContent}>
            <span style={styles.tooltipValue}>
              熟练度: <strong>{tooltip.proficiency}%</strong>
            </span>
            <span style={styles.tooltipDate}>
              更新于: {formatDate(tooltip.lastUpdated)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '32px',
    animation: 'fadeIn 0.5s ease',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  sortControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sortLabel: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  sortBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  sortBtnActive: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(139, 92, 246, 0.4))',
    borderColor: 'rgba(59, 130, 246, 0.6)',
    color: '#e2e8f0',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  legendLabel: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#94a3b8',
  },
  legendColor: {
    width: '24px',
    height: '16px',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  categoryLegend: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  categoryLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  categoryDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  canvasContainer: {
    overflowX: 'auto',
    overflowY: 'hidden',
  },
  canvas: {
    display: 'block',
    cursor: 'crosshair',
  },
  tooltip: {
    position: 'fixed',
    background: '#ffffff',
    borderRadius: '8px',
    padding: '12px 16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    pointerEvents: 'none',
    minWidth: '180px',
    animation: 'fadeIn 0.15s ease',
  },
  tooltipHeader: {
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  tooltipMember: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '2px',
  },
  tooltipSkill: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
  },
  tooltipContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tooltipValue: {
    fontSize: '13px',
    color: '#334155',
  },
  tooltipDate: {
    fontSize: '11px',
    color: '#94a3b8',
  },
};

export default SkillMatrix;
