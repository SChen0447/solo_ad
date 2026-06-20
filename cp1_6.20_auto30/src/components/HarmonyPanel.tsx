import React, { useMemo } from 'react';
import { ChordData } from '../services/websocketClient';

interface HarmonyPanelProps {
  chords: ChordData[];
  keySignature: string;
  onPlayChord: (midiNotes: number[]) => void;
  onCollapse: () => void;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const WARM_COLORS = [
  '#ff6b6b', '#ee5a24', '#ff9f43', '#feca57',
  '#ff6b6b', '#ee5a24', '#ff9f43', '#feca57',
];

const COOL_COLORS = [
  '#54a0ff', '#2e86de', '#48dbfb', '#0abde3',
  '#54a0ff', '#2e86de', '#48dbfb', '#0abde3',
];

const NEUTRAL_COLORS = [
  '#a29bfe', '#6c5ce7', '#fd79a8', '#e84393',
  '#a29bfe', '#6c5ce7', '#fd79a8', '#e84393',
];

const PIANO_LOW_MIDI = 48;
const PIANO_HIGH_MIDI = 72;
const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEY_POSITIONS: Record<number, number> = {
  1: 0.6, 3: 1.6, 6: 3.3, 8: 4.3, 10: 5.3,
};

const HarmonyPanel: React.FC<HarmonyPanelProps> = ({
  chords,
  keySignature,
  onPlayChord,
  onCollapse,
}) => {
  const colorPalette = useMemo(() => {
    if (keySignature === 'C大调' || keySignature === 'F大调') return WARM_COLORS;
    if (keySignature === 'G大调' || keySignature === 'D大调') return COOL_COLORS;
    return NEUTRAL_COLORS;
  }, [keySignature]);

  const getColor = (index: number) => colorPalette[index % colorPalette.length];

  const groupedByMeasure = useMemo(() => {
    const groups: Map<number, ChordData[]> = new Map();
    chords.forEach((chord) => {
      if (!groups.has(chord.measure)) groups.set(chord.measure, []);
      groups.get(chord.measure)!.push(chord);
    });
    return groups;
  }, [chords]);

  const measures = Array.from(groupedByMeasure.keys()).sort((a, b) => a - b);
  const displayMeasures = measures.length > 0 ? measures : [0, 1, 2, 3];
  const beatsPerMeasure = 4;
  const beatWidth = 60;
  const measureWidth = beatWidth * beatsPerMeasure;
  const totalWidth = 40 + displayMeasures.length * measureWidth;
  const octaveCount = Math.ceil((PIANO_HIGH_MIDI - PIANO_LOW_MIDI) / 12);
  const whiteKeyCount = octaveCount * 7;
  const whiteKeyHeight = 18;
  const totalHeight = 40 + whiteKeyCount * whiteKeyHeight + 20;

  const pianoKeyHeight = whiteKeyHeight;

  const renderPianoRoll = () => {
    const elements: JSX.Element[] = [];

    for (let m = 0; m < displayMeasures.length; m++) {
      const xStart = 40 + m * measureWidth;
      for (let b = 0; b < beatsPerMeasure; b++) {
        elements.push(
          <line
            key={`beat-${m}-${b}`}
            x1={xStart + b * beatWidth}
            y1={30}
            x2={xStart + b * beatWidth}
            y2={totalHeight - 10}
            stroke={b === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}
            strokeWidth={1}
          />
        );
      }
      elements.push(
        <text
          key={`mlabel-${m}`}
          x={xStart + 4}
          y={20}
          fill="#666"
          fontSize={10}
          fontFamily="monospace"
        >
          第{displayMeasures[m] + 1}小节
        </text>
      );
    }

    for (let midi = PIANO_LOW_MIDI; midi <= PIANO_HIGH_MIDI; midi++) {
      const semitone = midi % 12;
      const octave = Math.floor(midi / 12) - 1;
      const isBlack = !WHITE_KEYS.includes(semitone);
      const whiteIndex = WHITE_KEYS.indexOf(semitone) !== -1
        ? WHITE_KEYS.indexOf(semitone) + (octave - 3) * 7
        : -1;

      if (isBlack) {
        const prevWhite = semitone - 1;
        const prevWhiteIndex = WHITE_KEYS.indexOf(prevWhite) + (octave - 3) * 7;
        const y = 30 + prevWhiteIndex * pianoKeyHeight + pianoKeyHeight * 0.35;
        elements.push(
          <rect
            key={`bk-${midi}`}
            x={40}
            y={y}
            width={totalWidth - 50}
            height={pianoKeyHeight * 0.6}
            fill="rgba(0,0,0,0.4)"
            pointerEvents="none"
          />
        );
      } else if (whiteIndex >= 0) {
        const y = 30 + whiteIndex * pianoKeyHeight;
        elements.push(
          <line
            key={`wl-${midi}`}
            x1={40}
            y1={y}
            x2={totalWidth - 10}
            y2={y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.5}
            pointerEvents="none"
          />
        );
      }
    }

    chords.forEach((chord, idx) => {
      const measureIdx = displayMeasures.indexOf(chord.measure);
      if (measureIdx === -1) return;
      const xStart = 40 + measureIdx * measureWidth + chord.beat * beatWidth;
      const chordWidth = beatWidth;
      const color = getColor(idx);

      chord.notes.forEach((midi) => {
        if (midi < PIANO_LOW_MIDI || midi > PIANO_HIGH_MIDI) return;
        const semitone = midi % 12;
        const octave = Math.floor(midi / 12) - 1;
        const whiteIndex = WHITE_KEYS.indexOf(semitone) + (octave - 3) * 7;
        if (whiteIndex < 0) return;

        const isBlack = !WHITE_KEYS.includes(semitone);
        let y: number;
        let height: number;
        if (isBlack) {
          const prevWhiteIndex = WHITE_KEYS.indexOf(semitone - 1) + (octave - 3) * 7;
          y = 30 + prevWhiteIndex * pianoKeyHeight + pianoKeyHeight * 0.35;
          height = pianoKeyHeight * 0.6;
        } else {
          y = 30 + whiteIndex * pianoKeyHeight;
          height = pianoKeyHeight;
        }

        elements.push(
          <rect
            key={`chord-${idx}-${midi}`}
            x={xStart + 2}
            y={y + 1}
            width={chordWidth - 4}
            height={height - 2}
            fill={color}
            rx={3}
            style={{
              cursor: 'pointer',
              opacity: 0.85,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as SVGRectElement).style.opacity = '1';
              (e.target as SVGRectElement).style.transform = 'scaleY(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.target as SVGRectElement).style.opacity = '0.85';
              (e.target as SVGRectElement).style.transform = 'scaleY(1)';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onPlayChord(chord.notes);
            }}
          />
        );
      });
    });

    return elements;
  };

