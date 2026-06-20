import React, { useState } from 'react';
import { useSensorStore } from '../sensorDataModule/store.tsx';
import {
  AlertRule,
  SensorType,
  SENSOR_LABELS,
  SENSOR_UNITS,
  SENSOR_COLORS,
} from '../sensorDataModule/types';

interface RuleFormState {
  sensorType: SensorType;
  operator: '>' | '<';
  threshold: string;
}

const generateId = (): string => `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyForm: RuleFormState = {
  sensorType: 'temperature',
  operator: '>',
  threshold: '',
};

const AlertRuleEditor: React.FC = () => {
  const { state, addAlertRule, updateAlertRule, deleteAlertRule } = useSensorStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState<RuleFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<RuleFormState | null>(null);

  const handleAddRule = () => {
    const thresholdNum = parseFloat(newRule.threshold);
    if (isNaN(thresholdNum)) return;
    const rule: AlertRule = {
      id: generateId(),
      sensorType: newRule.sensorType,
      operator: newRule.operator,
      threshold: thresholdNum,
      enabled: true,
    };
    addAlertRule(rule);
    setNewRule(emptyForm);
    setShowAddForm(false);
  };

  const handleStartEdit = (rule: AlertRule) => {
    setEditingId(rule.id);
    setEditingRule({
      sensorType: rule.sensorType,
      operator: rule.operator,
      threshold: rule.threshold.toString(),
    });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingRule) return;
    const thresholdNum = parseFloat(editingRule.threshold);
    if (isNaN(thresholdNum)) return;
    const original = state.alertRules.find((r) => r.id === editingId);
    if (!original) return;
    updateAlertRule({
      ...original,
      sensorType: editingRule.sensorType,
      operator: editingRule.operator,
      threshold: thresholdNum,
    });
    setEditingId(null);
    setEditingRule(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingRule(null);
  };

  const handleToggleEnabled = (rule: AlertRule) => {
    updateAlertRule({ ...rule, enabled: !rule.enabled });
  };

  const sensorOptions: SensorType[] = ['temperature', 'humidity', 'pressure'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>警报规则</h3>
        <button
          onClick={() => setShowAddForm((prev) => !prev)}
          style={{
            ...styles.addButton,
            background: showAddForm ? '#0f3460' : '#e94560',
          }}
        >
          {showAddForm ? '取消' : '＋ 添加规则'}
        </button>
      </div>

      <div
        style={{
          ...styles.addForm,
          maxHeight: showAddForm ? '500px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.3s ease, margin-top 0.3s ease',
          opacity: showAddForm ? 1 : 0,
          marginTop: showAddForm ? '12px' : '0px',
        }}
      >
        <RuleForm
          formState={newRule}
          onChange={(fs) => setNewRule(fs)}
          sensorOptions={sensorOptions}
          onSubmit={handleAddRule}
          submitText="保存规则"
          showCancel={false}
          onCancel={() => {}}
        />
      </div>

      <div style={styles.ruleList}>
        {state.alertRules.length === 0 && (
          <div style={styles.empty}>暂无规则，点击上方按钮添加</div>
        )}
        {state.alertRules.map((rule) => (
          <div
            key={rule.id}
            style={{
              ...styles.ruleCard,
              borderColor: rule.enabled ? SENSOR_COLORS[rule.sensorType] + '50' : 'rgba(255,255,255,0.06)',
              opacity: rule.enabled ? 1 : 0.55,
              transition: 'all 0.3s ease',
            }}
          >
            <div style={styles.ruleHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <span
                  style={{
                    ...styles.ruleSensorTag,
                    backgroundColor: SENSOR_COLORS[rule.sensorType] + '20',
                    color: SENSOR_COLORS[rule.sensorType],
                  }}
                >
                  {SENSOR_LABELS[rule.sensorType]}
                </span>
                <span style={styles.ruleCondition}>
                  {rule.operator} {rule.threshold} {SENSOR_UNITS[rule.sensorType]}
                </span>
              </div>
              <div style={styles.ruleActions}>
                <button
                  onClick={() => handleToggleEnabled(rule)}
                  style={{
                    ...styles.toggleSwitch,
                    background: rule.enabled ? '#e94560' : '#333',
                  }}
                  title={rule.enabled ? '禁用' : '启用'}
                >
                  <span
                    style={{
                      ...styles.toggleKnob,
                      transform: rule.enabled ? 'translateX(20px)' : 'translateX(2px)',
                    }}
                  />
                </button>
                {editingId !== rule.id && (
                  <button onClick={() => handleStartEdit(rule)} style={styles.iconButton} title="编辑">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                        stroke="#b0b0b0"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                        stroke="#b0b0b0"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => deleteAlertRule(rule.id)}
                  style={{ ...styles.iconButton, color: '#e94560' }}
                  title="删除"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                      stroke="#e94560"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div
              style={{
                ...styles.editForm,
                maxHeight: editingId === rule.id ? '500px' : '0px',
                overflow: 'hidden',
                transition: 'max-height 0.3s ease, opacity 0.3s ease, margin-top 0.3s ease, padding-top 0.3s ease',
                opacity: editingId === rule.id ? 1 : 0,
                marginTop: editingId === rule.id ? '12px' : '0px',
                paddingTop: editingId === rule.id ? '12px' : '0px',
                borderTop: editingId === rule.id ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              {editingRule && editingId === rule.id && (
                <RuleForm
                  formState={editingRule}
                  onChange={(fs) => setEditingRule(fs)}
                  sensorOptions={sensorOptions}
                  onSubmit={handleSaveEdit}
                  submitText="保存修改"
                  showCancel={true}
                  onCancel={handleCancelEdit}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface RuleFormProps {
  formState: RuleFormState;
  onChange: (fs: RuleFormState) => void;
  sensorOptions: SensorType[];
  onSubmit: () => void;
  submitText: string;
  showCancel: boolean;
  onCancel: () => void;
}

const RuleForm: React.FC<RuleFormProps> = ({
  formState,
  onChange,
  sensorOptions,
  onSubmit,
  submitText,
  showCancel,
  onCancel,
}) => {
  return (
    <div style={styles.formBody}>
      <div style={styles.formRow}>
        <select
          value={formState.sensorType}
          onChange={(e) => onChange({ ...formState, sensorType: e.target.value as SensorType })}
          style={styles.select}
        >
          {sensorOptions.map((s) => (
            <option key={s} value={s}>
              {SENSOR_LABELS[s]} ({SENSOR_UNITS[s]})
            </option>
          ))}
        </select>
        <select
          value={formState.operator}
          onChange={(e) => onChange({ ...formState, operator: e.target.value as '>' | '<' })}
          style={{ ...styles.select, width: '80px' }}
        >
          <option value=">">大于 (＞)</option>
          <option value="<">小于 (＜)</option>
        </select>
        <input
          type="number"
          step="0.01"
          value={formState.threshold}
          onChange={(e) => onChange({ ...formState, threshold: e.target.value })}
          placeholder="阈值"
          style={styles.input}
        />
      </div>
      <div style={styles.formActions}>
        <button onClick={onSubmit} style={styles.saveButton}>
          {submitText}
        </button>
        {showCancel && (
          <button onClick={onCancel} style={styles.cancelButton}>
            取消
          </button>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#16213e',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    padding: '16px',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
  },
  addButton: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  addForm: {
    background: 'rgba(15, 52, 96, 0.3)',
    borderRadius: '10px',
    padding: '0 14px',
  },
  formBody: {
    padding: '12px 0',
  },
  formRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  select: {
    flex: 1,
    minWidth: '100px',
    padding: '8px 10px',
    borderRadius: '8px',
    background: '#0f3460',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '13px',
    outline: 'none',
  },
  input: {
    flex: 1,
    minWidth: '80px',
    padding: '8px 10px',
    borderRadius: '8px',
    background: '#0f3460',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '13px',
    outline: 'none',
  },
  formActions: {
    display: 'flex',
    gap: '8px',
  },
  saveButton: {
    padding: '7px 16px',
    borderRadius: '8px',
    background: '#e94560',
    color: '#fff',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cancelButton: {
    padding: '7px 16px',
    borderRadius: '8px',
    background: 'transparent',
    color: '#b0b0b0',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  ruleList: {
    marginTop: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '360px',
    overflowY: 'auto',
  },
  empty: {
    color: '#666',
    fontSize: '12px',
    textAlign: 'center',
    padding: '20px 0',
  },
  ruleCard: {
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '12px',
    transition: 'all 0.3s ease',
  },
  ruleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
  },
  ruleSensorTag: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
  },
  ruleCondition: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
  },
  ruleActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  toggleSwitch: {
    width: '40px',
    height: '20px',
    borderRadius: '10px',
    border: 'none',
    position: 'relative',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.3s ease',
  },
  toggleKnob: {
    display: 'block',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'transform 0.25s ease',
    position: 'absolute',
    top: '2px',
    left: '0',
  },
  iconButton: {
    background: 'transparent',
    border: 'none',
    padding: '6px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease',
  },
  editForm: {
    background: 'rgba(15, 52, 96, 0.25)',
    borderRadius: '8px',
    padding: '0 4px',
  },
};

export default AlertRuleEditor;
