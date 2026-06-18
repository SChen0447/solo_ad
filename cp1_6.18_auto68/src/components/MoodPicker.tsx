import React, { useEffect, useMemo } from "react";
import {
  GradientColors,
  MoodWord,
  MOOD_WORDS,
  generateGradient,
  gradientToCss,
} from "../context/JournalContext";

interface MoodPickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMood: string | null;
  onSelectMood: (word: MoodWord) => void;
  gradient: GradientColors;
  onGradientChange: (gradient: GradientColors) => void;
}

export const MoodPicker: React.FC<MoodPickerProps> = ({
  isOpen,
  onClose,
  selectedMood,
  onSelectMood,
  gradient,
  onGradientChange,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const saturationBg = useMemo(() => {
    const avgHue = (gradient.startHue + gradient.endHue) / 2;
    return `linear-gradient(to right, hsl(${avgHue}, 0%, 60%), hsl(${avgHue}, 100%, 60%))`;
  }, [gradient]);

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hue = parseInt(e.target.value, 10);
    let endHue = hue + 30;
    if (endHue > 360) endHue -= 360;
    onGradientChange({
      ...gradient,
      startHue: hue,
      endHue,
    });
  };

  const handleSaturationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sat = parseInt(e.target.value, 10);
    onGradientChange({
      ...gradient,
      startSaturation: sat,
      endSaturation: Math.max(30, sat - 15),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="mood-picker-overlay" onClick={onClose}>
      <div className="mood-picker-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mood-picker-header">
          <h2 className="mood-picker-title">选择今日心情</h2>
          <button className="mood-picker-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="mood-grid">
          {MOOD_WORDS.map((mood) => {
            const bg = gradientToCss(generateGradient(mood));
            const isActive = selectedMood === mood.word;
            return (
              <button
                key={mood.word}
                className={`mood-word${isActive ? " active" : ""}`}
                style={
                  isActive
                    ? ({ background: bg } as React.CSSProperties)
                    : ({ "--hover-bg": bg } as React.CSSProperties)
                }
                onClick={() => onSelectMood(mood)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = bg;
                  (e.currentTarget as HTMLElement).style.color = "white";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(255, 255, 255, 0.7)";
                    (e.currentTarget as HTMLElement).style.color = "#374151";
                  }
                }}
              >
                {mood.word}
              </button>
            );
          })}
        </div>

        {selectedMood && (
          <div style={{ marginTop: "24px" }}>
            <div className="color-adjuster">
              <div className="form-label">微调颜色</div>
              <div
                className="color-preview"
                style={{ background: gradientToCss(gradient) }}
              />
              <div className="slider-group">
                <div className="slider-label">
                  <span>色相</span>
                  <span>{gradient.startHue}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={gradient.startHue}
                  onChange={handleHueChange}
                  className="hue-slider"
                />
              </div>
              <div className="slider-group">
                <div className="slider-label">
                  <span>饱和度</span>
                  <span>{gradient.startSaturation}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={gradient.startSaturation}
                  onChange={handleSaturationChange}
                  className="saturation-slider"
                  style={{ background: saturationBg }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
