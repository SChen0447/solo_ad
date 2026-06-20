import React, { useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BoardData,
  Task,
  TeamMember,
  boardApi,
  socketService,
} from "../api";
import SprintColumn from "../components/SprintColumn";

interface BoardPageProps {
  boardData: BoardData;
  onBoardUpdate: (data: BoardData) => void;
}

const BoardPage: React.FC<BoardPageProps> = ({ boardData, onBoardUpdate }) => {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [_remoteMovingTaskId, _setRemoteMovingTaskId] = useState<string | null>(null);
  const [showBurndown, setShowBurndown] = useState(false);
  const [modalAnimating, setModalAnimating] = useState(false);
  const [filteredMemberId, setFilteredMemberId] = useState<string | null>(null);
  const [hoverColumnId, setHoverColumnId] = useState<string | null>(null);
  const [highlightDropIndex, setHighlightDropIndex] = useState<number | null>(null);

  const { columns, tasks, team_members, burndown_data } = boardData;

  const handleTaskDragStart = useCallback(
    (e: React.DragEvent, taskId: string) => {
      setDraggingTaskId(taskId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", taskId);
      const target = e.currentTarget as HTMLElement;
      target.style.opacity = "0.5";
    },
    []
  );

  const handleTaskDragEnd = useCallback(() => {
    setDraggingTaskId(null);
    setHoverColumnId(null);
    setHighlightDropIndex(null);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnter = useCallback(
    (columnId: string, index: number) => {
      if (draggingTaskId) {
        setHoverColumnId(columnId);
        setHighlightDropIndex(index);
      }
    },
    [draggingTaskId]
  );

  const handleColumnDrop = useCallback(
    (e: React.DragEvent, targetColumnId: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("text/plain");
      if (!taskId || taskId !== draggingTaskId) return;

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const colTasks = tasks
        .filter((t) => t.column_id === targetColumnId)
        .sort((a, b) => a.order - b.order);
      let targetOrder = colTasks.length;

      if (
        hoverColumnId === targetColumnId &&
        highlightDropIndex !== null &&
        highlightDropIndex < colTasks.length
      ) {
        const existingTask = colTasks[highlightDropIndex];
        if (existingTask) {
          targetOrder = existingTask.order;
        }
      }

      if (task.column_id === targetColumnId && task.order === targetOrder) {
        setDraggingTaskId(null);
        return;
      }

      const updatedTasks = tasks.map((t) => {
        if (t.id === taskId) {
          return { ...t, column_id: targetColumnId, order: targetOrder };
        }

        if (t.column_id === targetColumnId) {
          if (task.column_id !== targetColumnId) {
            if (t.order >= targetOrder) {
              return { ...t, order: t.order + 1 };
            }
          } else {
            const oldOrder = task.order;
            if (targetOrder > oldOrder) {
              if (oldOrder < t.order && t.order <= targetOrder) {
                return { ...t, order: t.order - 1 };
              }
            } else if (targetOrder < oldOrder) {
              if (targetOrder <= t.order && t.order < oldOrder) {
                return { ...t, order: t.order + 1 };
              }
            }
          }
        } else if (t.column_id === task.column_id && task.column_id !== targetColumnId) {
          if (t.order > task.order) {
            return { ...t, order: t.order - 1 };
          }
        }

        return t;
      });

      onBoardUpdate({ ...boardData, tasks: updatedTasks });

      boardApi.moveTask(taskId, targetColumnId, targetOrder).catch(() => {
        onBoardUpdate({ ...boardData, tasks });
      });
      socketService.emitMoveTask(taskId, targetColumnId, targetOrder);

      setDraggingTaskId(null);
      setHoverColumnId(null);
      setHighlightDropIndex(null);
    },
    [draggingTaskId, tasks, boardData, hoverColumnId, highlightDropIndex, onBoardUpdate]
  );

  const openBurndownModal = useCallback(() => {
    setShowBurndown(true);
    requestAnimationFrame(() => {
      setModalAnimating(true);
    });
  }, []);

  const closeBurndownModal = useCallback(() => {
    setModalAnimating(false);
    setTimeout(() => setShowBurndown(false), 300);
  }, []);

  const toggleMemberFilter = useCallback((memberId: string) => {
    setFilteredMemberId((prev) => (prev === memberId ? null : memberId));
  }, []);

  const workloadData = useMemo(() => {
    const map: Record<string, { member: TeamMember; weight: number; count: number }> = {};
    team_members.forEach((m) => {
      map[m.id] = { member: m, weight: 0, count: 0 };
    });
    tasks.forEach((t) => {
      if (map[t.assignee.id]) {
        map[t.assignee.id].weight += t.estimate;
        map[t.assignee.id].count += 1;
      }
    });
    const list = Object.values(map).sort((a, b) => b.weight - a.weight);
    const max = Math.max(1, ...list.map((i) => i.weight));
    return list.map((item) => ({ ...item, percentage: (item.weight / max) * 100 }));
  }, [team_members, tasks]);

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    columns.forEach((c) => {
      map[c.id] = tasks.filter((t) => t.column_id === c.id);
    });
    return map;
  }, [columns, tasks]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a2e",
        color: "#e0e0e0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes wipBlink {
          0%, 100% { background-color: #dc2626; }
          50% { background-color: #991b1b; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes modalOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.9); }
        }
        @keyframes backdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes backdropOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @media (max-width: 1024px) {
          .board-container {
            flex-direction: column !important;
          }
          .workload-panel {
            width: 100% !important;
            flex-direction: row !important;
            flex-wrap: wrap;
            gap: 12px;
            padding: 12px !important;
          }
          .workload-item {
            flex: 1 1 200px !important;
          }
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.25);
        }
      `}</style>

      <header
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="11" rx="1" />
            </svg>
          </div>
          <div>
            <h1
              style={{
                fontSize: "18px",
                fontWeight: 600,
                margin: 0,
                color: "#fff",
              }}
            >
              敏捷看板 · Sprint 1
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#718096",
              }}
            >
              {boardData.sprint_start_date} · 共 {boardData.sprint_duration} 天
            </p>
          </div>
        </div>

        <button
          onClick={openBurndownModal}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 500,
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            boxShadow: "0 4px 14px rgba(102, 126, 234, 0.4)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 6px 20px rgba(102, 126, 234, 0.5)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 4px 14px rgba(102, 126, 234, 0.4)";
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          燃尽图
        </button>
      </header>

      <div
        className="board-container"
        style={{
          flex: 1,
          display: "flex",
          padding: "20px",
          gap: "20px",
          minHeight: 0,
        }}
      >
        <aside
          className="workload-panel"
          style={{
            width: "260px",
            flexShrink: 0,
            background: "#16213e",
            borderRadius: "12px",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            overflowY: "auto",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 600,
                color: "#fff",
                marginBottom: "4px",
              }}
            >
              团队工作量
            </h3>
            <p style={{ margin: 0, fontSize: "11px", color: "#718096" }}>
              点击成员可筛选任务
            </p>
          </div>

          {workloadData.map((item) => {
            const isSelected = filteredMemberId === item.member.id;
            const pct = item.percentage;
            const r = Math.round(102 + (239 - 102) * (pct / 100));
            const g = Math.round(126 + (68 - 126) * (pct / 100));
            const b = Math.round(234 + (68 - 234) * (pct / 100));
            const barColor = `rgb(${r}, ${g}, ${b})`;
            const gradientEnd = `rgb(239, 68, 68)`;

            return (
              <div
                key={item.member.id}
                className="workload-item"
                onClick={() => toggleMemberFilter(item.member.id)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: isSelected
                    ? "rgba(102, 126, 234, 0.15)"
                    : "rgba(255,255,255,0.02)",
                  border: isSelected
                    ? "1px solid rgba(102, 126, 234, 0.4)"
                    : "1px solid transparent",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.02)";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: `hsl(${(item.member.name.charCodeAt(0) * 17) % 360}, 60%, 55%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#fff",
                      }}
                    >
                      {item.member.name.charAt(0)}
                    </div>
                    <span style={{ fontSize: "13px", color: "#e0e0e0" }}>
                      {item.member.name}
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#a0aec0" }}>
                    {item.weight}h · {item.count}项
                  </span>
                </div>
                <div
                  style={{
                    height: "8px",
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${barColor} 0%, ${gradientEnd} 100%)`,
                      borderRadius: "4px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}

          {filteredMemberId && (
            <button
              onClick={() => setFilteredMemberId(null)}
              style={{
                marginTop: "8px",
                padding: "8px",
                borderRadius: "6px",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#fca5a5",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                cursor: "pointer",
                fontSize: "12px",
                transition: "all 0.2s ease",
              }}
            >
              清除筛选
            </button>
          )}
        </aside>

        <main
          style={{
            flex: 1,
            display: "flex",
            gap: "20px",
            minWidth: 0,
          }}
        >
          {columns.map((col, idx) => (
            <React.Fragment key={col.id}>
              <SprintColumn
                column={col}
                tasks={tasksByColumn[col.id] || []}
                draggingTaskId={draggingTaskId}
                remoteMovingTaskId={_remoteMovingTaskId}
                filteredMemberId={filteredMemberId}
                onTaskDragStart={handleTaskDragStart}
                onTaskDragEnd={handleTaskDragEnd}
                onDragOver={handleColumnDragOver}
                onDrop={handleColumnDrop}
                onDragEnter={handleDragEnter}
                highlightDropIndex={
                  hoverColumnId === col.id ? highlightDropIndex : null
                }
              />
              {idx < columns.length - 1 && (
                <div
                  style={{
                    width: "1px",
                    background: "rgba(255,255,255,0.06)",
                    margin: "8px 0",
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </main>
      </div>

      {showBurndown && (
        <div
          onClick={closeBurndownModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
            animation: modalAnimating ? "backdropIn 0.3s ease forwards" : "backdropOut 0.3s ease forwards",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#16213e",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              animation: modalAnimating ? "modalIn 0.3s ease forwards" : "modalOut 0.3s ease forwards",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  Sprint 燃尽图
                </h2>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "13px",
                    color: "#718096",
                  }}
                >
                  剩余工时趋势追踪
                </p>
              </div>
              <button
                onClick={closeBurndownModal}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.05)",
                  color: "#a0aec0",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLElement).style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLElement).style.color = "#a0aec0";
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ height: "380px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burndown_data} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    stroke="#718096"
                    tick={{ fill: "#718096", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#718096"
                    tick={{ fill: "#718096", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={false}
                    label={{
                      value: "剩余工时(h)",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#718096",
                      fontSize: 12,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f3460",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#e0e0e0",
                      fontSize: "12px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                    labelStyle={{ color: "#fff", fontWeight: 600, marginBottom: "4px" }}
                    formatter={(value: number, name: string) => [
                      `${value} h`,
                      name === "actual" ? "实际剩余" : "理想剩余",
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ color: "#a0aec0", fontSize: "12px", paddingTop: "16px" }}
                    formatter={(value) =>
                      value === "actual" ? "实际剩余工时" : "理想燃尽线"
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="ideal"
                    stroke="#6b7280"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 5, fill: "#6b7280" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#ef4444", strokeWidth: 2, stroke: "#16213e" }}
                    activeDot={{ r: 6, fill: "#ef4444", stroke: "#fff", strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                marginTop: "20px",
                padding: "14px 16px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "16px",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "#718096", marginBottom: "4px" }}>
                    总工时
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 600, color: "#fff" }}>
                    {tasks.reduce((sum, t) => sum + t.estimate, 0)}h
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#718096", marginBottom: "4px" }}>
                    已完成
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 600, color: "#22c55e" }}>
                    {tasks.filter((t) => t.column_id === "done").reduce((sum, t) => sum + t.estimate, 0)}h
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#718096", marginBottom: "4px" }}>
                    进行中
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 600, color: "#3b82f6" }}>
                    {tasks.filter((t) => t.column_id === "in_progress").reduce((sum, t) => sum + t.estimate, 0)}h
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardPage;
