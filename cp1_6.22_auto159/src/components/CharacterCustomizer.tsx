import React, { useEffect, useRef, useState } from 'react';
import { CharacterAttributes } from '../game/GameEngine';

export interface CharacterAppearance {
  body: number;
  hair: number;
  top: number;
  bottom: number;
  shoes: number;
}

interface Props {
  appearance: CharacterAppearance;
  attributes: CharacterAttributes;
  onAppearanceChange: (appearance: CharacterAppearance) => void;
  onAttributesChange: (attributes: CharacterAttributes) => void;
  highlightedPart: keyof CharacterAppearance | null;
  onHighlightPart: (part: keyof CharacterAppearance | null) => void;
}

const PART_OPTIONS: Record<keyof CharacterAppearance, number> = {
  body: 4,
  hair: 5,
  top: 5,
  bottom: 4,
  shoes: 4,
};

const PART_LABELS: Record<keyof CharacterAppearance, string> = {
  body: '肤色',
  hair: '发型',
  top: '上衣',
  bottom: '下装',
  shoes: '鞋子',
};

const BODY_COLORS: string[] = ['#ffcc99', '#d4a373', '#8d5524', '#6f4e37'];
const HAIR_COLORS: string[] = ['#000000', '#8b4513', '#ffd700', '#ff0000', '#00ffff'];
const TOP_COLORS: string[] = ['#0066cc', '#ff3366', '#33cc33', '#ff9900', '#9900ff'];
const BOTTOM_COLORS: string[] = ['#333366', '#006666', '#660033', '#336600'];
const SHOE_COLORS: string[] = ['#ffffff', '#000000', '#ff0000', '#00ffff'];

const PRESET_ATTRIBUTES: Record<number, CharacterAttributes> = {
  0: { speed: 40, jump: 30, stamina: 30 },
  1: { speed: 30, jump: 45, stamina: 25 },
  2: { speed: 25, jump: 25, stamina: 50 },
  3: { speed: 50, jump: 25, stamina: 25 },
  4: { speed: 35, jump: 35, stamina: 30 },
};

