import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../store';
import { CanvasRenderer } from './CanvasRenderer';
import Timeline from './Timeline';
import { FONT_FAMILIES, EASING_COLORS, EASING_LABELS, EasingType } from '../types';
import {
  FiType,
  FiPlay,
  FiPause,
  FiSquare,
  FiRepeat,
  FiDownload,
  FiSettings,
  FiChevronDown,
  FiChevronUp,
  FiMenu,
  FiX,
  FiFilm,
  FiImage
} from 'react-icons/fi';

const PANEL_WIDTH = 320;

const ColorPicker: React.FC<{
  value: string;
  onChange: (color: string) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <span style={{ fontSize: '13px', color: '#aaa', minWidth: 60 }}>
          {label}
        </span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: value,
            border: '2px solid #0f3460',
            cursor: 'pointer',
            padding: 0,
            transition: 'transform 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: '4px 8px',
            backgroundColor: '#1a1a2e',
            border: '1px solid #0f3460',
            borderRadius: 4,
            color: '#fff',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}
        />
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 70,
            zIndex: 100,
            padding: 10,
            backgroundColor: '#16213e',
            border: '1px solid #0f3460',
            borderRadius: 6,
            marginTop: 5
          }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: 200,
              height: 150,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: 'transparent'
            }}
          />
        </div>
      )}
    </div>
  );
};

