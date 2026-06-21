import { useEffect, useRef, useState, useCallback } from 'react';
import type { PlayerState, WeaponType, WeaponQuality, MaterialType, ForgeStage } from '../types';
import { canForgeDragonbone, MATERIAL_NAMES, MATERIAL_ICONS, getWeaponName } from '../utils/storage';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Props {
  playerState: PlayerState;
  onForgeComplete: (type: WeaponType, quality: WeaponQuality, strokes: number) => void;
  onHammer: () => void;
  onUseMaterial: (materials: Partial<Record<MaterialType, number>>) => void;
}

const WEAPON_OPTIONS: WeaponType[] = ['sword', 'shield', 'helmet'];
const WEAPON_ICONS: Record<WeaponType, string> = {
  sword: '⚔️',
  shield: '🛡️',
  helmet: '⛑️',
  dragonbone_sword: '🗡️'
};

export default function ForgeCanvas({ playerState, onForgeComplete, onHammer, onUseMaterial }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [stage, setStage] = useState<ForgeStage>('idle');
  const [heatProgress, setHeatProgress] = useState(0);
  const [hammerStrokes, setHammerStrokes] = useState(0);
  const [coolProgress, setCoolProgress] = useState(0);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('sword');
  const [hammerPower, setHammerPower] = useState(0);
  const [isPowerCharging, setIsPowerCharging] = useState(false);
  const [timingScore, setTimingScore] = useState(100);
  const [showTimingBar, setShowTimingBar] = useState(false);
  const [timingPos, setTimingPos] = useState(0);

  const addParticles = useCallback((x: number, y: number, count: number, color: string) => {
    const particles = particlesRef.current;
    for (let i = 0; i < count; i++) {
      if (particles.length >= 30) particles.shift();
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
        life: 0,
        maxLife: 400 + Math.random() * 400,
        size: 2 + Math.random() * 3,
        color
      });
    }
  }, []);

  const playSound = useCallback((type: 'hammer' | 'heat' | 'cool' | 'success') => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'hammer') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'heat') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'cool') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {
      // ignore audio errors
    }
  }, []);

  const startHeating = useCallback(() => {
    const needIron = 1;
    const needCharcoal = 1;
    const needLeather = selectedWeapon === 'dragonbone_sword' ? 1 : (selectedWeapon === 'helmet' ? 1 : 0);

    if (playerState.materials.iron_ingot < needIron || playerState.materials.charcoal < needCharcoal || playerState.materials.leather < needLeather) {
      return;
    }

    const used: Partial<Record<MaterialType, number>> = { iron_ingot: needIron, charcoal: needCharcoal };
    if (needLeather) used.leather = needLeather;
    onUseMaterial(used);

    setStage('heating');
    setHeatProgress(0);
    playSound('heat');
  }, [playerState.materials, selectedWeapon, onUseMaterial, playSound]);

  useEffect(() => {
    if (stage === 'heating') {
      const interval = setInterval(() => {
        setHeatProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStage('heating_done');
            return 100;
          }
          return prev + 4;
        });
      }, 80);
      return () => clearInterval(interval);
    }
  }, [stage]);

  const startHammering = useCallback(() => {
    setStage('hammering');
    setHammerStrokes(0);
    setTimingScore(100);
  }, []);

  const startPowerCharge = useCallback(() => {
    if (stage !== 'hammering') return;
    setIsPowerCharging(true);
    setShowTimingBar(true);
  }, [stage]);

  useEffect(() => {
    if (!isPowerCharging) return;
    const interval = setInterval(() => {
      setHammerPower(prev => {
        const next = prev + 3;
        if (next >= 100) return 0;
        return next;
      });
      setTimingPos(prev => (prev + 2) % 100);
    }, 20);
    return () => clearInterval(interval);
  }, [isPowerCharging]);

  const doHammer = useCallback(() => {
    if (!isPowerCharging || stage !== 'hammering') return;
    setIsPowerCharging(false);

    const power = hammerPower;
    const timing = timingPos;
    const powerScore = 100 - Math.abs(power - 70);
    const timingCenter = Math.abs(timing - 50);
    const timingHit = timingCenter < 15 ? 100 : (timingCenter < 30 ? 60 : 20);
    const strokeQuality = (powerScore + timingHit) / 2;

    setTimingScore(prev => (prev * hammerStrokes + strokeQuality) / (hammerStrokes + 1));

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const anvilX = canvas.width * 0.5 * scaleX;
      const anvilY = canvas.height * 0.55 * scaleY;
      addParticles(anvilX, anvilY, 8, '#ff6b35');
      addParticles(anvilX + 10, anvilY - 5, 5, '#ffd700');
    }

    playSound('hammer');
    onHammer();

    const newStrokes = hammerStrokes + 1;
    setHammerStrokes(newStrokes);
    setShowTimingBar(false);

    if (newStrokes >= 5) {
      setTimeout(() => {
        setStage('cooling');
        setCoolProgress(0);
        playSound('cool');
      }, 300);
    }
  }, [isPowerCharging, stage, hammerPower, timingPos, hammerStrokes, addParticles, playSound, onHammer]);

  useEffect(() => {
    if (stage === 'cooling') {
      const interval = setInterval(() => {
        setCoolProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            const finalScore = timingScore * (hammerStrokes >= 5 ? 1 : 0.8);
            let quality: WeaponQuality;
            if (finalScore >= 75) quality = 'high';
            else if (finalScore >= 45) quality = 'medium';
            else quality = 'low';

            playSound('success');
            onForgeComplete(selectedWeapon, quality, hammerStrokes);
            setStage('done');
            setTimeout(() => {
              setStage('idle');
              setHeatProgress(0);
              setHammerStrokes(0);
              setCoolProgress(0);
            }, 1000);
            return 100;
          }
          return prev + 5;
        });
      }, 80);
      return () => clearInterval(interval);
    }
  }, [stage, timingScore, hammerStrokes, selectedWeapon, onForgeComplete, playSound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (time: number) => {
      const dt = Math.min(50, time - lastTimeRef.current);
      lastTimeRef.current = time;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#8b6f47');
      bgGrad.addColorStop(0.6, '#5c4033');
      bgGrad.addColorStop(1, '#3e2723');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.05 + i * 0.02})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.55 + i * 20);
        ctx.lineTo(w, h * 0.55 + i * 20 + 5);
        ctx.stroke();
      }

      const furnaceX = w * 0.18;
      const furnaceY = h * 0.45;
      const furnaceW = w * 0.18;
      const furnaceH = h * 0.35;

      ctx.fillStyle = '#4a3728';
      ctx.fillRect(furnaceX - furnaceW / 2, furnaceY, furnaceW, furnaceH);
      ctx.strokeStyle = '#2d1f15';
      ctx.lineWidth = 3;
      ctx.strokeRect(furnaceX - furnaceW / 2, furnaceY, furnaceW, furnaceH);

      const fireOpen = furnaceW * 0.5;
      const fireH = furnaceH * 0.35;
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(furnaceX - fireOpen / 2, furnaceY + furnaceH * 0.25, fireOpen, fireH);

      if (stage === 'heating' || stage === 'heating_done') {
        const heatIntensity = stage === 'heating_done' ? 1 : heatProgress / 100;
        for (let i = 0; i < 6; i++) {
          const flicker = Math.sin(time / 100 + i) * 5;
          const flameGrad = ctx.createRadialGradient(
            furnaceX, furnaceY + furnaceH * 0.4, 0,
            furnaceX, furnaceY + furnaceH * 0.4, fireOpen * 0.6
          );
          flameGrad.addColorStop(0, `rgba(255, 220, 100, ${0.9 * heatIntensity})`);
          flameGrad.addColorStop(0.4, `rgba(255, 100, 30, ${0.8 * heatIntensity})`);
          flameGrad.addColorStop(1, 'rgba(200, 30, 0, 0)');
          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.ellipse(furnaceX + flicker, furnaceY + furnaceH * 0.42 + flicker / 2, fireOpen * 0.45, fireH * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if ((stage === 'heating' || stage === 'heating_done') && Math.random() < 0.3) {
          addParticles(furnaceX + (Math.random() - 0.5) * 30, furnaceY + furnaceH * 0.3, 1, '#ffaa33');
        }
      }

      ctx.fillStyle = '#b8860b';
      ctx.fillRect(furnaceX - furnaceW / 2 - 4, furnaceY - 8, furnaceW + 8, 10);
      ctx.fillStyle = '#5c4033';
      ctx.font = 'bold 14px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText('熔炉', furnaceX, furnaceY + furnaceH + 24);

      const anvilX = w * 0.5;
      const anvilY = h * 0.5;
      const anvilW = w * 0.25;
      const anvilH = h * 0.18;

      const anvilGrad = ctx.createLinearGradient(anvilX, anvilY - anvilH / 2, anvilX, anvilY + anvilH);
      anvilGrad.addColorStop(0, '#8899aa');
      anvilGrad.addColorStop(0.5, '#556677');
      anvilGrad.addColorStop(1, '#334455');
      ctx.fillStyle = anvilGrad;
      ctx.beginPath();
      ctx.moveTo(anvilX - anvilW / 2, anvilY + anvilH / 2);
      ctx.lineTo(anvilX - anvilW / 2 + 20, anvilY - anvilH / 2);
      ctx.lineTo(anvilX + anvilW / 2 - 20, anvilY - anvilH / 2);
      ctx.lineTo(anvilX + anvilW / 2, anvilY + anvilH / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#444';
      ctx.fillRect(anvilX - anvilW / 3, anvilY + anvilH / 2, anvilW * 2 / 3, anvilH * 0.3);

      if (stage === 'hammering' || stage === 'heating_done') {
        const hotColor = stage === 'hammering' ? `rgba(255, ${80 + Math.sin(time / 80) * 40}, 0, 0.9)` : 'rgba(255, 180, 50, 0.95)';
        ctx.fillStyle = hotColor;
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.ellipse(anvilX, anvilY - anvilH * 0.1, anvilW * 0.15, anvilH * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#5c4033';
      ctx.font = 'bold 14px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText('铁砧', anvilX, anvilY + anvilH + 30);

      const waterX = w * 0.82;
      const waterY = h * 0.55;
      const waterW = w * 0.16;
      const waterH = h * 0.22;

      ctx.fillStyle = '#5c4033';
      ctx.fillRect(waterX - waterW / 2, waterY, waterW, waterH);
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 3;
      ctx.strokeRect(waterX - waterW / 2, waterY, waterW, waterH);

      const waterLevel = waterH * 0.7;
      const waterGrad = ctx.createLinearGradient(waterX, waterY, waterX, waterY + waterLevel);
      if (stage === 'cooling') {
        const steam = Math.sin(time / 60) * 0.1 + 0.5;
        waterGrad.addColorStop(0, `rgba(100, 180, 255, ${0.7 + steam * 0.2})`);
        waterGrad.addColorStop(1, 'rgba(50, 120, 200, 0.9)');
        if (Math.random() < 0.4) {
          addParticles(waterX + (Math.random() - 0.5) * waterW * 0.6, waterY + 10, 1, '#aaddff');
        }
      } else {
        waterGrad.addColorStop(0, 'rgba(100, 180, 255, 0.7)');
        waterGrad.addColorStop(1, 'rgba(50, 120, 200, 0.85)');
      }
      ctx.fillStyle = waterGrad;
      ctx.fillRect(waterX - waterW / 2 + 4, waterY + 4, waterW - 8, waterLevel);

      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const waveY = waterY + 8 + i * 6 + Math.sin(time / 200 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(waterX - waterW / 2 + 8, waveY);
        ctx.quadraticCurveTo(waterX, waveY - 2, waterX + waterW / 2 - 8, waveY);
        ctx.stroke();
      }

      ctx.fillStyle = '#5c4033';
      ctx.font = 'bold 14px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText('冷却水槽', waterX, waterY + waterH + 24);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        p.vy += 0.15;
        p.x += p.vx;
        p.y += p.vy;
        const alpha = 1 - p.life / p.maxLife;
        if (alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [stage, heatProgress, addParticles]);

  const hasEnoughMats = (type: WeaponType) => {
    const needIron = 1;
    const needCharcoal = 1;
    const needLeather = type === 'dragonbone_sword' ? 1 : (type === 'helmet' ? 1 : 0);
    return playerState.materials.iron_ingot >= needIron &&
      playerState.materials.charcoal >= needCharcoal &&
      playerState.materials.leather >= needLeather;
  };

  const showDragonbone = canForgeDragonbone(playerState.level);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        minHeight: 0,
        cursor: stage === 'hammering' ? 'crosshair' : 'default',
        background: '#3e2723'
      }}
      onMouseUp={doHammer}
      onMouseLeave={() => {
        if (isPowerCharging) {
          setIsPowerCharging(false);
          setShowTimingBar(false);
        }
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(254, 252, 218, 0.95)',
        border: '2px solid #b8860b',
        borderRadius: 8,
        padding: 10,
        minWidth: 180
      }}>
        <div style={{ fontWeight: 700, color: '#5c4033', marginBottom: 8, fontSize: 13 }}>原材料库存</div>
        {(Object.keys(playerState.materials) as MaterialType[]).map(mat => (
          <div key={mat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
            <span>{MATERIAL_ICONS[mat]} {MATERIAL_NAMES[mat]}</span>
            <span style={{ fontWeight: 700, color: '#5c4033' }}>x{playerState.materials[mat]}</span>
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: 'rgba(254, 252, 218, 0.95)',
        border: '2px solid #b8860b',
        borderRadius: 8,
        padding: 10
      }}>
        <div style={{ fontWeight: 700, color: '#5c4033', marginBottom: 8, fontSize: 13 }}>选择锻造类型</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {WEAPON_OPTIONS.map(type => (
            <button
              key={type}
              onClick={() => stage === 'idle' && setSelectedWeapon(type)}
              disabled={stage !== 'idle'}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: selectedWeapon === type ? '2px solid #d69e2e' : '1px solid #5c4033',
                background: selectedWeapon === type ? '#fef3c7' : '#fffde8',
                color: '#5c4033',
                cursor: stage === 'idle' ? 'pointer' : 'not-allowed',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: hasEnoughMats(type) ? 1 : 0.5
              }}
            >
              <span style={{ fontSize: 16 }}>{WEAPON_ICONS[type]}</span>
              <span>{getWeaponName(type)}</span>
            </button>
          ))}
          {showDragonbone && (
            <button
              onClick={() => stage === 'idle' && setSelectedWeapon('dragonbone_sword')}
              disabled={stage !== 'idle'}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: selectedWeapon === 'dragonbone_sword' ? '2px solid #d69e2e' : '1px solid #d69e2e',
                background: selectedWeapon === 'dragonbone_sword' ? 'linear-gradient(135deg, #fef3c7, #f6e05e)' : '#fffde8',
                color: '#b8860b',
                cursor: stage === 'idle' ? 'pointer' : 'not-allowed',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: hasEnoughMats('dragonbone_sword') ? 1 : 0.5
              }}
            >
              <span style={{ fontSize: 16 }}>{WEAPON_ICONS.dragonbone_sword}</span>
              <span>龙骨剑 ⭐</span>
            </button>
          )}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(254, 252, 218, 0.95)',
        border: '2px solid #b8860b',
        borderRadius: 10,
        padding: '12px 20px',
        minWidth: 320,
        textAlign: 'center'
      }}>
        {stage === 'idle' && (
          <button
            className="btn btn-gold"
            onClick={startHeating}
            disabled={!hasEnoughMats(selectedWeapon)}
            style={{ fontSize: 14, padding: '10px 24px' }}
          >
            🔥 开始锻造 {getWeaponName(selectedWeapon)}
          </button>
        )}

        {stage === 'heating' && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#c05621', marginBottom: 8 }}>
              🔥 正在加热... {heatProgress}%
            </div>
            <div style={{
              width: '100%', height: 12, background: '#e2e8f0',
              borderRadius: 6, overflow: 'hidden', border: '1px solid #a0aec0'
            }}>
              <div style={{
                width: `${heatProgress}%`, height: '100%',
                background: 'linear-gradient(90deg, #f56565, #ed8936, #ecc94b)',
                transition: 'width 0.08s'
              }} />
            </div>
          </div>
        )}

        {stage === 'heating_done' && (
          <button className="btn btn-gold" onClick={startHammering} style={{ fontSize: 14, padding: '10px 24px' }}>
            ⚒️ 移到铁砧开始敲打
          </button>
        )}

        {stage === 'hammering' && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#5c4033', marginBottom: 6 }}>
              敲打次数: {hammerStrokes}/5 {showTimingBar && `- 按住鼠标蓄力，松开敲击!`}
            </div>
            {showTimingBar && (
              <>
                <div style={{
                  position: 'relative',
                  width: '100%', height: 16, background: '#e2e8f0',
                  borderRadius: 8, overflow: 'hidden', border: '1px solid #a0aec0',
                  marginBottom: 6
                }}>
                  <div style={{
                    position: 'absolute',
                    left: '35%', top: 0, width: '30%', height: '100%',
                    background: 'rgba(214, 158, 46, 0.3)',
                    borderLeft: '2px solid #d69e2e',
                    borderRight: '2px solid #d69e2e'
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: `${timingPos}%`, top: 0, width: 4, height: '100%',
                    background: '#c53030', transform: 'translateX(-50%)'
                  }} />
                </div>
                <div style={{
                  width: '100%', height: 10, background: '#e2e8f0',
                  borderRadius: 5, overflow: 'hidden', border: '1px solid #a0aec0'
                }}>
                  <div style={{
                    width: `${hammerPower}%`, height: '100%',
                    background: `linear-gradient(90deg, #48bb78, #ecc94b, #f56565)`,
                    transition: 'width 0.02s'
                  }} />
                </div>
              </>
            )}
            {!showTimingBar && (
              <button
                className="btn"
                onMouseDown={startPowerCharge}
                style={{ fontSize: 14, padding: '10px 24px' }}
              >
                🖱️ 按住鼠标蓄力敲打
              </button>
            )}
          </div>
        )}

        {stage === 'cooling' && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2b6cb0', marginBottom: 8 }}>
              💧 冷却中... {coolProgress}%
            </div>
            <div style={{
              width: '100%', height: 12, background: '#e2e8f0',
              borderRadius: 6, overflow: 'hidden', border: '1px solid #a0aec0'
            }}>
              <div style={{
                width: `${coolProgress}%`, height: '100%',
                background: 'linear-gradient(90deg, #4299e1, #63b3ed, #90cdf4)',
                transition: 'width 0.08s'
              }} />
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div style={{ fontSize: 16, fontWeight: 700, color: '#d69e2e' }}>
            ✨ 锻造完成!
          </div>
        )}
      </div>
    </div>
  );
}
