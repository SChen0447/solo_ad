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
  visible: boolean;
}

const ColorLegend: React.FC<LegendProps> = ({ primaryType, secondaryType, visible }) => {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '14px 18px',
      backgroundColor: 'rgba(22, 27, 34, 0.8)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '10px',
      zIndex: 100,
      animation: 'fadeIn 0.3s ease-in-out'
    }}>
      <div style={{
        color: '#e6edf3',
        fontSize: '12px',
        fontWeight: 600,
        marginBottom: '10px'
      }}>
        图例
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '3px',
            backgroundColor: '#2196f3',
            boxShadow: '0 0 6px rgba(33, 150, 243, 0.5)'
          }} />
          <span style={{ color: '#e6edf3', fontSize: '12px' }}>
            分布 1: {distributionNames[primaryType]}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '3px',
            backgroundColor: '#ff9800',
            opacity: 0.6,
            boxShadow: '0 0 6px rgba(255, 152, 0, 0.5)'
          }} />
          <span style={{ color: '#e6edf3', fontSize: '12px' }}>
            分布 2: {distributionNames[secondaryType]}
          </span>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
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
