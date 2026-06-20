import React from "react";
import { motion } from "framer-motion";
import type { Season } from "../types";

interface SeasonSelectorProps {
  current: Season;
  onChange: (season: Season) => void;
}

const seasons: { key: Season; label: string; color: string }[] = [
  { key: "spring", label: "春", color: "#A8D5A2" },
  { key: "summer", label: "夏", color: "#4CAF50" },
  { key: "autumn", label: "秋", color: "#FF9800" },
  { key: "winter", label: "冬", color: "#9E9E9E" },
];

const SeasonSelector: React.FC<SeasonSelectorProps> = ({ current, onChange }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 20px 8px",
        background: "rgba(26,26,46,0.7)",
      }}
    >
      <span style={{ fontSize: 12, color: "#AAAAAA", marginRight: 4 }}>
        季节
      </span>
      {seasons.map((s) => (
        <motion.button
          key={s.key}
          onClick={() => onChange(s.key)}
          animate={{
            scale: current === s.key ? 1.2 : 1,
            boxShadow:
              current === s.key
                ? `0 0 8px ${s.color}`
                : "0 0 0px transparent",
          }}
          transition={{ duration: 0.3 }}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border:
              current === s.key
                ? "2px solid #fff"
                : "2px solid transparent",
            background: s.color,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "#333",
            fontWeight: 700,
            outline: "none",
          }}
        >
          {s.label}
        </motion.button>
      ))}
    </div>
  );
};

export default SeasonSelector;
