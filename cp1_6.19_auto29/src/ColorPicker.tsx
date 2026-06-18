import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGradientStore, hexToHsl, hslToHex } from './state';

interface ColorPickerProps {
  visible: boolean;
}

const HUE_RADIUS = 60;
const HUE_THICKNESS = 12;
const SAT_LIGHT_SIZE = 150;

export const ColorPicker: React.FC<ColorPickerProps> = ({ visible }) => {
  const hueCanvasRef = useRef<HTMLCanvasElement>(null);
  const satLightCanvasRef = useRef<HTMLCanvasElement>(null);
  const hueDraggingRef = useRef(false);
  const satLightDraggingRef = useRef(false);

  const selectedStopId = useGradientStore((s) => s.config.selectedStopId);
  const stops = useGradientStore((s) => s.config.stops);
  const updateStopColor = useGradientStore((s) => s.updateStopColor);

  const selectedStop = stops.find((s) => s.id === selectedStopId);

  const [hsl, setHsl] = useState({ h: 0, s: 100, l: 50 });

  useEffect(() => {
    if (selectedStop) {
      const hslVal = hexToHsl(selectedStop.color);
      setHsl(hslVal);
    }
  }, [selectedStop?.id, selectedStop?.color]);

  const drawHueRing = useCallback(() => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = (HUE_RADIUS + HUE_THICKNESS / 2) * 2;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 0.5) * Math.PI) / 180 - Math.PI / 2;
      const endAngle = ((angle + 0.5) * Math.PI) / 180 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, HUE_RADIUS + HUE_THICKNESS / 2, startAngle, endAngle);
      ctx.arc(centerX, centerY, HUE_RADIUS - HUE_THICKNESS / 2, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }
  }, []);

  const drawSatLight = useCallback(() => {
    const canvas = satLightCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = SAT_LIGHT_SIZE;
    canvas.height = SAT_LIGHT_SIZE;

    const hue = hsl.h;

    const whiteGrad = ctx.createLinearGradient(0, 0, SAT_LIGHT_SIZE, 0);
    whiteGrad.addColorStop(0, '#ffffff');
    whiteGrad.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, SAT_LIGHT_SIZE, SAT_LIGHT_SIZE);

    const blackGrad = ctx.createLinearGradient(0, 0, 0, SAT_LIGHT_SIZE);
    blackGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    blackGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, SAT_LIGHT_SIZE, SAT_LIGHT_SIZE);
  }, [hsl.h]);

  useEffect(() => {
    drawHueRing();
  }, [drawHueRing]);

  useEffect(() => {
    drawSatLight();
  }, [drawSatLight]);

  const getHueFromEvent = (e: React.PointerEvent | PointerEvent): number => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return angle;
  };

  const getSatLightFromEvent = (e: React.PointerEvent | PointerEvent): { s: number; l: number } => {
    const canvas = satLightCanvasRef.current;
    if (!canvas) return { s: 100, l: 50 };
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    x = Math.max(0, Math.min(SAT_LIGHT_SIZE, x));
    y = Math.max(0, Math.min(SAT_LIGHT_SIZE, y));
    const s = (x / SAT_LIGHT_SIZE) * 100;
    const l = (1 - y / SAT_LIGHT_SIZE) * 100;
    return { s, l };
  };

  const handleHueDown = (e: React.PointerEvent) => {
    if (!selectedStopId) return;
    hueDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const hue = getHueFromEvent(e);
    const newColor = hslToHex(hue, hsl.s, hsl.l);
    setHsl((prev) => ({ ...prev, h: hue }));
    updateStopColor(selectedStopId, newColor);
  };

  const handleHueMove = (e: React.PointerEvent) => {
    if (!hueDraggingRef.current || !selectedStopId) return;
    const hue = getHueFromEvent(e);
    const newColor = hslToHex(hue, hsl.s, hsl.l);
    setHsl((prev) => ({ ...prev, h: hue }));
    updateStopColor(selectedStopId, newColor);
  };

  const handleHueUp = (e: React.PointerEvent) => {
    hueDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const handleSatLightDown = (e: React.PointerEvent) => {
    if (!selectedStopId) return;
    satLightDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { s, l } = getSatLightFromEvent(e);
    const newColor = hslToHex(hsl.h, s, l);
    setHsl((prev) => ({ ...prev, s, l }));
    updateStopColor(selectedStopId, newColor);
  };

  const handleSatLightMove = (e: React.PointerEvent) => {
    if (!satLightDraggingRef.current || !selectedStopId) return;
    const { s, l } = getSatLightFromEvent(e);
    const newColor = hslToHex(hsl.h, s, l);
    setHsl((prev) => ({ ...prev, s, l }));
    updateStopColor(selectedStopId, newColor);
  };

  const handleSatLightUp = (e: React.PointerEvent) => {
    satLightDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const hueAngle = hsl.h;
  const hueCenter = HUE_RADIUS + HUE_THICKNESS / 2;
  const hueSelectorX = hueCenter + HUE_RADIUS * Math.cos(((hueAngle - 90) * Math.PI) / 180);
  const hueSelectorY = hueCenter + HUE_RADIUS * Math.sin(((hueAngle - 90) * Math.PI) / 180);

  const satX = (hsl.s / 100) * SAT_LIGHT_SIZE;
  const satY = (1 - hsl.l / 100) * SAT_LIGHT_SIZE;

  if (!visible || !selectedStop) {
    return null;
  }

  return (
    <div className="color-picker">
      <div className="color-picker-title">颜色选择器</div>

      <div className="hue-ring-wrapper">
        <canvas
          ref={hueCanvasRef}
          className="hue-canvas"
          onPointerDown={handleHueDown}
          onPointerMove={handleHueMove}
          onPointerUp={handleHueUp}
          onPointerCancel={handleHueUp}
        />
        <div
          className="hue-selector"
          style={{
            left: hueSelectorX - 7,
            top: hueSelectorY - 7,
          }}
        />
      </div>

      <div className="sat-light-wrapper">
        <canvas
          ref={satLightCanvasRef}
          className="sat-light-canvas"
          onPointerDown={handleSatLightDown}
          onPointerMove={handleSatLightMove}
          onPointerUp={handleSatLightUp}
          onPointerCancel={handleSatLightUp}
        />
        <div
          className="sat-light-selector"
          style={{
            left: satX - 6,
            top: satY - 6,
            borderColor: hsl.l > 50 ? '#333' : '#fff',
          }}
        />
      </div>

      <div className="color-preview-row">
        <div
          className="color-preview"
          style={{ backgroundColor: selectedStop.color }}
        />
        <div className="color-hex">{selectedStop.color.toUpperCase()}</div>
      </div>
    </div>
  );
};
