import React from 'react';
import { Framework, VariableOverride, VariableChangeRecord } from '../types';
import { frameworkVariableConfigs } from '../utils/variableOverride';
import { getFrameworkName } from '../utils/componentRenderer';

interface ControlPanelProps {
  selectedFramework: Framework;
  variableOverrides: Record<Framework, VariableOverride>;
  lastChange: VariableChangeRecord | null;
  onFrameworkChange: (framework: Framework) => void;
  onVariableChange: (framework: Framework, variableName: string, value: string | number) => void;
  onReset: (framework: Framework) => void;
  onExport: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedFramework,
  variableOverrides,
  lastChange,
  onFrameworkChange,
  onVariableChange,
  onReset,
  onExport
}) => {
  const variableConfigs = frameworkVariableConfigs[selectedFramework];
  const currentOverrides = variableOverrides[selectedFramework];

  const handleVariableChange = (variableName: string, value: string | number) => {
    onVariableChange(selectedFramework, variableName, value);
  };

  const renderControl = (config: typeof variableConfigs[0]) => {
    const value = currentOverrides[config.name] ?? config.defaultValue;

    switch (config.type) {
      case 'color':
        return (
          <div key={config.name} className="control-panel__field">
            <label className="control-panel__label">
              <span>{config.label}</span>
              <span className="control-panel__value">{String(value)}</span>
            </label>
            <div className="control-panel__color-input">
              <input
                type="color"
                value={String(value)}
                onChange={(e) => handleVariableChange(config.name, e.target.value)}
              />
            </div>
          </div>
        );
      case 'slider':
        return (
          <div key={config.name} className="control-panel__field">
            <label className="control-panel__label">
              <span>{config.label}</span>
              <span className="control-panel__value">
                {value}{config.unit}
              </span>
            </label>
            <input
              type="range"
              className="control-panel__slider"
              min={config.min}
              max={config.max}
              step={config.step}
              value={Number(value)}
              onChange={(e) => handleVariableChange(config.name, parseFloat(e.target.value))}
            />
          </div>
        );
      case 'number':
        return (
          <div key={config.name} className="control-panel__field">
            <label className="control-panel__label">
              <span>{config.label}</span>
              <span className="control-panel__value">
                {value}{config.unit}
              </span>
            </label>
            <input
              type="number"
              className="control-panel__number-input"
              min={config.min}
              max={config.max}
              step={config.step}
              value={Number(value)}
              onChange={(e) => handleVariableChange(config.name, parseFloat(e.target.value) || 0)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const frameworks = [Framework.BOOTSTRAP, Framework.TAILWIND, Framework.BULMA];

  return (
    <aside className="control-panel">
      <div className="control-panel__top">
        <div className="control-panel__header">
          <h3>参数调节</h3>
        </div>

        <div className="control-panel__framework-select">
          <label className="control-panel__label">当前框架</label>
          <select
            className="control-panel__select"
            value={selectedFramework}
            onChange={(e) => onFrameworkChange(e.target.value as Framework)}
          >
            {frameworks.map((fw) => (
              <option key={fw} value={fw}>
                {getFrameworkName(fw)}
              </option>
            ))}
          </select>
        </div>

        <div className="control-panel__variables">
          {variableConfigs.map((config) => renderControl(config))}
        </div>
      </div>

      <div className="control-panel__bottom">
        <div className="control-panel__record">
          <h4>变量修改记录</h4>
          {lastChange && lastChange.framework === selectedFramework ? (
            <div className="control-panel__record-item">
              <span className="control-panel__record-var">
                {lastChange.variableName}
              </span>
              <span className="control-panel__record-arrow">→</span>
              <span className="control-panel__record-old">
                {lastChange.oldValue}
              </span>
              <span className="control-panel__record-arrow">→</span>
              <span className="control-panel__record-new">
                {lastChange.newValue}
              </span>
            </div>
          ) : (
            <p className="control-panel__record-empty">暂无修改记录</p>
          )}
        </div>

        <div className="control-panel__actions">
          <button
            className="control-panel__btn control-panel__btn--secondary"
            onClick={() => onReset(selectedFramework)}
          >
            重置当前框架
          </button>
          <button
            className="control-panel__btn control-panel__btn--primary"
            onClick={onExport}
          >
            导出当前配置
          </button>
        </div>
      </div>
    </aside>
  );
};

export default ControlPanel;
