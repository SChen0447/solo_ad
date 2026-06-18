import { useRef, useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { formatTime, formatDate, type Vector3 } from '@/utils/mathUtils';

const START_HOUR = 6;
const END_HOUR = 20;

export function ControlPanel() {
  const time = useStore((state) => state.time);
  const dayOfYear = useStore((state) => state.dayOfYear);
  const selectedBuildingId = useStore((state) => state.selectedBuildingId);
  const buildings = useStore((state) => state.buildings);
  const analysisResults = useStore((state) => state.analysisResults);
  const setTime = useStore((state) => state.setTime);
  const setDayOfYear = useStore((state) => state.setDayOfYear);
  const setSelectedBuildingId = useStore((state) => state.setSelectedBuildingId);
  const [panelWidth, setPanelWidth] = useState(280);

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);
  const analysisResult = selectedBuildingId ? analysisResults[selectedBuildingId] : null;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1200) {
        setPanelWidth(200);
      } else {
        setPanelWidth(280);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showChart = panelWidth > 200;

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        width: panelWidth,
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        background: 'rgba(30, 30, 50, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: 16,
        color: '#ecf0f1',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 16,
          color: '#fff',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: 10,
        }}
      >
        日照分析面板
      </div>

      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 14,
            color: '#fff',
            marginBottom: 8,
          }}
        >
          时间：{formatTime(time)}
        </div>
        <input
          type="range"
          min={START_HOUR}
          max={END_HOUR}
          step={0.5}
          value={time}
          onChange={(e) => setTime(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 14,
            color: '#fff',
            marginBottom: 8,
          }}
        >
          日期：{formatDate(dayOfYear)}
        </div>
        <input
          type="range"
          min={1}
          max={365}
          step={1}
          value={dayOfYear}
          onChange={(e) => setDayOfYear(parseInt(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 14,
            color: '#fff',
            marginBottom: 8,
          }}
        >
          选择建筑
        </div>
        <select
          value={selectedBuildingId || ''}
          onChange={(e) => setSelectedBuildingId(e.target.value || null)}
          style={selectStyle}
        >
          <option value="">-- 请选择 --</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {selectedBuilding && analysisResult ? (
        <>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#f4d03f',
              marginBottom: 12,
            }}
          >
            日照总时长：{analysisResult.totalSunMinutes} 分钟
          </div>

          {showChart && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 13,
                  color: '#aaa',
                  marginBottom: 8,
                }}
              >
                每小时日照/阴影分布
              </div>
              <HourlyChart
                hourlySunMinutes={analysisResult.hourlySunMinutes}
                hourlyShadowMinutes={analysisResult.hourlyShadowMinutes}
              />
            </div>
          )}

          {showChart && (
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: '#aaa',
                  marginBottom: 8,
                }}
              >
                最长连续阴影区域
              </div>
              <ShadowDiagram
                shadowPoints={analysisResult.longestShadowArea}
                building={selectedBuilding}
              />
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            color: '#888',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '20px 0',
          }}
        >
          请选择一栋建筑
        </div>
      )}
    </div>
  );
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 6,
  borderRadius: 3,
  background: '#3a3a4a',
  outline: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  color: '#ecf0f1',
  background: '#2c3e50',
  border: '1px solid #3a3a4a',
  borderRadius: 6,
  outline: 'none',
  cursor: 'pointer',
};

function HourlyChart({
  hourlySunMinutes,
  hourlyShadowMinutes,
}: {
  hourlySunMinutes: number[];
  hourlyShadowMinutes: number[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
    visible: boolean;
  }>({ x: 0, y: 0, text: '', visible: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width;
    const height = canvas.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const barCount = hourlySunMinutes.length;
    const barGroupWidth = (width - 20) / barCount;
    const barWidth = barGroupWidth * 0.35;
    const maxValue = 60;
    const chartHeight = height - 30;
    const startY = 20;

    for (let i = 0; i < barCount; i++) {
      const x = 10 + i * barGroupWidth + barGroupWidth * 0.15;

      const sunHeight = (hourlySunMinutes[i] / maxValue) * chartHeight;
      const shadowHeight = (hourlyShadowMinutes[i] / maxValue) * chartHeight;

      const sunGradient = ctx.createLinearGradient(
        x,
        startY + chartHeight - sunHeight,
        x,
        startY + chartHeight
      );
      sunGradient.addColorStop(0, '#ff6b35');
      sunGradient.addColorStop(1, '#ffe066');
      ctx.fillStyle = sunGradient;
      ctx.fillRect(x, startY + chartHeight - sunHeight, barWidth, sunHeight);

      ctx.fillStyle = '#5dade2';
      ctx.fillRect(
        x + barWidth + 2,
        startY + chartHeight - shadowHeight,
        barWidth,
        shadowHeight
      );

      if (i % 2 === 0) {
        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${START_HOUR + i}`,
          x + barWidth,
          startY + chartHeight + 15
        );
      }
    }
  }, [hourlySunMinutes, hourlyShadowMinutes]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const barCount = hourlySunMinutes.length;
    const barGroupWidth = (canvas.width - 20) / barCount;

    const barIndex = Math.floor((x - 10) / barGroupWidth);
    if (barIndex >= 0 && barIndex < barCount) {
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        text: `${START_HOUR + barIndex}时\n日照: ${hourlySunMinutes[barIndex]}分钟\n阴影: ${hourlyShadowMinutes[barIndex]}分钟`,
        visible: true,
      });
    } else {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={248}
        height={120}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
        style={{
          width: '100%',
          height: 120,
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 6,
        }}
      />
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            background: 'white',
            color: 'black',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'pre-line',
            zIndex: 2000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

function ShadowDiagram({
  shadowPoints,
  building,
}: {
  shadowPoints: Vector3[];
  building: { position: Vector3; width: number; depth: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width;
    const height = canvas.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(0, 0, width, height);

    const padding = 20;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const scale = Math.min(
      chartW / (building.width + 80),
      chartH / (building.depth + 80)
    );
    const centerX = width / 2;
    const centerY = height / 2;

    const offsetX = -building.position.x * scale;
    const offsetZ = -building.position.z * scale;

    if (shadowPoints.length >= 3) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(100, 180, 255, 0.5)';
      ctx.strokeStyle = 'rgba(100, 180, 255, 0.8)';
      ctx.lineWidth = 2;

      const firstPoint = shadowPoints[0];
      ctx.moveTo(
        centerX + offsetX + firstPoint.x * scale,
        centerY + offsetZ + firstPoint.z * scale
      );

      for (let i = 1; i < shadowPoints.length; i++) {
        ctx.lineTo(
          centerX + offsetX + shadowPoints[i].x * scale,
          centerY + offsetZ + shadowPoints[i].z * scale
        );
      }

      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#d4a373';
    ctx.fillRect(
      centerX + offsetX - (building.width / 2) * scale,
      centerY + offsetZ - (building.depth / 2) * scale,
      building.width * scale,
      building.depth * scale
    );
  }, [shadowPoints, building]);

  return (
    <canvas
      ref={canvasRef}
      width={248}
      height={150}
      style={{
        width: '100%',
        height: 150,
        borderRadius: 6,
      }}
    />
  );
}
