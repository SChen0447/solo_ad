import React, { useMemo, useRef, useCallback } from 'react';
import { Task, Member } from '../utils/mockData';

const DAY_WIDTH = 48;
const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 40;
const LABEL_WIDTH = 80;

const PRIORITY_COLORS: Record<string, string> = {
  high: '#FF4757',
  medium: '#FFA502',
  low: '#2ED573',
};

interface Props {
  tasks: Task[];
  members: Member[];
  highlightTaskIds?: Set<string>;
  scrollLeftRef?: React.MutableRefObject<number>;
  onScroll?: (scrollLeft: number) => void;
}

const GanttChart: React.FC<Props> = ({ tasks, members, highlightTaskIds, scrollLeftRef, onScroll }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { dates, taskPositions } = useMemo(() => {
    const now = new Date();
    const dateList: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      dateList.push(d.toISOString().split('T')[0]);
    }

    const positions: Record<string, { x: number; width: number; taskId: string; row: number }[]> = {};
    members.forEach(m => { positions[m.id] = []; });

    const taskDateMap = new Map<string, number>();
    dateList.forEach((d, i) => taskDateMap.set(d, i));

    tasks.forEach(task => {
      const dayIndex = taskDateMap.get(task.dueDate);
      if (dayIndex === undefined) return;
      const memberIdx = members.findIndex(m => m.id === task.assigneeId);
      if (memberIdx === -1) return;

      const barWidth = Math.max(task.estimatedHours * 2.5, DAY_WIDTH * 0.6);
      const startX = dayIndex * DAY_WIDTH + 4;

      if (!positions[task.assigneeId]) positions[task.assigneeId] = [];
      positions[task.assigneeId].push({
        x: startX,
        width: barWidth,
        taskId: task.id,
        row: memberIdx,
      });
    });

    return { dates: dateList, taskPositions: positions };
  }, [tasks, members]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const sl = containerRef.current.scrollLeft;
      if (scrollLeftRef) scrollLeftRef.current = sl;
      if (onScroll) onScroll(sl);
    }
  }, [scrollLeftRef, onScroll]);

  const totalWidth = dates.length * DAY_WIDTH;
  const totalHeight = members.length * ROW_HEIGHT + HEADER_HEIGHT;

  return (
    <div className="gantt-container" ref={containerRef} onScroll={handleScroll}>
      <svg width={LABEL_WIDTH + totalWidth} height={totalHeight} className="gantt-svg">
        <defs>
          <linearGradient id="ganttGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5DADE2" />
            <stop offset="100%" stopColor="#1B4F72" />
          </linearGradient>
          <linearGradient id="ganttHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF8C00" />
            <stop offset="100%" stopColor="#FF6200" />
          </linearGradient>
        </defs>

        {dates.map((date, i) => {
          const x = LABEL_WIDTH + i * DAY_WIDTH;
          const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
          return (
            <g key={date}>
              <rect
                x={x} y={HEADER_HEIGHT}
                width={DAY_WIDTH} height={members.length * ROW_HEIGHT}
                fill={isWeekend ? 'rgba(255,255,255,0.03)' : 'transparent'}
              />
              <line
                x1={x} y1={HEADER_HEIGHT}
                x2={x} y2={totalHeight}
                stroke="rgba(255,255,255,0.06)" strokeWidth={1}
              />
              <text
                x={x + DAY_WIDTH / 2} y={24}
                textAnchor="middle" fill="rgba(255,255,255,0.5)"
                fontSize={11} fontFamily="inherit"
              >
                {date.slice(5)}
              </text>
            </g>
          );
        })}

        {members.map((member, rowIdx) => {
          const y = HEADER_HEIGHT + rowIdx * ROW_HEIGHT;
          return (
            <g key={member.id}>
              <line
                x1={LABEL_WIDTH} y1={y + ROW_HEIGHT}
                x2={LABEL_WIDTH + totalWidth} y2={y + ROW_HEIGHT}
                stroke="rgba(255,255,255,0.06)" strokeWidth={1}
              />
              <text
                x={LABEL_WIDTH / 2} y={y + ROW_HEIGHT / 2 + 4}
                textAnchor="middle" fill="rgba(255,255,255,0.7)"
                fontSize={12} fontFamily="inherit"
              >
                {member.name}
              </text>
              {taskPositions[member.id]?.map(pos => {
                const task = tasks.find(t => t.id === pos.taskId);
                if (!task) return null;
                const isHighlighted = highlightTaskIds?.has(task.id);
                return (
                  <g key={pos.taskId}>
                    <rect
                      x={LABEL_WIDTH + pos.x}
                      y={y + 10}
                      width={pos.width}
                      height={ROW_HEIGHT - 20}
                      rx={6}
                      fill={isHighlighted ? 'url(#ganttHighlight)' : 'url(#ganttGrad)'}
                      opacity={task.status === 'done' ? 0.5 : 0.85}
                    />
                    <text
                      x={LABEL_WIDTH + pos.x + 6}
                      y={y + ROW_HEIGHT / 2 + 3}
                      fill="#fff"
                      fontSize={10}
                      fontFamily="inherit"
                      clipPath={`url(#clip-${pos.taskId})`}
                    >
                      {task.title.length > 8 ? task.title.slice(0, 8) + '…' : task.title}
                    </text>
                    <clipPath id={`clip-${pos.taskId}`}>
                      <rect
                        x={LABEL_WIDTH + pos.x}
                        y={y + 10}
                        width={pos.width - 4}
                        height={ROW_HEIGHT - 20}
                      />
                    </clipPath>
                  </g>
                );
              })}
            </g>
          );
        })}

        <line
          x1={LABEL_WIDTH} y1={HEADER_HEIGHT}
          x2={LABEL_WIDTH} y2={totalHeight}
          stroke="url(#ganttGrad)" strokeWidth={2}
        />
      </svg>
    </div>
  );
};

export default GanttChart;
