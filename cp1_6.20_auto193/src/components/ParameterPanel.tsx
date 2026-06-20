import React, { useState, useCallback, useRef, useEffect } from "react";
import type { LSystemParams } from "../types";

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  tooltip: string;
}

const Slider: React.FC<SliderProps> = ({
  label,
  min,
  max,
  step,
  value,
  onChange,
  tooltip,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 6,
          position: "relative",
        }}
      >
        <span style={{ fontSize: 13, color: "#AAAAAA", marginRight: 4 }}>
          {label}
        </span>
        <div
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#666",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 9,
            cursor: "help",
            flexShrink: 0,
          }}
        >
          ?
        </div>
        {showTooltip && (
          <div
            style={{
              position: "absolute",
              top: 22,
              left: 0,
              background: "#333",
              borderRadius: 4,
              padding: "4px 8px",
              fontSize: 11,
              color: "#ddd",
              whiteSpace: "nowrap",
              zIndex: 100,
            }}
          >
            {tooltip}
          </div>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "monospace",
            fontSize: 12,
            color: "#CCCCCC",
          }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: "100%",
          accentColor: "#4ECDC4",
          cursor: "pointer",
        }}
      />
    </div>
  );
};

interface ParameterPanelProps {
  params: LSystemParams;
  onParamsChange: (params: LSystemParams) => void;
  compareMode: boolean;
  onCompareToggle: () => void;
}

const ParameterPanel: React.FC<ParameterPanelProps> = ({
  params,
  onParamsChange,
  compareMode,
  onCompareToggle,
}) => {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedChange = useCallback(
    (newParams: LSystemParams) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onParamsChange(newParams);
      }, 500);
    },
    [onParamsChange]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div
      style={{
        width: 240,
        background: "#2C2C2C",
        borderRadius: 12,
        padding: 16,
        color: "#CCCCCC",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <h3
        style={{
          fontSize: 15,
          color: "#fff",
          marginBottom: 16,
          borderBottom: "1px solid #444",
          paddingBottom: 8,
        }}
      >
        L系统参数
      </h3>

      <Slider
        label="分支角度"
        min={0}
        max={90}
        step={1}
        value={params.branchAngle}
        onChange={(v) => debouncedChange({ ...params, branchAngle: v })}
        tooltip="控制枝干与主干的夹角，角度越大树形越开张"
      />

      <Slider
        label="分支深度"
        min={1}
        max={5}
        step={1}
        value={params.branchDepth}
        onChange={(v) => debouncedChange({ ...params, branchDepth: v })}
        tooltip="控制分支的递归层数，深度越大树越茂密"
      />

      <Slider
        label="长度缩放"
        min={0.5}
        max={2.0}
        step={0.1}
        value={params.branchLengthScale}
        onChange={(v) => debouncedChange({ ...params, branchLengthScale: v })}
        tooltip="缩放枝干长度，值越大枝干越长"
      />

      <div style={{ marginTop: 20 }}>
        <button
          onClick={onCompareToggle}
          style={{
            width: "100%",
            padding: "10px 0",
            textAlign: "center",
            color: compareMode ? "#fff" : "#4ECDC4",
            background: compareMode
              ? "#4ECDC4"
              : "transparent",
            border: "2px solid #4ECDC4",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!compareMode) {
              (e.target as HTMLButtonElement).style.background = "#3AB4A0";
              (e.target as HTMLButtonElement).style.color = "#fff";
            }
          }}
          onMouseLeave={(e) => {
            if (!compareMode) {
              (e.target as HTMLButtonElement).style.background = "transparent";
              (e.target as HTMLButtonElement).style.color = "#4ECDC4";
            }
          }}
        >
          {compareMode ? "退出对比" : "对比模式"}
        </button>
      </div>
    </div>
  );
};

export default ParameterPanel;
