import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Device, Rule, LogEntry, Comparator, ActionType } from './types';
import {
  getAllDevices,
  getAllRules,
  addDevice,
  updateDevice,
  reorderDevices,
  addRule,
  updateRule,
  deleteRule,
  detectRuleConflicts,
  evaluateCondition,
  generateRandomSensorValues,
  executeRuleAction,
  getSensorValueLabel,
} from './dataStore';
import { RoomPanel } from './RoomPanel';
import { RuleEditor } from './RuleEditor';

export const App: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const simulationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setDevices(getAllDevices());
    setRules(getAllRules());
  }, []);

  useEffect(() => {
    setConflicts(detectRuleConflicts(rules));
  }, [rules]);

  const refreshDevices = useCallback(() => {
    setDevices([...getAllDevices()]);
  }, []);

  const refreshRules = useCallback(() => {
    setRules([...getAllRules()]);
  }, []);

  const handleDeviceSelect = useCallback((device: Device) => {
    setSelectedDeviceId(device.id);
  }, []);

  const handleDeviceMove = useCallback((fromIndex: number, toIndex: number) => {
    reorderDevices(fromIndex, toIndex);
    refreshDevices();
  }, [refreshDevices]);

  const handleDeviceUpdate = useCallback((device: Device) => {
    updateDevice(device.id, device);
    refreshDevices();
  }, [refreshDevices]);

  const handleAddDevice = useCallback(
    (deviceData: Omit<Device, 'id' | 'positionIndex'>) => {
      addDevice(deviceData);
      refreshDevices();
    },
    [refreshDevices]
  );

  const handleAddRule = useCallback(() => {
    const sensorDevices = getAllDevices().filter((d) => d.type === 'sensor');
    const controllableDevices = getAllDevices().filter((d) => d.type !== 'sensor');

    addRule({
      triggerDeviceId: sensorDevices.length > 0 ? sensorDevices[0].id : '',
      comparator: '>' as Comparator,
      threshold: 30,
      targetDeviceId: controllableDevices.length > 0 ? controllableDevices[0].id : '',
      action: 'on' as ActionType,
      actionValue: 0,
    });
    refreshRules();
  }, [refreshRules]);

  const handleUpdateRule = useCallback(
    (id: string, updates: Partial<Rule>) => {
      updateRule(id, updates);
      refreshRules();
    },
    [refreshRules]
  );

  const handleDeleteRule = useCallback(
    (id: string) => {
      deleteRule(id);
      refreshRules();
    },
    [refreshRules]
  );

  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    setLogs((prev) => {
      const updated = [newLog, ...prev];
      return updated.slice(0, 5);
    });

    window.setTimeout(() => {
      setLogs((prev) => prev.filter((l) => l.id !== newLog.id));
    }, 8000);
  }, []);

  const runSimulationStep = useCallback(() => {
    const start = performance.now();

    generateRandomSensorValues();
    const currentDevices = getAllDevices();
    setDevices([...currentDevices]);

    const currentRules = getAllRules();
    const deviceMap = new Map(currentDevices.map((d) => [d.id, d]));

    currentRules.forEach((rule) => {
      if (!rule.triggerDeviceId || !rule.targetDeviceId) return;

      const triggerDevice = deviceMap.get(rule.triggerDeviceId);
      if (!triggerDevice || triggerDevice.type !== 'sensor') return;

      const targetDevice = deviceMap.get(rule.targetDeviceId);
      if (!targetDevice) return;

      if (evaluateCondition(triggerDevice.value, rule.comparator, rule.threshold)) {
        const result = executeRuleAction(rule);
        if (result) {
          const unit = getSensorValueLabel(triggerDevice.sensorType);
          addLog({
            deviceName: result.deviceName,
            action: result.action,
            reason: `${triggerDevice.name} ${rule.comparator} ${rule.threshold}${unit}`,
          });
        }
      }
    });

    const elapsed = performance.now() - start;
    if (elapsed > 30) {
      console.warn(`Simulation step took ${elapsed.toFixed(2)}ms, exceeding 30ms target`);
    }

    refreshDevices();
  }, [addLog, refreshDevices]);

  const toggleSimulation = useCallback(() => {
    if (isSimulating) {
      if (simulationTimerRef.current !== null) {
        window.clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      setIsSimulating(false);
    } else {
      runSimulationStep();
      simulationTimerRef.current = window.setInterval(runSimulationStep, 2000);
      setIsSimulating(true);
    }
  }, [isSimulating, runSimulationStep]);

  useEffect(() => {
    return () => {
      if (simulationTimerRef.current !== null) {
        window.clearInterval(simulationTimerRef.current);
      }
    };
  }, []);

  const appContainerStyle: React.CSSProperties = {
    backgroundColor: '#0f172a',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    position: 'relative',
  };

  const simulateButtonStyle: React.CSSProperties = {
    position: 'fixed',
    top: 20,
    right: 360,
    padding: '12px 24px',
    borderRadius: 12,
    backgroundColor: isSimulating ? '#ef4444' : '#22c55e',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'transform 0.15s ease',
  };

  const logBarStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 320,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.8)',
    color: '#ffffff',
    padding: '8px 24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: 2,
    overflow: 'hidden',
    zIndex: 50,
  };

  const logItemStyle: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.9,
    animation: 'fadeIn 0.3s ease',
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={appContainerStyle}>
        <button
          style={simulateButtonStyle}
          onClick={toggleSimulation}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {isSimulating ? '⏹ 停止模拟' : '▶ 运行模拟'}
        </button>

        <RoomPanel
          devices={devices}
          rules={rules}
          selectedDeviceId={selectedDeviceId}
          onDeviceSelect={handleDeviceSelect}
          onDeviceMove={handleDeviceMove}
          onDeviceUpdate={handleDeviceUpdate}
          onAddDevice={handleAddDevice}
        />

        <RuleEditor
          devices={devices}
          rules={rules}
          conflicts={conflicts}
          onAddRule={handleAddRule}
          onUpdateRule={handleUpdateRule}
          onDeleteRule={handleDeleteRule}
        />

        {logs.length > 0 && (
          <div style={logBarStyle}>
            {[...logs].reverse().map((log) => (
              <div key={log.id} style={logItemStyle}>
                [{log.deviceName}] 执行 {log.action} (原因：{log.reason} 满足)
              </div>
            ))}
          </div>
        )}

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    </DndProvider>
  );
};
