import { useState, useCallback, useMemo } from 'react';
import {
  HSL,
  HSLOffset,
  HarmonyRule,
  HARMONY_RULE_LABELS,
  generateHarmonyColors,
  generateBaseHSL,
  hslToHex
} from './colorTheory';
import ColorWheel from './ColorWheel';
import ColorPalette from './ColorPalette';
import UIPreview from './UIPreview';

function App() {
  const [baseColor, setBaseColor] = useState<HSL>(generateBaseHSL());
  const [harmonyRule, setHarmonyRule] = useState<HarmonyRule>('triadic');
  const [hslOffset, setHslOffset] = useState<HSLOffset>({ h: 0, s: 0, l: 0 });
  const [lockedIndices, setLockedIndices] = useState<number[]>([]);
  const [animationKey, setAnimationKey] = useState<number>(0);

  const harmonyColors = useMemo(() => {
    return generateHarmonyColors(baseColor, harmonyRule, hslOffset, lockedIndices);
  }, [baseColor, harmonyRule, hslOffset, lockedIndices]);

  const handleBaseColorChange = useCallback((color: HSL) => {
    setBaseColor(color);
  }, []);

  const handleRuleChange = useCallback((rule: HarmonyRule) => {
    setHarmonyRule(rule);
    setLockedIndices([]);
    setAnimationKey((k) => k + 1);
  }, []);

  const handleOffsetChange = useCallback((offset: HSLOffset) => {
    setHslOffset(offset);
  }, []);

  const handleLockToggle = useCallback((index: number) => {
    setLockedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }, []);

  const handleSaveScheme = useCallback(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const filename = `colorScheme_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.json`;

    const schemeData = {
      baseColor,
      harmonyRule,
      hslOffset,
      colors: harmonyColors.map((c) => ({ hsl: c, hex: hslToHex(c) })),
      lockedIndices,
      savedAt: now.toISOString()
    };

    const blob = new Blob([JSON.stringify(schemeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [baseColor, harmonyRule, hslOffset, harmonyColors, lockedIndices]);

  const rules: HarmonyRule[] = ['complementary', 'analogous', 'triadic', 'splitComplementary'];

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-logo">
          <i className="fa-solid fa-swatchbook" />
          <h1>色彩调和方案生成器</h1>
        </div>
        <button className="save-btn" onClick={handleSaveScheme}>
          <i className="fa-solid fa-download" />
          保存方案
        </button>
      </header>

      <nav className="rule-nav">
        {rules.map((rule) => (
          <button
            key={rule}
            className={`rule-tab ${harmonyRule === rule ? 'active' : ''}`}
            onClick={() => handleRuleChange(rule)}
          >
            {HARMONY_RULE_LABELS[rule]}
          </button>
        ))}
      </nav>

      <main className="app-main">
        <section className="panel panel-wheel">
          <div className="panel-header">
            <i className="fa-solid fa-circle-nodes" />
            <span>色相轮</span>
          </div>
          <div className="panel-body wheel-body">
            <ColorWheel
              baseColor={baseColor}
              harmonyColors={harmonyColors}
              onBaseColorChange={handleBaseColorChange}
            />
          </div>
        </section>

        <section className="panel panel-palette">
          <div className="panel-header">
            <i className="fa-solid fa-palette" />
            <span>调和色板</span>
          </div>
          <div className="panel-body">
            <ColorPalette
              colors={harmonyColors}
              offset={hslOffset}
              onOffsetChange={handleOffsetChange}
              lockedIndices={lockedIndices}
              onLockToggle={handleLockToggle}
              animationKey={animationKey}
              primaryColor={baseColor}
            />
          </div>
        </section>

        <section className="panel panel-preview">
          <div className="panel-header">
            <i className="fa-solid fa-desktop" />
            <span>UI 预览</span>
          </div>
          <div className="panel-body">
            <UIPreview colors={harmonyColors} animationKey={animationKey} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