const CharacterCustomizer: React.FC<Props> = ({
  appearance,
  attributes,
  onAppearanceChange,
  onAttributesChange,
  highlightedPart,
  onHighlightPart,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [animatingPart, setAnimatingPart] = useState<keyof CharacterAppearance | null>(null);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    renderPreview(ctx, appearance, highlightedPart, animatingPart);
  }, [appearance, highlightedPart, animatingPart]);

  const handlePartChange = (part: keyof CharacterAppearance, value: number) => {
    setAnimatingPart(part);
    setTimeout(() => setAnimatingPart(null), 300);

    const newAppearance = { ...appearance, [part]: value };
    onAppearanceChange(newAppearance);

    const presetIdx = Object.values(newAppearance).reduce((sum, v) => sum + v, 0) % 5;
    const preset = PRESET_ATTRIBUTES[presetIdx];
    if (JSON.stringify(preset) !== JSON.stringify(attributes)) {
      onAttributesChange(preset);
    }
  };

  const renderThumbnail = (
    ctx: CanvasRenderingContext2D,
    part: keyof CharacterAppearance,
    optionIndex: number
  ) => {
    ctx.clearRect(0, 0, 40, 40);
    const charAppearance: CharacterAppearance = {
      body: part === 'body' ? optionIndex : 0,
      hair: part === 'hair' ? optionIndex : 0,
      top: part === 'top' ? optionIndex : 0,
      bottom: part === 'bottom' ? optionIndex : 0,
      shoes: part === 'shoes' ? optionIndex : 0,
    };
    drawPixelCharacter(ctx, charAppearance, 8, 2, 24, 36);
  };

  return (
    <div className="side-panel customizer-panel">
      <div className="panel-title">角色自定义</div>

      <div className="preview-canvas-container">
        <canvas
          ref={previewCanvasRef}
          className="preview-canvas"
          width={320}
          height={200}
        />
      </div>

      {(Object.keys(PART_OPTIONS) as Array<keyof CharacterAppearance>).map((part) => (
        <div
          key={part}
          className="parts-section"
          onMouseEnter={() => onHighlightPart(part)}
          onMouseLeave={() => onHighlightPart(null)}
        >
          <div className="parts-label">{PART_LABELS[part]}</div>
          <div className="parts-list">
            {Array.from({ length: PART_OPTIONS[part] }).map((_, idx) => (
              <PartOption
                key={idx}
                part={part}
                optionIndex={idx}
                isActive={appearance[part] === idx}
                onClick={() => handlePartChange(part, idx)}
                renderThumbnail={renderThumbnail}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="stats-section">
        <div className="parts-label">角色属性</div>
        <StatBar label="速度" value={attributes.speed} type="speed" />
        <StatBar label="跳跃" value={attributes.jump} type="jump" />
        <StatBar label="耐力" value={attributes.stamina} type="stamina" />
      </div>
    </div>
  );
};

interface PartOptionProps {
  part: keyof CharacterAppearance;
  optionIndex: number;
  isActive: boolean;
  onClick: () => void;
  renderThumbnail: (ctx: CanvasRenderingContext2D, part: keyof CharacterAppearance, optionIndex: number) => void;
}

const PartOption: React.FC<PartOptionProps> = ({ part, optionIndex, isActive, onClick, renderThumbnail }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    renderThumbnail(ctx, part, optionIndex);
  }, [part, optionIndex, renderThumbnail]);

  return (
    <div
      className={`part-option ${isActive ? 'active' : ''}`}
      onClick={onClick}
      style={{ transition: 'all 0.3s ease' }}
    >
      <canvas ref={canvasRef} className="part-thumb" width={40} height={40} />
    </div>
  );
};

interface StatBarProps {
  label: string;
  value: number;
  type: 'speed' | 'jump' | 'stamina';
}

const StatBar: React.FC<StatBarProps> = ({ label, value, type }) => (
  <div className="stat-row">
    <span className="stat-label">{label}</span>
    <div className="stat-bar">
      <div
        className={`stat-fill ${type}`}
        style={{ width: `${value}%` }}
      />
    </div>
    <span className="stat-value">{value}</span>
  </div>
);

function renderPreview(
  ctx: CanvasRenderingContext2D,
  appearance: CharacterAppearance,
  highlightedPart: keyof CharacterAppearance | null,
  animatingPart: keyof CharacterAppearance | null
) {
  const w = 320;
  const h = 200;

  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#0a0a23');
  gradient.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const charW = 64;
  const charH = 96;
  const charX = (w - charW) / 2;
  const charY = (h - charH) / 2;

  if (highlightedPart) {
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(charX - 4, charY - 4, charW + 8, charH + 8);
    ctx.restore();
  }

  const scale = animatingPart ? 1 + Math.sin(Date.now() / 50) * 0.02 : 1;
  const centerX = charX + charW / 2;
  const centerY = charY + charH / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);

  drawPixelCharacter(ctx, appearance, charX, charY, charW, charH, highlightedPart);

  ctx.restore();
}

function drawPixelCharacter(
  ctx: CanvasRenderingContext2D,
  appearance: CharacterAppearance,
  x: number,
  y: number,
  w: number,
  h: number,
  highlightPart: keyof CharacterAppearance | null = null
) {
  const bodyColor = BODY_COLORS[appearance.body % BODY_COLORS.length];
  const hairColor = HAIR_COLORS[appearance.hair % HAIR_COLORS.length];
  const topColor = TOP_COLORS[appearance.top % TOP_COLORS.length];
  const bottomColor = BOTTOM_COLORS[appearance.bottom % BOTTOM_COLORS.length];
  const shoeColor = SHOE_COLORS[appearance.shoes % SHOE_COLORS.length];

  const scale = w / 24;

  const px = (val: number) => Math.floor(x + val * scale);
  const py = (val: number) => Math.floor(y + val * scale);
  const pxs = (val: number) => Math.max(1, Math.floor(val * scale));

  const drawHighlighted = (
    color: string,
    px_: number,
    py_: number,
    pw: number,
    ph: number,
    isHighlighted: boolean
  ) => {
    if (isHighlighted) {
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = color;
    ctx.fillRect(px_, py_, pw, ph);
    if (isHighlighted) {
      ctx.restore();
    }
  };

  const hl = (part: keyof CharacterAppearance) => highlightPart === part;

  const headSize = 8 * scale;
  const headX = px(8);
  const headY = py(0);

  drawHighlighted(hairColor, headX - pxs(1), headY, pxs(10), pxs(3), hl('hair'));
  drawHighlighted(hairColor, headX - pxs(2), py(1), pxs(1), pxs(3), hl('hair'));
  drawHighlighted(hairColor, px(16), py(1), pxs(1), pxs(3), hl('hair'));

  drawHighlighted(bodyColor, headX, py(3), pxs(8), pxs(5), hl('body'));

  ctx.fillStyle = '#000000';
  ctx.fillRect(px(10), py(5), pxs(1), pxs(1));
  ctx.fillRect(px(13), py(5), pxs(1), pxs(1));

  drawHighlighted(topColor, px(3), py(8), pxs(18), pxs(8), hl('top'));
  drawHighlighted(topColor, px(0), py(10), pxs(3), pxs(6), hl('top'));
  drawHighlighted(topColor, px(21), py(10), pxs(3), pxs(6), hl('top'));

  drawHighlighted(bottomColor, px(5), py(16), pxs(6), pxs(8), hl('bottom'));
  drawHighlighted(bottomColor, px(13), py(16), pxs(6), pxs(8), hl('bottom'));

  drawHighlighted(shoeColor, px(3), py(22), pxs(8), pxs(3), hl('shoes'));
  drawHighlighted(shoeColor, px(13), py(22), pxs(8), pxs(3), hl('shoes'));
}

export default CharacterCustomizer;