const Slider: React.FC<{
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  unit?: string;
}> = ({ value, min, max, step = 1, onChange, label, unit = '' }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 6,
          alignItems: 'center'
        }}
      >
        <span style={{ fontSize: '13px', color: '#aaa' }}>{label}</span>
        <span
          style={{
            fontSize: '12px',
            color: '#00b4d8',
            fontFamily: 'monospace'
          }}
        >
          {value}
          {unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 20 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            background: `linear-gradient(to right, #e94560 0%, #00b4d8 ${percentage}%, #1a1a2e ${percentage}%, #1a1a2e 100%)`,
            appearance: 'none',
            outline: 'none',
            cursor: 'pointer'
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: linear-gradient(135deg, #e94560, #00b4d8);
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            transition: transform 0.15s;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
          }
        `}</style>
      </div>
    </div>
  );
};

const CollapsibleCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        backgroundColor: '#16213e',
        borderRadius: 8,
        overflow: 'hidden',
        transition: 'all 0.3s ease-in-out'
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backgroundColor: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'background-color 0.2s'
        }}
      >
        {icon}
        <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
      </button>
      <div
        style={{
          maxHeight: isOpen ? '1000px' : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-in-out'
        }}
      >
        <div
          style={{
            padding: '0 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const Editor: React.FC = () => {
  const {
    textStyle,
    playback,
    setTextStyle,
    setPlaying,
    setCurrentTime,
    setLoop,
    setSpeed,
    setTotalDuration,
    getInterpolatedValues,
    isExporting,
    exportProgress,
    setExporting,
    setExportProgress,
    keyframes
  } = useEditorStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [fps, setFps] = useState(60);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'apng' | 'webm'>('webm');

  const isMobile = windowWidth < 900;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new CanvasRenderer(canvasRef.current, (currentFps) => {
      setFps(currentFps);
    });
    rendererRef.current = renderer;
    renderer.setTextStyle(textStyle);
    renderer.setAnimatedValues(getInterpolatedValues(playback.currentTime));
    renderer.start();

    const updateSize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      rendererRef.current.resize(rect.width, rect.height);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      renderer.destroy();
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setTextStyle(textStyle);
    }
  }, [textStyle]);

  useEffect(() => {
    if (!playback.isPlaying) {
      if (rendererRef.current) {
        rendererRef.current.setAnimatedValues(
          getInterpolatedValues(playback.currentTime)
        );
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) * playback.speed;
      lastTimeRef.current = timestamp;

      let newTime = playback.currentTime + delta;
      const totalDuration = playback.totalDuration;

      if (newTime >= totalDuration) {
        if (playback.loop) {
          newTime = newTime % totalDuration;
        } else {
          newTime = totalDuration;
          setPlaying(false);
        }
      }

      setCurrentTime(newTime);

      if (rendererRef.current) {
        rendererRef.current.setAnimatedValues(getInterpolatedValues(newTime));
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    playback.isPlaying,
    playback.speed,
    playback.loop,
    playback.totalDuration,
    setPlaying,
    setCurrentTime,
    getInterpolatedValues
  ]);

  const handlePlayPause = () => {
    if (playback.currentTime >= playback.totalDuration) {
      setCurrentTime(0);
    }
    setPlaying(!playback.isPlaying);
  };

  const handleStop = () => {
    setPlaying(false);
    setCurrentTime(0);
    if (rendererRef.current) {
      rendererRef.current.setAnimatedValues(getInterpolatedValues(0));
    }
  };

  const handleExport = useCallback(async () => {
    if (!rendererRef.current) return;

    setExporting(true);
    setExportProgress(0);

    const canvas = rendererRef.current.getCanvas();
    const duration = playback.totalDuration;
    const fps = 30;
    const totalFrames = Math.floor((duration / 1000) * fps);
    const frameInterval = 1000 / fps;

    if (exportFormat === 'webm') {
      try {
        const stream = canvas.captureStream(fps);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9'
        });
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'text-animation.webm';
          a.click();
          URL.revokeObjectURL(url);
          setExporting(false);
          setShowExportModal(false);
        };

        mediaRecorder.start();

        let frame = 0;
        const renderFrame = () => {
          const time = frame * frameInterval;
          if (time <= duration) {
            const values = getInterpolatedValues(time);
            if (rendererRef.current) {
              rendererRef.current.setAnimatedValues(values);
              rendererRef.current.renderFrame();
            }
            setExportProgress(Math.min(100, (frame / totalFrames) * 100));
            frame++;
            setTimeout(renderFrame, 1000 / fps);
          } else {
            setTimeout(() => {
              mediaRecorder.stop();
            }, 500);
          }
        };

        renderFrame();
      } catch (error) {
        console.error('Export failed:', error);
        setExporting(false);
      }
    } else {
      const frames: ImageData[] = [];
      const ctx = canvas.getContext('2d')!;

      for (let i = 0; i <= totalFrames; i++) {
        const time = i * frameInterval;
        const values = getInterpolatedValues(time);
        if (rendererRef.current) {
          rendererRef.current.setAnimatedValues(values);
          rendererRef.current.renderFrame();
        }
        frames.push(
          ctx.getImageData(0, 0, canvas.width, canvas.height)
        );
        setExportProgress(Math.min(100, (i / totalFrames) * 100));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const width = canvas.width;
      const height = canvas.height;
      const pngSignature = new Uint8Array([
        137,
        80,
        78,
        71,
        13,
        10,
        26,
        10
      ]);

      const createChunk = (type: string, data: Uint8Array): Uint8Array => {
        const length = new Uint8Array(4);
        const typeBytes = new TextEncoder().encode(type);
        const crcData = new Uint8Array(typeBytes.length + data.length);
        crcData.set(typeBytes, 0);
        crcData.set(data, typeBytes.length);

        let crc = 0xffffffff;
        for (let i = 0; i < crcData.length; i++) {
          crc ^= crcData[i];
          for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
          }
        }
        crc ^= 0xffffffff;

        const lengthView = new DataView(length.buffer);
        lengthView.setUint32(0, data.length);

        const crcBytes = new Uint8Array(4);
        const crcView = new DataView(crcBytes.buffer);
        crcView.setUint32(0, crc >>> 0);

        const chunk = new Uint8Array(4 + typeBytes.length + data.length + 4);
        chunk.set(length, 0);
        chunk.set(typeBytes, 4);
        chunk.set(data, 4 + typeBytes.length);
        chunk.set(crcBytes, 4 + typeBytes.length + data.length);

        return chunk;
      };

      const createIhdr = (): Uint8Array => {
        const data = new Uint8Array(13);
        const view = new DataView(data.buffer);
        view.setUint32(0, width);
        view.setUint32(4, height);
        data[8] = 8;
        data[9] = 6;
        data[10] = 0;
        data[11] = 0;
        data[12] = 0;
        return createChunk('IHDR', data);
      };

      const createActl = (numFrames: number): Uint8Array => {
        const data = new Uint8Array(8);
        const view = new DataView(data.buffer);
        view.setUint32(0, numFrames);
        view.setUint32(4, 0);
        return createChunk('acTL', data);
      };

      const createFctl = (
        sequenceNumber: number,
        delayNum: number,
        delayDen: number
      ): Uint8Array => {
        const data = new Uint8Array(26);
        const view = new DataView(data.buffer);
        view.setUint32(0, sequenceNumber);
        view.setUint32(4, width);
        view.setUint32(8, height);
        view.setUint32(12, 0);
        view.setUint32(16, 0);
        view.setUint16(20, delayNum);
        view.setUint16(22, delayDen);
        data[24] = 1;
        data[25] = 0;
        return createChunk('fcTL', data);
      };

      const canvasToPngData = (imageData: ImageData): Uint8Array => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(imageData, 0, 0);

        const dataUrl = tempCanvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      };

      const pngData = canvasToPngData(frames[0]);
      let idatStart = 8 + 8 + 13 + 12;
      let idatData: Uint8Array | null = null;

      for (let i = 8; i < pngData.length - 4; ) {
        const length = new DataView(pngData.buffer, i, 4).getUint32(0);
        const type = String.fromCharCode(...pngData.slice(i + 4, i + 8));
        if (type === 'IDAT') {
          idatData = pngData.slice(i + 8, i + 8 + length);
          break;
        }
        i += 12 + length;
      }

      const apngParts: Uint8Array[] = [];
      apngParts.push(pngSignature);
      apngParts.push(createIhdr());
      apngParts.push(createActl(frames.length));

      let seqNum = 0;
      for (let i = 0; i < frames.length; i++) {
        const framePngData = canvasToPngData(frames[i]);

        let frameIdat: Uint8Array | null = null;
        for (let j = 8; j < framePngData.length - 4; ) {
          const length = new DataView(framePngData.buffer, j, 4).getUint32(0);
          const type = String.fromCharCode(
            ...framePngData.slice(j + 4, j + 8)
          );
          if (type === 'IDAT') {
            frameIdat = framePngData.slice(j + 8, j + 8 + length);
            break;
          }
          j += 12 + length;
        }

        if (!frameIdat) continue;

        apngParts.push(createFctl(seqNum++, Math.round(frameInterval), 1000));

        const fdatData = new Uint8Array(4 + frameIdat.length);
        const fdatView = new DataView(fdatData.buffer);
        fdatView.setUint32(0, seqNum++);
        fdatData.set(frameIdat, 4);
        apngParts.push(createChunk('fdAT', fdatData));
      }

      apngParts.push(createChunk('IEND', new Uint8Array(0)));

      const totalLength = apngParts.reduce((sum, p) => sum + p.length, 0);
      const apngBlob = new Blob(apngParts, { type: 'image/apng' });

      const url = URL.createObjectURL(apngBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'text-animation.png';
      a.click();
      URL.revokeObjectURL(url);

      setExporting(false);
      setShowExportModal(false);
    }
  }, [
    exportFormat,
    playback.totalDuration,
    getInterpolatedValues,
    setExporting,
    setExportProgress
  ]);

  const currentFrame = Math.floor(
    (playback.currentTime / playback.totalDuration) *
      (playback.totalDuration / 1000) * 60
  );
  const totalFrames = Math.floor((playback.totalDuration / 1000) * 60);

  const PanelContent = () => (
    <div
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: '100%',
        overflowY: 'auto'
      }}
    >
      <h2
        style={{
          fontSize: '18px',
          color: '#00b4d8',
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <FiType />
        文字动画编辑器
      </h2>

      <CollapsibleCard
        title="文字样式"
        icon={<FiType style={{ color: '#00b4d8' }} />}
        defaultOpen={true}
      >
        <div>
          <span style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: 6 }}>
            文字内容
          </span>
          <textarea
            value={textStyle.text}
            onChange={(e) =>
              setTextStyle({ text: e.target.value.slice(0, 100) })
            }
            maxLength={100}
            rows={2}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: '#1a1a2e',
              border: '1px solid #0f3460',
              borderRadius: 4,
              color: '#fff',
              fontSize: '13px',
              resize: 'none',
              fontFamily: 'inherit'
            }}
          />
          <div
            style={{
              textAlign: 'right',
              fontSize: '11px',
              color: '#666',
              marginTop: 4
            }}
          >
            {textStyle.text.length}/100
          </div>
        </div>

        <div>
          <span style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: 6 }}>
            字体
          </span>
          <select
            value={textStyle.fontFamily}
            onChange={(e) => setTextStyle({ fontFamily: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: '#1a1a2e',
              border: '1px solid #0f3460',
              borderRadius: 4,
              color: '#fff',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>

        <Slider
          label="字号"
          value={textStyle.fontSize}
          min={12}
          max={120}
          unit="px"
          onChange={(v) => setTextStyle({ fontSize: v })}
        />

        <ColorPicker
          label="填充色"
          value={textStyle.color}
          onChange={(v) => setTextStyle({ color: v })}
        />

        <Slider
          label="描边宽度"
          value={textStyle.strokeWidth}
          min={0}
          max={10}
          unit="px"
          onChange={(v) => setTextStyle({ strokeWidth: v })}
        />

        <ColorPicker
          label="描边色"
          value={textStyle.strokeColor}
          onChange={(v) => setTextStyle({ strokeColor: v })}
        />
      </CollapsibleCard>

      <CollapsibleCard
        title="动画设置"
        icon={<FiSettings style={{ color: '#e94560' }} />}
        defaultOpen={false}
      >
        <Slider
          label="总时长"
          value={playback.totalDuration / 1000}
          min={1}
          max={10}
          step={0.5}
          unit="s"
          onChange={(v) => setTotalDuration(v * 1000)}
        />

        <Slider
          label="播放速度"
          value={playback.speed}
          min={0.25}
          max={4}
          step={0.25}
          unit="x"
          onChange={(v) => setSpeed(v)}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 0'
          }}
        >
          <button
            onClick={() => setLoop(!playback.loop)}
            style={{
              padding: '6px 12px',
              backgroundColor: playback.loop ? '#00b4d8' : '#0f3460',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '12px',
              transition: 'background-color 0.2s'
            }}
          >
            <FiRepeat />
            {playback.loop ? '循环播放' : '单次播放'}
          </button>
        </div>

        <div
          style={{
            padding: '10px',
            backgroundColor: '#1a1a2e',
            borderRadius: 6,
            fontSize: '12px',
            color: '#888'
          }}
        >
          <div style={{ marginBottom: 6, fontWeight: 500, color: '#aaa' }}>
            缓动类型说明
          </div>
          {(Object.keys(EASING_COLORS) as EasingType[]).map((easing) => (
            <div
              key={easing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 4
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: EASING_COLORS[easing]
                }}
              />
              <span>{EASING_LABELS[easing]}</span>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="导出设置"
        icon={<FiDownload style={{ color: '#ffd700' }} />}
        defaultOpen={false}
      >
        <button
          onClick={() => setShowExportModal(true)}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'linear-gradient(135deg, #e94560, #00b4d8)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 2px 10px rgba(233, 69, 96, 0.3)'
          }}
        >
          <FiDownload />
          导出动画
        </button>
        <p style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
          支持 WebM 视频和 APNG 动图格式
        </p>
      </CollapsibleCard>

      <div
        style={{
          marginTop: 'auto',
          padding: '10px',
          backgroundColor: 'rgba(0, 180, 216, 0.1)',
          borderRadius: 6,
          fontSize: '11px',
          color: '#888',
          textAlign: 'center'
        }}
      >
        当前帧率: <span style={{ color: '#00b4d8' }}>{fps} FPS</span>
        <br />
        关键帧数: <span style={{ color: '#e94560' }}>{keyframes.length}</span>
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1a1a2e'
      }}
    >
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {!isMobile && (
          <div
            style={{
              width: PANEL_WIDTH,
              backgroundColor: '#16213e',
              borderRight: '1px solid #0f3460',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.3s ease-in-out'
            }}
          >
            <PanelContent />
          </div>
        )}

        {isMobile && drawerOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 100,
              transition: 'opacity 0.3s ease-in-out'
            }}
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {isMobile && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: drawerOpen ? 0 : -PANEL_WIDTH,
              width: PANEL_WIDTH,
              height: '100%',
              backgroundColor: '#16213e',
              zIndex: 101,
              transition: 'left 0.3s ease-in-out',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #0f3460'
              }}
            >
              <span style={{ color: '#00b4d8', fontWeight: 500 }}>设置面板</span>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                <FiX />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <PanelContent />
            </div>
          </div>
        )}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}
        >
          {isMobile && (
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: '#16213e',
                borderBottom: '1px solid #0f3460',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <button
                onClick={() => setDrawerOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                <FiMenu />
              </button>
              <span style={{ color: '#00b4d8', fontWeight: 500 }}>
                文字动画编辑器
              </span>
            </div>
          )}

          <div
            ref={containerRef}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                width: '100%',
                height: '100%'
              }}
            />

            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                padding: '6px 12px',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                borderRadius: 4,
                fontSize: '12px',
                color: '#aaa',
                fontFamily: 'monospace'
              }}
            >
              帧 {currentFrame} / {totalFrames}
            </div>
          </div>

          <div
            style={{
              height: 50,
              backgroundColor: '#16213e',
              borderTop: '1px solid #0f3460',
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              gap: 16
            }}
          >
            <button
              onClick={handlePlayPause}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#e94560',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 2px 8px rgba(233, 69, 96, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {playback.isPlaying ? <FiPause /> : <FiPlay />}
            </button>

            <button
              onClick={handleStop}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#0f3460',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <FiSquare />
            </button>

            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  color: '#888',
                  fontFamily: 'monospace',
                  minWidth: 80
                }}
              >
                {playback.currentTime.toFixed(0)}ms
              </span>
              <input
                type="range"
                min={0}
                max={playback.totalDuration}
                value={playback.currentTime}
                onChange={(e) => setCurrentTime(Number(e.target.value))}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  appearance: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  background: `linear-gradient(to right, #e94560 ${
                    (playback.currentTime / playback.totalDuration) * 100
                  }%, #1a1a2e ${
                    (playback.currentTime / playback.totalDuration) * 100
                  }%)`
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  color: '#888',
                  fontFamily: 'monospace',
                  minWidth: 60
                }}
              >
                {playback.totalDuration}ms
              </span>
            </div>

            <button
              onClick={() => setLoop(!playback.loop)}
              style={{
                padding: '6px 12px',
                backgroundColor: playback.loop ? '#00b4d8' : '#0f3460',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '12px',
                transition: 'background-color 0.2s'
              }}
            >
              <FiRepeat />
              {playback.loop ? '循环' : '单次'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '12px', color: '#888' }}>
                {playback.speed}x
              </span>
              <input
                type="range"
                min={0.25}
                max={4}
                step={0.25}
                value={playback.speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                style={{
                  width: 80,
                  height: 4,
                  borderRadius: 2,
                  appearance: 'none',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>

            <button
              onClick={() => setShowExportModal(true)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #e94560, #00b4d8)',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '13px',
                fontWeight: 500,
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <FiDownload />
              导出
            </button>
          </div>
        </div>
      </div>

      <Timeline />

      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => !isExporting && setShowExportModal(false)}
        >
          <div
            style={{
              backgroundColor: '#16213e',
              borderRadius: 12,
              padding: 30,
              minWidth: 360,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                color: '#00b4d8',
                marginBottom: 20,
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <FiDownload />
              导出动画
            </h3>

            {!isExporting ? (
              <>
                <p style={{ color: '#aaa', marginBottom: 16, fontSize: '13px' }}>
                  选择导出格式：
                </p>

                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  <button
                    onClick={() => setExportFormat('webm')}
                    style={{
                      flex: 1,
                      padding: '20px 16px',
                      backgroundColor:
                        exportFormat === 'webm' ? '#0f3460' : '#1a1a2e',
                      border:
                        exportFormat === 'webm'
                          ? '2px solid #00b4d8'
                          : '2px solid transparent',
                      borderRadius: 8,
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.2s'
                    }}
                  >
                    <FiFilm
                      style={{
                        fontSize: '32px',
                        color: exportFormat === 'webm' ? '#00b4d8' : '#666'
                      }}
                    />
                    <span style={{ fontWeight: 500 }}>WebM 视频</span>
                    <span style={{ fontSize: '11px', color: '#666' }}>
                      高质量，文件较小
                    </span>
                  </button>

                  <button
                    onClick={() => setExportFormat('apng')}
                    style={{
                      flex: 1,
                      padding: '20px 16px',
                      backgroundColor:
                        exportFormat === 'apng' ? '#0f3460' : '#1a1a2e',
                      border:
                        exportFormat === 'apng'
                          ? '2px solid #e94560'
                          : '2px solid transparent',
                      borderRadius: 8,
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.2s'
                    }}
                  >
                    <FiImage
                      style={{
                        fontSize: '32px',
                        color: exportFormat === 'apng' ? '#e94560' : '#666'
                      }}
                    />
                    <span style={{ fontWeight: 500 }}>APNG 动图</span>
                    <span style={{ fontSize: '11px', color: '#666' }}>
                      图片格式，兼容性好
                    </span>
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12
                  }}
                >
                  <button
                    onClick={() => setShowExportModal(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#0f3460',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleExport}
                    style={{
                      padding: '10px 24px',
                      background: 'linear-gradient(135deg, #e94560, #00b4d8)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  >
                    开始导出
                  </button>
                </div>
              </>
            ) : (
              <div>
                <p style={{ color: '#aaa', marginBottom: 12, fontSize: '13px' }}>
                  正在导出...
                </p>
                <div
                  style={{
                    height: 8,
                    backgroundColor: '#1a1a2e',
                    borderRadius: 4,
                    overflow: 'hidden',
                    marginBottom: 12
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #e94560, #00b4d8)',
                      width: `${exportProgress}%`,
                      transition: 'width 0.1s'
                    }}
                  />
                </div>
                <p
                  style={{
                    textAlign: 'center',
                    color: '#00b4d8',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                >
                  {exportProgress.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
