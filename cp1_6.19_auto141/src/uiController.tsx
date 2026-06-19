import React, { useState, useEffect, useRef, useCallback } from "react";
import type { StarType, PlanetOrbitParams, OrbitalSystemParams } from "./orbitCalculator";

interface UIControllerProps {
  currentStarType: StarType;
  orbitalSystem: OrbitalSystemParams | null;
  speedMultiplier: number;
  selectedPlanetIndex: number | null;
  onStarTypeChange: (starType: StarType) => void;
  onSpeedChange: (speed: number) => void;
  onResetCamera: () => void;
}

function AnimatedNumber({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [animating, setAnimating] = useState(false);
  const prevValue = useRef(value);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (prevValue.current === value) return;
    setAnimating(true);
    const startValue = prevValue.current;
    const diff = value - startValue;
    const duration = 300;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t * (2 - t);
      setDisplayValue(startValue + diff * eased);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setAnimating(false);
        prevValue.current = value;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [value]);

  return (
    <span
      style={{
        display: "inline-block",
        fontVariantNumeric: "tabular-nums",
        transition: animating ? "none" : "transform 0.15s ease",
      }}
    >
      {displayValue.toFixed(decimals)}
    </span>
  );
}

const STAR_OPTIONS: { value: StarType; label: string }[] = [
  { value: "main-sequence", label: "主序星" },
  { value: "red-giant", label: "红巨星" },
  { value: "white-dwarf", label: "白矮星" },
];

