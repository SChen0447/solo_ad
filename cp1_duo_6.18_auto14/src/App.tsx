import React, { useState, useMemo, useEffect } from 'react';
import SceneRenderer from './SceneRenderer';
import ControlPanel from './ControlPanel';
import {
  generateDistributionData,
  getDefaultParams,
  distributionNames,
  type DistributionType,
  type DistributionParams,
  type DistributionData
} from './DistributionEngine';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface LegendProps {
  primaryType: DistributionType;
  secondaryType: DistributionType;
  primaryParams: DistributionParams[DistributionType];
  secondaryParams: DistributionParams[DistributionType];
  visible: boolean;
}

const formatParams = (type: DistributionType, params: DistributionParams[DistributionType]): string => {
  const p = params as Record<string, number>;
  switch (type) {
    case 'normal':
      return `μ=${p.mean.toFixed(1)}, σ=${p.std.toFixed(1)}`;
    case 'uniform':
      return `a=${p.a.toFixed(1)}, b=${p.b.toFixed(1)}`;
    case 'exponential':
      return `λ=${p.lambda.toFixed(1)}`;
    case 'poisson':
      return `μ=${p.mu.toFixed(0)}`;
    case 'binomial':
      return `n=${p.n.toFixed(0)}, p=${p.p.toFixed(2)}`;
    default:
      return '';
  }
};

const ColorLegend: React.FC<LegendProps> = ({ primaryType, secondaryType, primaryParams, secondaryParams, visible }) => {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '16px 20px',
      backgroundColor: 'rgba(22, 27, 34, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      zIndex: 100,
      animation: 'fadeIn 0.3s ease-in-out',
      minWidth: '220px'
    }}>
      <div style={{
        color: '#e6edf3',
        fontSize: '13px',
        fontWeight: 600,
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        分布图例
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              backgroundColor: '#2196f3',
              boxShadow: '0 0 8px rgba(33, 150, 243, 0.6)',
              opacity: 0.75
            }} />
            <span style={{ color: '#e6edf3', fontSize: '13px', fontWeight: 500 }}>
              主分布: {distributionNames[primaryType]}
            </span>
          </div>
          <span style={{ color: '#8b949e', fontSize: '11px', paddingLeft: '28px', fontFamily: 'monospace' }}>
            {formatParams(primaryType, primaryParams)}
          </span>
        </div>

        <div style={{
          height: '1px',
          backgroundColor: 'rgba(255,255,255,0.08)'
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              backgroundColor: '#FF8C00',
              boxShadow: '0 0 8px rgba(255, 140, 0, 0.6)',
              opacity: 0.5
            }} />
            <span style={{ color: '#e6edf3', fontSize: '13px', fontWeight: 500 }}>
              对比分布: {distributionNames[secondaryType]}
            </span>
          </div>
          <span style={{ color: '#8b949e', fontSize: '11px', paddingLeft: '28px', fontFamily: 'monospace' }}>
            {formatParams(secondaryType, secondaryParams)}
          </span>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  const [primaryType, setPrimaryType] = useState<DistributionType>('normal');
  const [primaryParams, setPrimaryParams] = useState<DistributionParams[DistributionType]>(
    getDefaultParams('normal')
  );

  const [secondaryType, setSecondaryType] = useState<DistributionType>('uniform');
  const [secondaryParams, setSecondaryParams] = useState<DistributionParams[DistributionType]>(
    getDefaultParams('uniform')
  );

  const [comparisonMode, setComparisonMode] = useState(false);

  const debouncedPrimaryParams = useDebounce(primaryParams, 100);
  const debouncedSecondaryParams = useDebounce(secondaryParams, 100);

  const primaryData = useMemo<DistributionData>(() => {
    return generateDistributionData(primaryType, debouncedPrimaryParams);
  }, [primaryType, debouncedPrimaryParams]);

  const secondaryData = useMemo<DistributionData>(() => {
    if (!comparisonMode) return primaryData;
    return generateDistributionData(secondaryType, debouncedSecondaryParams);
  }, [secondaryType, debouncedSecondaryParams, comparisonMode, primaryData]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: 'linear-gradient(to bottom, #0d1117, #161b22)',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}>
        <SceneRenderer
          primaryData={primaryData}
          secondaryData={secondaryData}
          comparisonMode={comparisonMode}
        />
      </div>

      <ControlPanel
        primaryType={primaryType}
        primaryParams={primaryParams}
        secondaryType={secondaryType}
        secondaryParams={secondaryParams}
        comparisonMode={comparisonMode}
        onPrimaryTypeChange={setPrimaryType}
        onPrimaryParamsChange={setPrimaryParams}
        onSecondaryTypeChange={setSecondaryType}
        onSecondaryParamsChange={setSecondaryParams}
        onComparisonModeChange={setComparisonMode}
      />

      <ColorLegend
        primaryType={primaryType}
        secondaryType={secondaryType}
        primaryParams={debouncedPrimaryParams}
        secondaryParams={debouncedSecondaryParams}
        visible={comparisonMode}
      />

      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        color: '#8b949e',
        fontSize: '11px',
        zIndex: 100,
        textAlign: 'right'
      }}>
        <div style={{ marginBottom: '4px' }}>🖱️ 拖拽旋转 · 滚轮缩放</div>
      </div>
    </div>
  );
};

export default App;
