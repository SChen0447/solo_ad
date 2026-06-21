import React, { useState, useCallback } from 'react';
import { ComponentType, Framework, VariableOverride, VariableChangeRecord } from './types';
import { getAllDefaultVariables } from './utils/variableOverride';
import ComponentList from './components/ComponentList';
import PreviewPanel from './components/PreviewPanel';
import ControlPanel from './components/ControlPanel';
import './styles/App.scss';

const App: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState<ComponentType>(ComponentType.BUTTON);
  const [selectedFramework, setSelectedFramework] = useState<Framework>(Framework.BOOTSTRAP);
  const [variableOverrides, setVariableOverrides] = useState<Record<Framework, VariableOverride>>(
    getAllDefaultVariables()
  );
  const [lastChange, setLastChange] = useState<VariableChangeRecord | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleComponentSelect = useCallback((component: ComponentType) => {
    setSelectedComponent(component);
    setLastChange(null);
  }, []);

  const handleFrameworkChange = useCallback((framework: Framework) => {
    setSelectedFramework(framework);
    setLastChange(null);
  }, []);

  const handleVariableChange = useCallback(
    (framework: Framework, variableName: string, value: string | number) => {
      setVariableOverrides((prev) => {
        const oldValue = prev[framework][variableName];
        if (oldValue === value) return prev;

        setLastChange({
          framework,
          variableName,
          oldValue,
          newValue: value,
          timestamp: Date.now()
        });

        return {
          ...prev,
          [framework]: {
            ...prev[framework],
            [variableName]: value
          }
        };
      });
    },
    []
  );

  const handleReset = useCallback((framework: Framework) => {
    const defaults = getAllDefaultVariables();
    setVariableOverrides((prev) => ({
      ...prev,
      [framework]: defaults[framework]
    }));
    setLastChange(null);
  }, []);

  const handleExport = useCallback(() => {
    const config = {
      exportedAt: new Date().toISOString(),
      frameworks: variableOverrides
    };
    const json = JSON.stringify(config, null, 2);

    navigator.clipboard
      .writeText(json)
      .then(() => {
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 2000);
      })
      .catch((err) => {
        console.error('复制失败:', err);
      });
  }, [variableOverrides]);

  return (
    <div className="app">
      <ComponentList
        selectedComponent={selectedComponent}
        onSelect={handleComponentSelect}
      />

      <main className="app__main">
        <div className="app__preview-wrapper">
          <PreviewPanel
            componentType={selectedComponent}
            variableOverrides={variableOverrides}
            selectedFramework={selectedFramework}
          />
        </div>
      </main>

      <ControlPanel
        selectedFramework={selectedFramework}
        variableOverrides={variableOverrides}
        lastChange={lastChange}
        onFrameworkChange={handleFrameworkChange}
        onVariableChange={handleVariableChange}
        onReset={handleReset}
        onExport={handleExport}
      />

      <div className={`toast ${showToast ? 'is-visible' : ''}`}>
        配置已复制到剪贴板
      </div>
    </div>
  );
};

export default App;
