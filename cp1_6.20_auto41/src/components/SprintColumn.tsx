import React from "react";
import { SprintColumn as SprintColumnType, Task } from "../api";
import TaskCard from "./TaskCard";

interface SprintColumnProps {
  column: SprintColumnType;
  tasks: Task[];
  draggingTaskId: string | null;
  remoteMovingTaskId: string | null;
  filteredMemberId: string | null;
  onTaskDragStart: (e: React.DragEvent, taskId: string) => void;
  onTaskDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  onDragEnter?: (columnId: string, index: number) => void;
  highlightDropIndex?: number | null;
}

const ListIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const GearIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const iconMap: Record<string, React.FC> = {
  list: ListIcon,
  gear: GearIcon,
  check: CheckIcon,
};

const SprintColumn: React.FC<SprintColumnProps> = ({
  column,
  tasks,
  draggingTaskId,
  remoteMovingTaskId,
  filteredMemberId,
  onTaskDragStart,
  onTaskDragEnd,
  onDragOver,
  onDrop,
  onDragEnter,
  highlightDropIndex,
}) => {
  const taskCount = tasks.length;
  const exceedsWip = taskCount > column.wip && column.wip < 999;
  const Icon = iconMap[column.icon] || ListIcon;

  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: "300px",
        height: "100%",
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderRadius: "10px",
          marginBottom: "16px",
          background: exceedsWip ? "#dc2626" : "#0f3460",
          color: "#fff",
          animation: exceedsWip ? "wipBlink 1s ease-in-out infinite" : "none",
          transition: "background 0.3s ease",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Icon />
          <span
            style={{
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            {column.name}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 500,
            background: "rgba(0,0,0,0.25)",
            padding: "3px 10px",
            borderRadius: "12px",
          }}
        >
          <span>{taskCount}</span>
          {column.wip < 999 && (
            <>
              <span style={{ opacity: 0.6 }}>/</span>
              <span>{column.wip}</span>
            </>
          )}
        </div>
      </div>

      <div
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, column.id)}
        style={{
          flex: 1,
          padding: "4px",
          borderRadius: "8px",
          minHeight: "200px",
          overflowY: "auto",
          background: "rgba(255,255,255,0.02)",
          transition: "background 0.2s ease",
        }}
      >
        {sortedTasks.map((task, index) => {
          const isFilteredOut =
            filteredMemberId !== null &&
            task.assignee.id !== filteredMemberId;

          return (
            <div
              key={task.id}
              onDragEnter={() => onDragEnter?.(column.id, index)}
              style={{
                position: "relative",
                transform:
                  highlightDropIndex === index && draggingTaskId !== task.id
                    ? "translateY(4px)"
                    : "translateY(0)",
                transition: "transform 0.2s ease",
              }}
            >
              <TaskCard
                task={task}
                isDragging={draggingTaskId === task.id}
                isRemoteMoving={remoteMovingTaskId === task.id}
                filteredOut={isFilteredOut}
                onDragStart={onTaskDragStart}
                onDragEnd={onTaskDragEnd}
              />
            </div>
          );
        })}

        {sortedTasks.length === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "120px",
              color: "#4a5568",
              fontSize: "13px",
              border: "2px dashed #2d3748",
              borderRadius: "8px",
            }}
          >
            拖拽任务到此列
          </div>
        )}
      </div>
    </div>
  );
};

export default SprintColumn;
