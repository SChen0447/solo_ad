import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useProjectStore } from './store';
import AudioEngine from './AudioEngine';
import { LevelMeter, THEME } from './types';

const METER_HEIGHT = 120;
const METER_WIDTH = 12;
const FADER_HEIGHT = 140;
const KNOB_SIZE = 36;

const MixerPanel: React.FC = () => {
  const {
    project,
    mixerState,
    updateMixerState,
    isExporting,
    exportProgress,
    exportTrackIndex,
    setExportProgress,
    setExporting,
  } = useProjectStore();

  const [levels, setLevels] = useState<LevelMeter>({ left: 0, right: 0 });
  const [panelWidth, setPanelWidth] = useState(280);
  const [draggingKnob, setDraggingKnob] = useState<{ trackId: string; startY: number; startPan: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [exportFormat, setExportFormat] = useState<'wav' | 'mp3'>('wav');
  const resizeRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 280 });

  useEffect(() => {
    const engine = AudioEngine.getInstance();
    engine.onLevelMeterUpdate((l) => setLevels(l));
    return () => engine.onLevelMeterUpdate(() => {});
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const delta = resizeRef.current.startX - e.clientX;
      const newWidth = Math.max(220, Math.min(400, resizeRef.current.startWidth + delta));
      setPanelWidth(newWidth);
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!draggingKnob) return;
    const handleMove = (e: MouseEvent) => {
      const deltaY = e.clientY - draggingKnob.startY;
      const newPan = Math.max(-1, Math.min(1, draggingKnob.startPan + deltaY / 60));
      const engine = AudioEngine.getInstance();
      engine.setTrackPan(draggingKnob.trackId, newPan);
      updateMixerState({
        trackPans: { ...mixerState.trackPans, [draggingKnob.trackId]: newPan },
      });
    };
    const handleUp = () => setDraggingKnob(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggingKnob, mixerState, updateMixerState]);

  const handleMasterVolume = useCallback((db: number) => {
    updateMixerState({ masterVolume: db });
    AudioEngine.getInstance().setMasterVolume(db);
  }, [updateMixerState]);

  const handleTrackMute = useCallback((trackId: string, mute: boolean, volume: number) => {
    const newMutes = { ...mixerState.trackMutes, [trackId]: mute };
    updateMixerState({ trackMutes: newMutes });
    AudioEngine.getInstance().setTrackMute(trackId, mute, volume);
  }, [mixerState, updateMixerState]);

  const handleTrackSolo = useCallback((trackId: string, solo: boolean) => {
    const newSolos = { ...mixerState.trackSolos, [trackId]: solo };
    updateMixerState({ trackSolos: newSolos });
  }, [mixerState, updateMixerState]);

  const handleTrackVolume = useCallback((trackId: string, volume: number) => {
    const newVols = { ...mixerState.trackVolumes, [trackId]: volume };
    updateMixerState({ trackVolumes: newVols });
    AudioEngine.getInstance().setTrackVolume(trackId, volume);
  }, [mixerState, updateMixerState]);

  const handleExport = useCallback(async () => {
    if (!project || isExporting) return;
    setExporting(true);
    try {
      const engine = AudioEngine.getInstance();
      const blob = await engine.exportMix(
        project.tracks,
        mixerState,
        exportFormat,
        (trackIdx, progress) => setExportProgress(trackIdx, progress)
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
      setExportProgress(0, 0);
    }
  }, [project, mixerState, exportFormat, isExporting, setExporting, setExportProgress]);

  const dbToSlider = (db: number) => ((db + 60) / 66) * 100;
  const sliderToDb = (val: number) => (val / 100) * 66 - 60;

  const getMeterColor = (level: number): string => {
    if (level < 0.5) return '#2ed573';
    if (level < 0.8) return '#ffa502';
    return '#ff4757';
  };

  const renderMeter = (level: number) => {
    const fillHeight = Math.min(level * METER_HEIGHT, METER_HEIGHT);
    return (
      <div style={{
        width: METER_WIDTH,
        height: METER_HEIGHT,
        background: '#0d1b2a',
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: fillHeight,
          background: `linear-gradient(to top, #2ed573, #ffa502, #ff4757)`,
          borderRadius: 2,
          transition: 'height 0.1s ease-out',
        }} />
      </div>
    );
  };

  const renderPanKnob = (trackId: string, pan: number) => {
    const rotation = pan * 45;
    return (
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          setDraggingKnob({ trackId, startY: e.clientY, startPan: pan });
        }}
        style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: '50%',
          background: `radial-gradient(circle at 40% 40%, #4a5568, #2d3748)`,
          border: '2px solid #555',
          cursor: 'pointer',
          position: 'relative',
          transform: `rotate(${rotation}deg)`,
          transition: draggingKnob?.trackId === trackId ? 'none' : 'transform 0.15s ease',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 3,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 3,
          height: 10,
          background: '#fff',
          borderRadius: 2,
        }} />
      </div>
    );
  };

  if (!project) return null;

  return (
    <div style={{
      width: panelWidth,
      minWidth: 220,
      maxWidth: 400,
      height: '100%',
      background: THEME.componentBg,
      borderLeft: `1px solid ${THEME.border}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: 'col-resize',
          zIndex: 10,
        }}
        onMouseDown={(e) => {
          resizeRef.current = { startX: e.clientX, startWidth: panelWidth };
          setIsResizing(true);
        }}
      />

      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${THEME.border}`, textAlign: 'center' }}>
        <span style={{ color: '#ccc', fontSize: 12, fontWeight: 600 }}>MIXER</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 6px' }}>
        <div style={{ marginBottom: 12, padding: '8px', background: '#0d1b2a', borderRadius: 6, border: `1px solid ${THEME.border}` }}>
          <div style={{ fontSize: 10, color: '#888', marginBottom: 4, textAlign: 'center' }}>MASTER</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
            {renderMeter(levels.left)}
            {renderMeter(levels.right)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 9, color: '#888' }}>
              {mixerState.masterVolume > 0 ? '+' : ''}{mixerState.masterVolume.toFixed(1)} dB
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5 / 66 * 100}
              value={dbToSlider(mixerState.masterVolume)}
              onChange={(e) => handleMasterVolume(sliderToDb(Number(e.target.value)))}
              style={{ width: '100%', accentColor: THEME.highlight }}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <button
                className="btn"
                onClick={() => {
                  const newMute = !mixerState.masterMute;
                  updateMixerState({ masterMute: newMute });
                  if (newMute) AudioEngine.getInstance().setMasterVolume(-60);
                  else AudioEngine.getInstance().setMasterVolume(mixerState.masterVolume);
                }}
                style={{
                  ...muteSoloBtn,
                  background: mixerState.masterMute ? '#ff4757' : '#555',
                  transform: mixerState.masterMute ? 'scale(0.95)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              >
                M
              </button>
            </div>
          </div>
        </div>

        {project.tracks.map((track) => {
          const vol = mixerState.trackVolumes[track.id] ?? track.volume;
          const pan = mixerState.trackPans[track.id] ?? track.pan;
          const mute = mixerState.trackMutes[track.id] ?? track.mute;
          const solo = mixerState.trackSolos[track.id] ?? track.solo;

          return (
            <div key={track.id} style={{
              marginBottom: 8,
              padding: '6px 8px',
              background: '#0d1b2a',
              borderRadius: 4,
              borderLeft: `3px solid ${track.color}`,
            }}>
              <div style={{ fontSize: 11, color: '#ccc', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {track.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  {renderPanKnob(track.id, pan)}
                  <span style={{ fontSize: 8, color: '#888' }}>
                    {pan < -0.05 ? 'L' : pan > 0.05 ? 'R' : 'C'}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={vol}
                    onChange={(e) => handleTrackVolume(track.id, Number(e.target.value))}
                    style={{ width: '100%', accentColor: track.color }}
                  />
                  <div style={{ fontSize: 9, color: '#888', textAlign: 'center' }}>{vol}%</div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button
                    className="btn"
                    onClick={() => handleTrackMute(track.id, !mute, vol)}
                    style={{
                      ...muteSoloBtn,
                      background: mute ? '#ff4757' : '#555',
                      transform: mute ? 'scale(0.95)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    M
                  </button>
                  <button
                    className="btn"
                    onClick={() => handleTrackSolo(track.id, !solo)}
                    style={{
                      ...muteSoloBtn,
                      background: solo ? '#ffa502' : '#555',
                      transform: solo ? 'scale(0.95)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    S
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '8px 10px', borderTop: `1px solid ${THEME.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'wav' | 'mp3')}
            style={{
              background: '#0d1b2a',
              color: '#ccc',
              border: `1px solid ${THEME.border}`,
              borderRadius: 3,
              padding: '3px 6px',
              fontSize: 11,
            }}
          >
            <option value="wav">WAV 44.1kHz 16bit</option>
            <option value="mp3">MP3 320kbps</option>
          </select>
          <button
            className="btn"
            onClick={handleExport}
            disabled={isExporting}
            style={{
              ...exportBtn,
              opacity: isExporting ? 0.6 : 1,
            }}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
        {isExporting && (
          <div style={{ width: '100%', height: 8, background: '#0d1b2a', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${exportProgress}%`,
              height: '100%',
              background: `linear-gradient(to right, ${THEME.exportProgressFrom}, ${THEME.exportProgressTo})`,
              borderRadius: 4,
              transition: 'width 0.2s ease',
            }} />
          </div>
        )}
      </div>
    </div>
  );
};

const muteSoloBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 3,
  border: 'none',
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const exportBtn: React.CSSProperties = {
  background: THEME.highlight,
  color: '#fff',
  border: 'none',
  padding: '6px 14px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  transition: 'all 0.1s',
};

export default MixerPanel;
