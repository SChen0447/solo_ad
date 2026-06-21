import React from 'react';
import type { Device, Rule, Comparator, ActionType } from './types';
import { getActionLabel, getSensorValueLabel } from './dataStore';

interface RuleEditorProps {
  devices: Device[];
  rules: Rule[];
  conflicts: string[];
  onAddRule: () => void;
  onUpdateRule: (id: string, updates: Partial<Rule>) => void;
  onDeleteRule: (id: string) => void;
}

export const RuleEditor: React.FC<RuleEditorProps> = ({
  devices,
  rules,
  conflicts,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
}) => {
  const sensorDevices = devices.filter((d) => d.type === 'sensor');
  const controllableDevices = devices.filter((d) => d.type !== 'sensor');

  const editorStyle: React.CSSProperties = {
    width: 320,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    minHeight: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const titleStyle: React.CSSProperties = {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    marginBottom: 4,
  };

  const warningStyle: React.CSSProperties = {
    backgroundColor: '#f97316',
    color: '#ffffff',
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
  };

  const ruleItemStyle: React.CSSProperties = {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const ruleRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  };

  const selectStyle: React.CSSProperties = {
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #475569',
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    fontSize: 12,
    outline: 'none',
    cursor: 'pointer',
    flex: 1,
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #475569',
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    fontSize: 12,
    outline: 'none',
    width: 50,
  };

  const deleteButtonStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const addButtonStyle: React.CSSProperties = {
    padding: '10px 16px',
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    transition: 'transform 0.15s ease',
  };

  const labelStyle: React.CSSProperties = {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 500,
    minWidth: 44,
  };

  const getAvailableActions = (device: Device | undefined): ActionType[] => {
    if (!device) return [];
    switch (device.type) {
      case 'light':
        return ['on', 'off'];
      case 'ac':
        return ['on', 'off', 'set_value'];
      case 'curtain':
        return ['on', 'off', 'set_value'];
      default:
        return [];
    }
  };

  return (
    <div style={editorStyle}>
      <h2 style={titleStyle}>📋 自动化规则</h2>

      {conflicts.length > 0 && (
        <div style={warningStyle}>
          ⚠️ 规则冲突检测：目标设备 {conflicts.join('、')} 存在条件互斥
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: 4 }}>
        {rules.map((rule) => {
          const triggerDevice = sensorDevices.find((d) => d.id === rule.triggerDeviceId);
          const targetDevice = controllableDevices.find((d) => d.id === rule.targetDeviceId);
          const availableActions = getAvailableActions(targetDevice);

          return (
            <div key={rule.id} style={ruleItemStyle}>
              <div style={ruleRowStyle}>
                <span style={labelStyle}>触发:</span>
                <select
                  style={selectStyle}
                  value={rule.triggerDeviceId}
                  onChange={(e) => onUpdateRule(rule.id, { triggerDeviceId: e.target.value })}
                >
                  <option value="">选择传感器</option>
                  {sensorDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={ruleRowStyle}>
                <span style={labelStyle}>条件:</span>
                <select
                  style={{ ...selectStyle, flex: 'none', width: 50 }}
                  value={rule.comparator}
                  onChange={(e) => onUpdateRule(rule.id, { comparator: e.target.value as Comparator })}
                >
                  <option value=">">{'>'}</option>
                  <option value="<">{'<'}</option>
                  <option value="==">{'=='}</option>
                </select>
                <input
                  type="number"
                  style={inputStyle}
                  value={rule.threshold}
                  onChange={(e) => onUpdateRule(rule.id, { threshold: Number(e.target.value) })}
                />
                {triggerDevice && (
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>
                    {getSensorValueLabel(triggerDevice.sensorType)}
                  </span>
                )}
              </div>

              <div style={ruleRowStyle}>
                <span style={labelStyle}>目标:</span>
                <select
                  style={selectStyle}
                  value={rule.targetDeviceId}
                  onChange={(e) => onUpdateRule(rule.id, { targetDeviceId: e.target.value })}
                >
                  <option value="">选择设备</option>
                  {controllableDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={ruleRowStyle}>
                <span style={labelStyle}>动作:</span>
                <select
                  style={selectStyle}
                  value={rule.action}
                  onChange={(e) => onUpdateRule(rule.id, { action: e.target.value as ActionType })}
                >
                  {availableActions.map((a) => (
                    <option key={a} value={a}>
                      {getActionLabel(a)}
                    </option>
                  ))}
                </select>
                {rule.action === 'set_value' && (
                  <input
                    type="number"
                    style={inputStyle}
                    value={rule.actionValue ?? 0}
                    onChange={(e) => onUpdateRule(rule.id, { actionValue: Number(e.target.value) })}
                  />
                )}
                <button
                  style={deleteButtonStyle}
                  onClick={() => onDeleteRule(rule.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc2626';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ef4444';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        style={addButtonStyle}
        onClick={onAddRule}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        ＋ 添加规则
      </button>
    </div>
  );
};
