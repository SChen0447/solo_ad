import { useRef, useEffect, useState, useCallback } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import {
  hexToHsl,
  hslToHex,
  hexToRgb,
  rgbToHex,
  isValidHex,
  normalizeHex,
} from '@/utils/colorUtils';

interface ColorPickerProps {
  compact?: boolean;
}

export function ColorPicker({ compact = false }: ColorPickerProps) {
  const hueCanvasRef = useRef<HTMLCanvasElement>(null);
  const slCanvasRef = useRef<HTMLCanvasElement>(null);
  const {
    editingColor,
    tempColors,
    setEditingColor,
    setTempColor,
  } = useThemeStore();

  const currentColor = tempColors[editingColor];
  const currentHsl = hexToHsl(currentColor) || { h: 0, s: 100, l: 50 };

  const [hexInput, setHexInput] = useState(currentColor);
  const [rgbInput, setRgbInput] = useState(() => {
    const rgb = hexToRgb(currentColor);
    return rgb ? { r: rgb.r, g: rgb.g, b: rgb.b } : { r: 59, g: 130, b: 246 };
  });

  useEffect(() => {
    setHexInput(currentColor);
    const rgb = hexToRgb(currentColor);
    if (rgb) {
      setRgbInput({ r: rgb.r, g: rgb.g, b: rgb.b });
    }
  }, [currentColor]);

  const drawHueWheel = useCallback(() => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 2;

    ctx.clearRect(0, 0, size, size);

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 0.5) * Math.PI) / 180;
      const endAngle = ((angle + 0.5) * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(center, center, radius - 20, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const indicatorAngle = (currentHsl.h * Math.PI) / 180;
    const indicatorX = center + Math.cos(indicatorAngle) * (radius - 10);
    const indicatorY = center + Math.sin(indicatorAngle) * (radius - 10);

    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 8, 0, Math.PI * 2);
    ctx.fillStyle = hslToHex(currentHsl.h, 100, 50);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }, [currentHsl.h]);

  const drawSLSquare = useCallback(() => {
    const canvas = slCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;

    const gradientH = ctx.createLinearGradient(0, 0, size, 0);
    gradientH.addColorStop(0, '#ffffff');
    gradientH.addColorStop(1, hslToHex(currentHsl.h, 100, 50));
    ctx.fillStyle = gradientH;
    ctx.fillRect(0, 0, size, size);

    const gradientV = ctx.createLinearGradient(0, 0, 0, size);
    gradientV.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradientV.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = gradientV;
    ctx.fillRect(0, 0, size, size);

    const indicatorX = (currentHsl.s / 100) * size;
    const indicatorY = size - (currentHsl.l / 100) * size;

    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 6, 0, Math.PI * 2);
    ctx.fillStyle = currentColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }, [currentHsl.h, currentHsl.s, currentHsl.l, currentColor]);

  useEffect(() => {
    drawHueWheel();
    drawSLSquare();
  }, [drawHueWheel, drawSLSquare]);

  const handleHueClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = hueCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      let angle = Math.atan2(y, x) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      const newHex = hslToHex(Math.round(angle), currentHsl.s, currentHsl.l);
      setTempColor(editingColor, newHex);
    },
    [editingColor, currentHsl.s, currentHsl.l, setTempColor]
  );

  const handleHueDrag = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.buttons === 1) {
        handleHueClick(e);
      }
    },
    [handleHueClick]
  );

  const handleSLClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = slCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      const s = Math.round((x / rect.width) * 100);
      const l = Math.round((1 - y / rect.height) * 100);

      const newHex = hslToHex(currentHsl.h, s, l);
      setTempColor(editingColor, newHex);
    },
    [editingColor, currentHsl.h, setTempColor]
  );

  const handleSLDrag = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.buttons === 1) {
        handleSLClick(e);
      }
    },
    [handleSLClick]
  );

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexInput(value);

    if (isValidHex(value)) {
      const normalized = normalizeHex(value);
      setTempColor(editingColor, normalized);
    }
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: string) => {
    const numValue = Math.max(0, Math.min(255, parseInt(value) || 0));
    const newRgb = { ...rgbInput, [channel]: numValue };
    setRgbInput(newRgb);

    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setTempColor(editingColor, newHex);
  };

  const colorTypes: Array<{
    key: 'primary' | 'secondary' | 'background';
    label: string;
  }> = [
    { key: 'primary', label: '主色' },
    { key: 'secondary', label: '辅色' },
    { key: 'background', label: '背景色' },
  ];

  if (compact) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex gap-2">
          {colorTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => setEditingColor(type.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                editingColor === type.key
                  ? 'ring-2 ring-offset-2'
                  : 'hover:opacity-90'
              }`}
              style={{
                backgroundColor: tempColors[type.key],
                color:
                  type.key === 'background'
                    ? tempColors.text || '#000'
                    : '#ffffff',
                ringColor: tempColors.primary,
              }}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <canvas
            ref={hueCanvasRef}
            width={160}
            height={160}
            className="rounded-full cursor-crosshair"
            onClick={handleHueClick}
            onMouseMove={handleHueDrag}
          />
          <canvas
            ref={slCanvasRef}
            width={160}
            height={160}
            className="rounded-lg cursor-crosshair"
            onClick={handleSLClick}
            onMouseMove={handleSLDrag}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 w-16">
              十六进制
            </span>
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#000000"
            />
            <div
              className="w-10 h-10 rounded-lg border border-gray-300"
              style={{ backgroundColor: currentColor }}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 w-16">RGB</span>
            <div className="flex-1 flex gap-2">
              {(['r', 'g', 'b'] as const).map((channel) => (
                <input
                  key={channel}
                  type="number"
                  min="0"
                  max="255"
                  value={rgbInput[channel]}
                  onChange={(e) => handleRgbChange(channel, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">颜色选择器</h3>

      <div className="flex gap-3 mb-6">
        {colorTypes.map((type) => (
          <button
            key={type.key}
            onClick={() => setEditingColor(type.key)}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all btn-bounce btn-hover ${
              editingColor === type.key
                ? 'ring-2 ring-offset-2'
                : 'hover:opacity-90'
            }`}
            style={{
              backgroundColor: tempColors[type.key],
              color:
                type.key === 'background'
                  ? currentHsl.l > 50
                    ? '#000000'
                    : '#ffffff'
                  : '#ffffff',
              ringColor: tempColors.primary,
            }}
          >
            {type.label}
            <div className="text-xs opacity-80 mt-1 font-mono">
              {tempColors[type.key]}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-6 justify-center mb-6">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2 font-medium">色相</p>
          <canvas
            ref={hueCanvasRef}
            width={200}
            height={200}
            className="rounded-full cursor-crosshair shadow-md"
            onClick={handleHueClick}
            onMouseMove={handleHueDrag}
          />
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2 font-medium">
            饱和度 / 明度
          </p>
          <canvas
            ref={slCanvasRef}
            width={200}
            height={200}
            className="rounded-xl cursor-crosshair shadow-md border border-gray-200"
            onClick={handleSLClick}
            onMouseMove={handleSLDrag}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 w-20">
            十六进制
          </label>
          <div className="flex-1 flex items-center gap-3">
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="#000000"
            />
            <div
              className="w-12 h-12 rounded-xl border-2 border-gray-200 shadow-inner"
              style={{ backgroundColor: currentColor }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 w-20">RGB</label>
          <div className="flex-1 flex gap-2">
            {(['r', 'g', 'b'] as const).map((channel, index) => (
              <div key={channel} className="flex-1">
                <div className="text-xs text-gray-400 mb-1 text-center">
                  {channel.toUpperCase()}
                </div>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgbInput[channel]}
                  onChange={(e) => handleRgbChange(channel, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <label className="text-sm font-medium text-gray-700 w-20">HSL</label>
          <div className="flex-1 flex gap-2 text-sm text-gray-600 font-mono bg-gray-50 px-4 py-2.5 rounded-xl">
            <span>H: {currentHsl.h}°</span>
            <span>S: {currentHsl.s}%</span>
            <span>L: {currentHsl.l}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
