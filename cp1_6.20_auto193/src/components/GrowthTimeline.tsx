import React from "react";

interface GrowthTimelineProps {
  value: number;
  onChange: (v: number) => void;
}

const GrowthTimeline: React.FC<GrowthTimelineProps> = ({ value, onChange }) => {
  const currentYear = Math.round((value / 100) * 30);

  return (
    <div
      style={{
        padding: "8px 20px 12px",
        background: "rgba(26,26,46,0.85)",
        borderTop: "1px solid #333",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 12, color: "#AAAAAA", whiteSpace: "nowrap" }}>
          生长进度
        </span>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            title={`年份: 第${currentYear}年 | 生长步长: ${value}%`}
            style={{
              width: "100%",
              accentColor: "#4ECDC4",
              cursor: "pointer",
            }}
          />
        </div>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            color: "#CCCCCC",
            minWidth: 60,
            textAlign: "right",
          }}
        >
          第{currentYear}年
        </span>
      </div>
    </div>
  );
};

export default GrowthTimeline;
