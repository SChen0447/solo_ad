import { useCallback, useMemo, useState } from 'react';
import { PreviewPanel } from '@/components/PreviewPanel';
import { ControlPanel } from '@/components/ControlPanel';
import { ExportModal } from '@/components/ExportModal';
import {
  AnimationParams,
  AnimationTarget,
  DEFAULT_PARAMS,
  ElementParams,
  PRESETS,
} from '@/types';
import { paramSerializer } from '@/utils/ParamSerializer';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

function App() {
  const [target, setTarget] = useState<AnimationTarget>('both');
  const [params, setParams] = useState<ElementParams>({
    square: { ...DEFAULT_PARAMS },
    circle: { ...DEFAULT_PARAMS },
  });
  const [showExport, setShowExport] = useState(false);
  const [squareId] = useState(() => uuidv4().slice(0, 8));
  const [circleId] = useState(() => uuidv4().slice(0, 8));

  const currentParams = useMemo<AnimationParams>(() => {
    if (target === 'square') return params.square;
    if (target === 'circle') return params.circle;
    return params.square;
  }, [target, params]);

  const handleParamsChange = useCallback(
    (newParams: AnimationParams) => {
      setParams((prev) => {
        if (target === 'square') {
          return { ...prev, square: newParams };
        } else if (target === 'circle') {
          return { ...prev, circle: newParams };
        } else {
          return { square: newParams, circle: newParams };
        }
      });
    },
    [target]
  );

  const handleReset = useCallback(() => {
    const defaultP = { ...DEFAULT_PARAMS };
    setParams({ square: defaultP, circle: { ...defaultP } });
  }, []);

  const handleApplyPreset = useCallback(
    (presetIndex: number) => {
      const preset = PRESETS[presetIndex];
      if (!preset) return;
      const merged: AnimationParams = { ...DEFAULT_PARAMS, ...preset.params } as AnimationParams;
      setParams((prev) => {
        if (target === 'square') {
          return { ...prev, square: merged };
        } else if (target === 'circle') {
          return { ...prev, circle: merged };
        } else {
          return { square: merged, circle: { ...merged } };
        }
      });
    },
    [target]
  );

  const handleElementClick = useCallback((element: 'square' | 'circle') => {
    setTarget(element);
  }, []);

  const cssCode = useMemo(() => {
    return paramSerializer.generateFullCSS(params, squareId, circleId);
  }, [params, squareId, circleId]);

  return (
    <div className="app-container">
      <ControlPanel
        target={target}
        params={currentParams}
        onTargetChange={setTarget}
        onParamsChange={handleParamsChange}
        onReset={handleReset}
        onExport={() => setShowExport(true)}
        onApplyPreset={handleApplyPreset}
      />
      <div className="divider" />
      <PreviewPanel params={params} target={target} onElementClick={handleElementClick} />
      {showExport && <ExportModal cssCode={cssCode} onClose={() => setShowExport(false)} />}
    </div>
  );
}

export default App;
