import { GridConfig } from '../utils/gridUtils';

interface ControlPanelProps {
  config: GridConfig;
  onChange: (config: Partial<GridConfig>) => void;
  onSaveTemplate: () => void;
}

export default function ControlPanel({ config, onChange, onSaveTemplate }: ControlPanelProps) {
  const sliderStyle = {
    width: '100%' as const
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px'
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#c0c0e0'
  };

  const valueBadgeStyle: React.CSSProperties = {
    backgroundColor: '#1e1e2e',
    padding: '3px 10px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#4fc3f7',
    fontWeight: 600
  };

  return (
    <div style={{
      backgroundColor: '#282840',
      borderRadius: '8px',
      padding: '20px',
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h2 style={{
        fontSize: '16px',
        fontWeight: 600,
        color: '#e0e0e0',
        marginBottom: '24px',
        paddingBottom: '12px',
        borderBottom: '1px solid #3a3a5a',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '20px' }}>⚙️</span>
        网格参数设置
      </h2>

      <div style={sectionStyle}>
        <div style={labelStyle}>
          <span>列数</span>
          <span style={valueBadgeStyle}>{config.columns} 列</span>
        </div>
        <input
          type="range"
          min="2"
          max="12"
          step="1"
          value={config.columns}
          onChange={e => onChange({ columns: parseInt(e.target.value) })}
          style={sliderStyle}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '11px',
          color: '#6a6a8a'
        }}>
          <span>2</span>
          <span>12</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>
          <span>行数</span>
          <span style={valueBadgeStyle}>{config.rows} 行</span>
        </div>
        <input
          type="range"
          min="1"
          max="12"
          step="1"
          value={config.rows}
          onChange={e => onChange({ rows: parseInt(e.target.value) })}
          style={sliderStyle}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '11px',
          color: '#6a6a8a'
        }}>
          <span>1</span>
          <span>12</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>
          <span>行高</span>
          <span style={valueBadgeStyle}>{config.rowHeight}px</span>
        </div>
        <input
          type="range"
          min="50"
          max="200"
          step="10"
          value={config.rowHeight}
          onChange={e => onChange({ rowHeight: parseInt(e.target.value) })}
          style={sliderStyle}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '11px',
          color: '#6a6a8a'
        }}>
          <span>50px</span>
          <span>200px</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>
          <span>列间距</span>
          <span style={valueBadgeStyle}>{config.columnGap}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="40"
          step="4"
          value={config.columnGap}
          onChange={e => onChange({ columnGap: parseInt(e.target.value) })}
          style={sliderStyle}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '11px',
          color: '#6a6a8a'
        }}>
          <span>0px</span>
          <span>40px</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>
          <span>行间距</span>
          <span style={valueBadgeStyle}>{config.rowGap}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="40"
          step="4"
          value={config.rowGap}
          onChange={e => onChange({ rowGap: parseInt(e.target.value) })}
          style={sliderStyle}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '11px',
          color: '#6a6a8a'
        }}>
          <span>0px</span>
          <span>40px</span>
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={onSaveTemplate}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#4fc3f7',
            color: '#1e1e2e',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease, transform 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#81d4fa';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#4fc3f7';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ fontSize: '16px' }}>💾</span>
          保存为模板
        </button>
      </div>
    </div>
  );
}