  const renderPianoKeys = () => {
    const elements: JSX.Element[] = [];
    for (let midi = PIANO_LOW_MIDI; midi <= PIANO_HIGH_MIDI; midi++) {
      const semitone = midi % 12;
      const octave = Math.floor(midi / 12) - 1;
      const isBlack = !WHITE_KEYS.includes(semitone);

      if (isBlack) {
        const prevWhite = semitone - 1;
        const prevWhiteIndex = WHITE_KEYS.indexOf(prevWhite) + (octave - 3) * 7;
        const y = 30 + prevWhiteIndex * pianoKeyHeight + pianoKeyHeight * 0.35;
        elements.push(
          <rect
            key={`pk-b-${midi}`}
            x={2}
            y={y}
            width={34}
            height={pianoKeyHeight * 0.6}
            fill="#2a2a4e"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={0.5}
            rx={2}
          />
        );
      } else {
        const whiteIndex = WHITE_KEYS.indexOf(semitone) + (octave - 3) * 7;
        const y = 30 + whiteIndex * pianoKeyHeight;
        elements.push(
          <rect
            key={`pk-w-${midi}`}
            x={2}
            y={y}
            width={38}
            height={pianoKeyHeight}
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.5}
            rx={2}
          />
        );
        if (semitone === 0) {
          elements.push(
            <text
              key={`pn-${midi}`}
              x={6}
              y={y + pianoKeyHeight - 5}
              fill="#888"
              fontSize={8}
              fontFamily="monospace"
            >
              C{octave}
            </text>
          );
        }
      }
    }
    return elements;
  };

  const renderChordLabels = () => {
    if (chords.length === 0) return null;
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {chords.map((chord, idx) => (
          <div
            key={`label-${idx}`}
            onClick={() => onPlayChord(chord.notes)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: getColor(idx),
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
            }}
          >
            <span>{chord.root}</span>
            <span style={{ fontSize: 9, opacity: 0.8 }}>{chord.type}</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>
              [{chord.notes.map((n) => NOTE_NAMES[n % 12]).join(' ')}]
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        width: 340,
        background: 'rgba(0,0,0,0.2)',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🎹</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>和声推荐</span>
        </div>
        <button
          onClick={onCollapse}
          title="收起面板"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 16,
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          ◀
        </button>
      </div>

      {renderChordLabels()}

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 8,
        }}
      >
        {chords.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#666',
              textAlign: 'center',
              padding: 40,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🎼</div>
            <p style={{ fontSize: 13, margin: 0, marginBottom: 6 }}>暂无和声推荐</p>
            <p style={{ fontSize: 11, margin: 0, opacity: 0.6 }}>
              请在左侧工具栏点击<br />"生成和声"按钮
            </p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            width="100%"
            style={{ minWidth: totalWidth, minHeight: totalHeight }}
          >
            <style>
              {`
                rect[style*="cursor: pointer"]:hover {
                  filter: brightness(1.15);
                }
              `}
            </style>
            {renderPianoKeys()}
            {renderPianoRoll()}
          </svg>
        )}
      </div>

      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: 10,
          color: '#666',
          textAlign: 'center',
        }}
      >
        点击和弦块或标签试听
      </div>
    </div>
  );
};

export default HarmonyPanel;