function PlanetDetailPanel({
  planet,
  visible,
  onClose,
}: {
  planet: PlanetOrbitParams | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!planet) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        height: "100%",
        width: "min(360px, 85vw)",
        background: "rgba(10, 14, 42, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderRadius: "12px 0 0 12px",
        borderLeft: "1px solid rgba(68, 136, 255, 0.2)",
        padding: "28px 24px",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        overflowY: "auto",
        color: "#e0e6f0",
        zIndex: 100,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 12,
          right: 16,
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.5)",
          fontSize: "20px",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: "4px",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.background = "rgba(255,255,255,0.2)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.background = "none";
        }}
      >
        ✕
      </button>

      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${planet.color}, rgba(0,0,0,0.5))`,
          marginBottom: 16,
          boxShadow: `0 0 20px ${planet.color}44`,
        }}
      />

      <h2
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "22px",
          fontWeight: 700,
          color: planet.color,
          marginBottom: 20,
          letterSpacing: "1px",
        }}
      >
        {planet.name}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ParamRow label="半径" unit="AU" value={planet.radius} />
        <ParamRow label="轨道半径" unit="AU" value={planet.orbitRadius} />
        <ParamRow
          label="公转周期"
          unit="地球日"
          value={planet.period}
          decimals={1}
        />
        <ParamRow label="离心率" value={planet.eccentricity} decimals={3} />
        <ParamRow label="轨道倾角" unit="°" value={planet.inclination} />
      </div>

      <div
        style={{
          marginTop: 24,
          padding: "14px 16px",
          background: "rgba(68, 136, 255, 0.08)",
          borderRadius: 10,
          border: "1px solid rgba(68, 136, 255, 0.15)",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            lineHeight: 1.7,
            color: "rgba(224, 230, 240, 0.8)",
          }}
        >
          {planet.description}
        </p>
      </div>
    </div>
  );
}

function ParamRow({
  label,
  value,
  unit,
  decimals = 2,
}: {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "8px 0",
        borderBottom: "1px solid rgba(68, 136, 255, 0.08)",
      }}
    >
      <span style={{ fontSize: "13px", color: "rgba(224,230,240,0.6)" }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "16px",
          fontWeight: 600,
          color: "#e0e6f0",
        }}
      >
        <AnimatedNumber value={value} decimals={decimals} />
        {unit && (
          <span
            style={{
              fontSize: "11px",
              color: "rgba(224,230,240,0.4)",
              marginLeft: 4,
              fontFamily: "'Noto Sans SC', sans-serif",
              fontWeight: 400,
            }}
          >
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

export default function UIController({
  currentStarType,
  orbitalSystem,
  speedMultiplier,
  selectedPlanetIndex,
  onStarTypeChange,
  onSpeedChange,
  onResetCamera,
}: UIControllerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (selectedPlanetIndex !== null) {
      setPanelOpen(true);
    }
  }, [selectedPlanetIndex]);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const selectedPlanet =
    orbitalSystem && selectedPlanetIndex !== null
      ? orbitalSystem.planets[selectedPlanetIndex]
      : null;

  const glassStyle: React.CSSProperties = {
    background: "rgba(10, 14, 42, 0.7)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderRadius: 12,
    border: "1px solid rgba(68, 136, 255, 0.15)",
  };

  if (isMobile) {
    return (
      <>
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            ...glassStyle,
            borderRadius: "12px 12px 0 0",
            zIndex: 200,
          }}
        >
          <select
            value={currentStarType}
            onChange={(e) => onStarTypeChange(e.target.value as StarType)}
            style={{
              background: "rgba(68, 136, 255, 0.15)",
              color: "#e0e6f0",
              border: "1px solid rgba(68, 136, 255, 0.3)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: "13px",
              fontFamily: "'Noto Sans SC', sans-serif",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {STAR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ background: "#0a0e2a" }}>
                {opt.label}
              </option>
            ))}
          </select>

          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={speedMultiplier}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              style={{
                flex: 1,
                accentColor: "#4488ff",
                height: 4,
              }}
            />
            <span
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "12px",
                color: "#4488ff",
                minWidth: 36,
                textAlign: "right",
              }}
            >
              {speedMultiplier.toFixed(1)}x
            </span>
          </div>

          <button
            onClick={onResetCamera}
            style={{
              background: "rgba(68, 136, 255, 0.15)",
              border: "1px solid rgba(68, 136, 255, 0.3)",
              borderRadius: 8,
              color: "#e0e6f0",
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: "13px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = "rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = "rgba(68, 136, 255, 0.15)";
            }}
          >
            ↺
          </button>
        </div>

        <PlanetDetailPanel
          planet={selectedPlanet}
          visible={panelOpen}
          onClose={handleClosePanel}
        />
      </>
    );
  }

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          zIndex: 100,
        }}
      >
        <div style={{ ...glassStyle, padding: "12px 16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              color: "rgba(224,230,240,0.5)",
              marginBottom: 6,
              fontFamily: "'Noto Sans SC', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
            }}
          >
            恒星类型
          </label>
          <select
            value={currentStarType}
            onChange={(e) => onStarTypeChange(e.target.value as StarType)}
            style={{
              background: "rgba(68, 136, 255, 0.12)",
              color: "#e0e6f0",
              border: "1px solid rgba(68, 136, 255, 0.25)",
              borderRadius: 8,
              padding: "8px 28px 8px 12px",
              fontSize: "14px",
              fontFamily: "'Noto Sans SC', sans-serif",
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              WebkitAppearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234488ff' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              transition: "border-color 0.2s",
            }}
          >
            {STAR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ background: "#0a0e2a" }}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ ...glassStyle, padding: "14px 16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              color: "rgba(224,230,240,0.5)",
              marginBottom: 8,
              fontFamily: "'Noto Sans SC', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
            }}
          >
            公转速度
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={speedMultiplier}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                style={{
                  width: "100%",
                  height: 6,
                  appearance: "none",
                  WebkitAppearance: "none",
                  background: `linear-gradient(to right, #4488ff ${
                    ((speedMultiplier - 0.1) / 4.9) * 100
                  }%, rgba(68, 136, 255, 0.15) ${
                    ((speedMultiplier - 0.1) / 4.9) * 100
                  }%)`,
                  borderRadius: 3,
                  outline: "none",
                  cursor: "pointer",
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "#4488ff",
                minWidth: 44,
                textAlign: "right",
              }}
            >
              {speedMultiplier.toFixed(1)}x
            </span>
          </div>
        </div>

        <button
          onClick={onResetCamera}
          style={{
            ...glassStyle,
            padding: "10px 18px",
            color: "rgba(224,230,240,0.8)",
            cursor: "pointer",
            fontSize: "13px",
            fontFamily: "'Noto Sans SC', sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "background 0.2s",
            border: "1px solid rgba(68, 136, 255, 0.15)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(10, 14, 42, 0.7)";
          }}
        >
          <span style={{ fontSize: "16px" }}>↺</span> 重置视角
        </button>

        {orbitalSystem && (
          <div style={{ ...glassStyle, padding: "14px 16px", maxHeight: 220, overflowY: "auto" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                color: "rgba(224,230,240,0.5)",
                marginBottom: 8,
                fontFamily: "'Noto Sans SC', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
              }}
            >
              行星列表
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {orbitalSystem.planets.map((p, i) => (
                <div
                  key={p.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 6,
                    background:
                      selectedPlanetIndex === i
                        ? "rgba(68, 136, 255, 0.15)"
                        : "transparent",
                    transition: "background 0.2s",
                    cursor: "default",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: p.color,
                      boxShadow: `0 0 6px ${p.color}66`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "#e0e6f0" }}>
                    {p.name}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "11px",
                      color: "rgba(224,230,240,0.4)",
                      fontFamily: "'Orbitron', sans-serif",
                    }}
                  >
                    {p.period.toFixed(0)}d
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <PlanetDetailPanel
        planet={selectedPlanet}
        visible={panelOpen}
        onClose={handleClosePanel}
      />

      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          ...glassStyle,
          padding: "8px 16px",
          fontSize: "11px",
          color: "rgba(224,230,240,0.35)",
          fontFamily: "'Noto Sans SC', sans-serif",
          letterSpacing: "0.5px",
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        拖拽旋转 · 滚轮缩放 · 点击行星查看详情
      </div>
    </>
  );
}
