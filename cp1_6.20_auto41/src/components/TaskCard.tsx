import React from "react";
import { Task, Priority } from "../api";

interface TaskCardProps {
  task: Task;
  isDragging: boolean;
  isRemoteMoving?: boolean;
  filteredOut?: boolean;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onClick?: () => void;
}

const priorityColors: Record<Priority, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#6b7280",
};

const priorityLabels: Record<Priority, string> = {
  urgent: "紧急",
  high: "高",
  medium: "中",
  low: "低",
};

function hashColor(name: string): string {
  const colors = [
    "#667eea", "#764ba2", "#f093fb", "#f5576c",
    "#4facfe", "#00f2fe", "#43e97b", "#38f9d7",
    "#fa709a", "#fee140", "#30cfd0", "#330867",
    "#a8edea", "#fed6e3", "#ff9a9e", "#fecfef",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
    h = h >>> 0;
  }
  return colors[h % colors.length];
}

function getInitial(name: string): string {
  return name.charAt(0);
}

function truncateTitle(title: string, maxLen: number = 30): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen) + "...";
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isDragging,
  isRemoteMoving = false,
  filteredOut = false,
  onDragStart,
  onDragEnd,
}) => {
  const borderColor = priorityColors[task.priority];
  const avatarBg = hashColor(task.assignee.name);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      style={{
        position: "relative",
        background: "#16213e",
        borderRadius: "5px",
        padding: "12px",
        borderLeft: `3px solid ${borderColor}`,
        cursor: "grab",
        userSelect: "none",
        transform: isDragging
          ? "scale(1.05) rotate(2deg)"
          : isRemoteMoving
          ? "scale(1)"
          : "scale(1)",
        boxShadow: isDragging
          ? "0 12px 32px rgba(0,0,0,0.5)"
          : "0 2px 8px rgba(0,0,0,0.2)",
        opacity: filteredOut ? 0 : isDragging ? 0.95 : 1,
        transition: isDragging
          ? "none"
          : isRemoteMoving
          ? "opacity 0.4s ease, transform 0.4s ease, box-shadow 0.3s ease"
          : "opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease",
        pointerEvents: filteredOut ? "none" : "auto",
        height: filteredOut ? 0 : "auto",
        paddingTop: filteredOut ? 0 : "12px",
        paddingBottom: filteredOut ? 0 : "12px",
        marginBottom: filteredOut ? 0 : "10px",
        overflow: "hidden",
        willChange: "transform, opacity",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "#e0e0e0",
            lineHeight: 1.4,
            flex: 1,
          }}
          title={task.title}
        >
          {truncateTitle(task.title)}
        </div>
        <div
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: "10px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#fff",
            background: borderColor,
            flexShrink: 0,
          }}
        >
          {priorityLabels[task.priority]}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: avatarBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 600,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {getInitial(task.assignee.name)}
          </div>
          <span
            style={{
              fontSize: "12px",
              color: "#a0aec0",
            }}
          >
            {task.assignee.name}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            color: "#a0aec0",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{task.estimate}h</span>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
