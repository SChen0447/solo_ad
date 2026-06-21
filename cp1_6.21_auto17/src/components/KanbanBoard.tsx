import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { v4 as uuidv4 } from 'uuid';
import { Task, Dependency, TeamMember, TaskScheduleInfo } from '@/types';
import { analyzeDependencyGraph, validateDependencyAddition } from '@/logic/dependencyGraph';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  dependencies: Dependency[];
  teamMembers: TeamMember[];
  onTasksChange: (tasks: Task[]) => void;
  onDependenciesChange: (deps: Dependency[]) => void;
  onTaskClick: (task: Task) => void;
}

const LANE_HEIGHT = 148;
const HEADER_HEIGHT = 80;
const LANE_HEADER_WIDTH = 140;
const CELL_WIDTH_LARGE = 120;
const CELL_WIDTH_SMALL = 90;
const CARD_ROW_OFFSET = 24;

interface DraggingState {
  isDragging: boolean;
  fromTaskId: string | null;
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  dependencies,
  teamMembers,
  onTasksChange,
  onDependenciesChange,
  onTaskClick,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [cellWidth, setCellWidth] = useState(CELL_WIDTH_LARGE);
  const [totalDays, setTotalDays] = useState(14);
  const [dragging, setDragging] = useState<DraggingState>({
    isDragging: false,
    fromTaskId: null,
    currentX: 0,
    currentY: 0,
    startX: 0,
    startY: 0,
  });
  const [hoverInputTask, setHoverInputTask] = useState<string | null>(null);
  const [showCycleWarning, setShowCycleWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [taskRefs] = useState(() => new Map<string, HTMLDivElement>());
  const [, forceUpdate] = useState(0);

  const analysis = useMemo(
    () => analyzeDependencyGraph(tasks, dependencies),
    [tasks, dependencies]
  );

  const scheduleInfoMap: Map<string, TaskScheduleInfo> = analysis.scheduleInfo;
  const criticalPathSet = useMemo(() => {
    const s = new Set<string>();
    analysis.criticalPath.forEach((id) => s.add(id));
    return s;
  }, [analysis.criticalPath]);

  const criticalDepSet = useMemo(() => {
    const s = new Set<string>();
    const path = analysis.criticalPath;
    for (let i = 0; i < path.length - 1; i++) {
      const dep = dependencies.find(
        (d) => d.fromTaskId === path[i] && d.toTaskId === path[i + 1]
      );
      if (dep) s.add(dep.id);
    }
    return s;
  }, [analysis.criticalPath, dependencies]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1280) setCellWidth(CELL_WIDTH_LARGE);
      else if (w >= 768) setCellWidth(Math.max(CELL_WIDTH_SMALL, 80));
      else setCellWidth(70);
      forceUpdate((x) => x + 1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (analysis.hasCycle) {
      setWarningMessage(`检测到循环依赖：${analysis.cyclePath.join(' → ')}`);
      setShowCycleWarning(true);
    }
  }, [analysis.hasCycle, analysis.cyclePath]);

  useEffect(() => {
    const maxDay = Math.max(
      ...tasks.map((t) => {
        const info = scheduleInfoMap.get(t.id);
        const ef = info ? info.earliestFinish : t.startDay + t.estimatedHours / 8;
        return Math.ceil(ef);
      }),
      14
    );
    setTotalDays(Math.max(maxDay + 2, 14));
  }, [tasks, scheduleInfoMap]);

  const tasksByAssignee = useMemo(() => {
    const map = new Map<string, Task[]>();
    teamMembers.forEach((m) => map.set(m.id, []));
    tasks.forEach((t) => {
      const member = teamMembers.find((m) => m.name === t.assignee);
      if (member) {
        if (!map.has(member.id)) map.set(member.id, []);
        map.get(member.id)!.push(t);
      } else {
        const unassigned = 'unassigned';
        if (!map.has(unassigned)) map.set(unassigned, []);
        map.get(unassigned)!.push(t);
      }
    });
    return map;
  }, [tasks, teamMembers]);

  const getTaskPosition = useCallback(
    (taskId: string): { x: number; y: number; width: number; height: number } | null => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return null;
      const info = scheduleInfoMap.get(taskId);
      const startDay = info ? info.earliestStart : task.startDay;
      const member = teamMembers.find((m) => m.name === task.assignee);
      const memberIndex = teamMembers.findIndex((m) => m.name === task.assignee);
      const laneIndex = member ? memberIndex : teamMembers.length;

      const duration = Math.max(1, Math.ceil(task.estimatedHours / 8));
      const x = LANE_HEADER_WIDTH + startDay * cellWidth + 6;
      const y = HEADER_HEIGHT + laneIndex * LANE_HEIGHT + CARD_ROW_OFFSET;
      const width = cellWidth * duration - 12;
      const height = 108;

      return { x, y, width, height };
    },
    [tasks, scheduleInfoMap, teamMembers, cellWidth]
  );

  const getPortPosition = useCallback(
    (taskId: string, portType: 'input' | 'output'): { x: number; y: number } | null => {
      const pos = getTaskPosition(taskId);
      if (!pos) return null;
      const y = pos.y + pos.height / 2;
      const x = portType === 'output' ? pos.x + pos.width : pos.x;
      return { x, y };
    },
    [getTaskPosition]
  );

  const createCurvePath = (
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): string => {
    const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  const handlePortDragStart = (
    e: React.MouseEvent,
    taskId: string,
    _portType: 'output'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getPortPosition(taskId, 'output');
    if (!pos) return;
    setDragging({
      isDragging: true,
      fromTaskId: taskId,
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
    });
  };

  useEffect(() => {
    if (!dragging.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      setDragging((prev) => ({
        ...prev,
        currentX: e.clientX - rect.left + (boardRef.current?.scrollLeft || 0),
        currentY: e.clientY - rect.top + (boardRef.current?.scrollTop || 0),
      }));
    };

    const handleMouseUp = () => {
      setDragging({
        isDragging: false,
        fromTaskId: null,
        currentX: 0,
        currentY: 0,
        startX: 0,
        startY: 0,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging.isDragging]);

  const handlePortMouseUp = (toTaskId: string, _portType: 'input') => {
    if (!dragging.isDragging || !dragging.fromTaskId) return;
    const fromTaskId = dragging.fromTaskId;

    const validation = validateDependencyAddition(
      tasks,
      dependencies,
      fromTaskId,
      toTaskId
    );

    if (!validation.valid) {
      setWarningMessage(validation.reason || '无法创建依赖');
      setShowCycleWarning(true);
    } else {
      const newDep: Dependency = {
        id: uuidv4(),
        fromTaskId,
        toTaskId,
      };
      onDependenciesChange([...dependencies, newDep]);
    }

    setDragging({
      isDragging: false,
      fromTaskId: null,
      currentX: 0,
      currentY: 0,
      startX: 0,
      startY: 0,
    });
    setHoverInputTask(null);
  };

  const deleteDependency = (depId: string) => {
    onDependenciesChange(dependencies.filter((d) => d.id !== depId));
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');

    const arrowCritical = defs
      .append('marker')
      .attr('id', 'arrow-critical')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 9)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto');
    arrowCritical.append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#ffd700');

    const arrowNormal = defs
      .append('marker')
      .attr('id', 'arrow-normal')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 9)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto');
    arrowNormal.append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#718096');

    const arrowHover = defs
      .append('marker')
      .attr('id', 'arrow-hover')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 9)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto');
    arrowHover.append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#f687b3');

    const flowGradient = defs
      .append('linearGradient')
      .attr('id', 'flow-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    flowGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#ff00ff')
      .attr('stop-opacity', 0.3);
    flowGradient
      .append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#ff69b4')
      .attr('stop-opacity', 1);
    flowGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#ff00ff')
      .attr('stop-opacity', 0.3);

    dependencies.forEach((dep) => {
      const fromPos = getPortPosition(dep.fromTaskId, 'output');
      const toPos = getPortPosition(dep.toTaskId, 'input');
      if (!fromPos || !toPos) return;

      const isCritical = criticalDepSet.has(dep.id);
      const g = svg.append('g').attr('class', 'dep-group').style('cursor', 'pointer');

      const path = createCurvePath(fromPos.x, fromPos.y, toPos.x, toPos.y);

      g.append('path')
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 18)
        .on('click', () => deleteDependency(dep.id));

      const edgePath = g
        .append('path')
        .attr('d', path)
        .attr('fill', 'none')
        .attr(
          'stroke',
          isCritical ? '#ffd700' : dragging.isDragging ? 'url(#flow-gradient)' : '#5a6577'
        )
        .attr('stroke-width', isCritical ? 3 : 2)
        .attr(
          'marker-end',
          isCritical ? 'url(#arrow-critical)' : 'url(#arrow-normal)'
        )
        .style('transition', 'stroke 0.3s ease, stroke-width 0.3s ease')
        .on('mouseenter', function () {
          d3.select(this)
            .attr('stroke', '#f687b3')
            .attr('stroke-width', 3)
            .attr('marker-end', 'url(#arrow-hover)');
        })
        .on('mouseleave', function () {
          d3.select(this)
            .attr('stroke', isCritical ? '#ffd700' : '#5a6577')
            .attr('stroke-width', isCritical ? 3 : 2)
            .attr(
              'marker-end',
              isCritical ? 'url(#arrow-critical)' : 'url(#arrow-normal)'
            );
        })
        .on('click', () => deleteDependency(dep.id));

      if (isCritical) {
        edgePath
          .style('filter', 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))');
      }
    });

    if (dragging.isDragging && dragging.fromTaskId) {
      const dragPath = createCurvePath(
        dragging.startX,
        dragging.startY,
        dragging.currentX,
        dragging.currentY
      );

      const flowLength = 60;
      const dashArray = `${flowLength} 20`;

      svg
        .append('path')
        .attr('d', dragPath)
        .attr('fill', 'none')
        .attr('stroke', '#ff69b4')
        .attr('stroke-width', 3)
        .attr('stroke-linecap', 'round')
        .attr('stroke-dasharray', dashArray)
        .style('filter', 'drop-shadow(0 0 6px rgba(255, 105, 180, 0.8))')
        .style('animation', 'dashFlow 0.6s linear infinite');
    }
  }, [
    dependencies,
    dragging,
    getPortPosition,
    criticalDepSet,
    hoverInputTask,
    cellWidth,
  ]);

  const days = Array.from({ length: totalDays }, (_, i) => i);
  const boardWidth = LANE_HEADER_WIDTH + totalDays * cellWidth;
  const boardHeight = HEADER_HEIGHT + (teamMembers.length) * LANE_HEIGHT + 40;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {showCycleWarning && (
        <div
          onClick={() => setShowCycleWarning(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #2d3748 0%, #1a202c 100%)',
              borderRadius: 16,
              padding: 32,
              maxWidth: 480,
              border: '2px solid #fc8181',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#fc8181',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: '#fff',
                }}
              >
                ⚠
              </div>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
                依赖警告
              </h3>
            </div>
            <p style={{ color: '#cbd5e0', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px 0' }}>
              {warningMessage}
            </p>
            <button
              onClick={() => setShowCycleWarning(false)}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #38b2ac 0%, #319795 100%)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.transform =
                  'translateY(-1px)')
              }
              onMouseOut={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.transform =
                  'translateY(0)')
              }
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      <div
        ref={boardRef}
        style={{
          width: '100%',
          height: 'calc(100vh - 100px)',
          overflow: 'auto',
          background: 'linear-gradient(180deg, #1a202c 0%, #171923 100%)',
          borderRadius: 12,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: boardWidth,
            height: boardHeight,
            minWidth: '100%',
          }}
        >
          <svg
            ref={svgRef}
            width={boardWidth}
            height={boardHeight}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            <g style={{ pointerEvents: 'auto' }} />
          </svg>

          <div
            style={{
              position: 'sticky',
              top: 0,
              height: HEADER_HEIGHT,
              background: 'linear-gradient(180deg, #1e2633 0%, #1a202c 100%)',
              borderBottom: '1px solid #2d3748',
              zIndex: 15,
              display: 'flex',
            }}
          >
            <div
              style={{
                width: LANE_HEADER_WIDTH,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: '1px solid #2d3748',
                fontSize: 14,
                fontWeight: 700,
                color: '#38b2ac',
                letterSpacing: 1,
              }}
            >
              团队成员
            </div>
            <div style={{ display: 'flex', flex: 1 }}>
              {days.map((d) => (
                <div
                  key={d}
                  style={{
                    width: cellWidth,
                    flexShrink: 0,
                    borderRight: '1px solid #2d3748',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#718096', marginBottom: 4 }}>
                    第 {d + 1} 天
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color:
                        d < Math.floor(analysis.projectDuration)
                          ? '#e2e8f0'
                          : '#4a5568',
                    }}
                  >
                    {d + 1}
                  </div>
                  {d < Math.floor(analysis.projectDuration) && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 3,
                        height: 6,
                        background: '#38b2ac',
                        borderRadius: 2,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {teamMembers.map((member, laneIdx) => {
            const memberTasks = tasksByAssignee.get(member.id) || [];
            return (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  height: LANE_HEIGHT,
                  borderBottom: '1px solid #242c3a',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: LANE_HEADER_WIDTH,
                    flexShrink: 0,
                    borderRight: '1px solid #2d3748',
                    background: `linear-gradient(135deg, ${member.color}22 0%, transparent 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    gap: 10,
                    position: 'sticky',
                    left: 0,
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${member.color} 0%, ${member.color}aa 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#fff',
                      boxShadow: `0 4px 12px ${member.color}55`,
                    }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#e2e8f0',
                      }}
                    >
                      {member.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#718096' }}>
                      {memberTasks.length} 个任务
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    position: 'relative',
                    flex: 1,
                    background:
                      laneIdx % 2 === 0
                        ? 'rgba(45, 55, 72, 0.1)'
                        : 'transparent',
                  }}
                >
                  {days.map((d) => (
                    <div
                      key={d}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: d * cellWidth,
                        width: cellWidth,
                        height: '100%',
                        borderRight: '1px dashed rgba(74, 85, 104, 0.3)',
                      }}
                    />
                  ))}

                  {memberTasks.map((task) => {
                    const info = scheduleInfoMap.get(task.id);
                    const startDay = info ? info.earliestStart : task.startDay;
                    const left = startDay * cellWidth + 6;
                    const isCritical = criticalPathSet.has(task.id);

                    return (
                      <div
                        key={task.id}
                        ref={(el) => {
                          if (el) taskRefs.set(task.id, el);
                        }}
                        style={{
                          position: 'absolute',
                          left,
                          top: CARD_ROW_OFFSET,
                          zIndex: isCritical ? 3 : 2,
                        }}
                      >
                        <TaskCard
                          task={task}
                          scheduleInfo={info}
                          isCritical={isCritical}
                          cellWidth={cellWidth}
                          onPortDragStart={handlePortDragStart}
                          onPortMouseUp={handlePortMouseUp}
                          onCardClick={onTaskClick}
                          onPortMouseEnter={(id) => setHoverInputTask(id)}
                          onPortMouseLeave={() => setHoverInputTask(null)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div
            style={{
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              fontSize: 12,
              color: '#718096',
              borderTop: '1px solid #2d3748',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 16,
                  height: 3,
                  background: '#ffd700',
                  borderRadius: 2,
                  boxShadow: '0 0 6px rgba(255, 215, 0, 0.6)',
                }}
              />
              关键路径 ({analysis.criticalPath.length} 个任务)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 16,
                  height: 2,
                  background: '#5a6577',
                  borderRadius: 2,
                }}
              />
              非关键路径
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(56, 178, 172, 0.15)',
                  color: '#38b2ac',
                  fontWeight: 600,
                }}
              >
                总工期 {analysis.projectDuration.toFixed(1)} 天
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
