import React, { useMemo } from 'react';
import type { Column, DataRow, FilterConfig } from '../types';

interface DataPanelProps {
  columns: Column[];
  previewData: DataRow[];
  filterConfig: FilterConfig;
  onFilterChange: (config: FilterConfig) => void;
}

const TypeIcon: React.FC<{ type: Column['type'] }> = ({ type }) => {
  const config = {
    number: {
      symbol: '#',
      bg: '#EFF6FF',
      color: '#3B82F6',
      label: '数字',
    },
    string: {
      symbol: 'T',
      bg: '#F0FDF4',
      color: '#10B981',
      label: '文本',
    },
    date: {
      symbol: '📅',
      bg: '#FFFBEB',
      color: '#F59E0B',
      label: '日期',
    },
  };

  const c = config[type];

  return (
    <span
      title={c.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        borderRadius: '4px',
        background: c.bg,
        color: c.color,
        fontSize: type === 'date' ? '11px' : '12px',
        fontWeight: 700,
        fontFamily: type === 'date' ? 'inherit' : 'Inter, monospace',
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {c.symbol}
    </span>
  );
};

const getColumnRole = (
  colName: string,
  filterConfig: FilterConfig,
): 'xAxis' | 'yAxis' | 'colorBy' | null => {
  if (filterConfig.xAxis === colName) return 'xAxis';
  if (filterConfig.yAxis.includes(colName)) return 'yAxis';
  if (filterConfig.colorBy === colName) return 'colorBy';
  return null;
};

const roleColors: Record<string, { bar: string; bg: string; badge: string; badgeText: string }> = {
  xAxis: { bar: '#3B82F6', bg: '#EFF6FF', badge: '#3B82F6', badgeText: '#FFFFFF' },
  yAxis: { bar: '#10B981', bg: '#ECFDF5', badge: '#10B981', badgeText: '#FFFFFF' },
  colorBy: { bar: '#F59E0B', bg: '#FFFBEB', badge: '#F59E0B', badgeText: '#FFFFFF' },
};

const roleLabels: Record<string, string> = {
  xAxis: 'X轴',
  yAxis: 'Y轴',
  colorBy: '颜色',
};

const DataPanel: React.FC<DataPanelProps> = ({
  columns,
  previewData,
  filterConfig,
  onFilterChange,
}) => {
  const handleToggleXAxis = (colName: string) => {
    onFilterChange({
      ...filterConfig,
      xAxis: filterConfig.xAxis === colName ? null : colName,
    });
  };

  const handleToggleYAxis = (colName: string) => {
    const current = filterConfig.yAxis;
    if (current.includes(colName)) {
      onFilterChange({
        ...filterConfig,
        yAxis: current.filter((c) => c !== colName),
      });
    } else {
      onFilterChange({
        ...filterConfig,
        yAxis: [...current, colName],
      });
    }
  };

  const handleToggleColorBy = (colName: string) => {
    onFilterChange({
      ...filterConfig,
      colorBy: filterConfig.colorBy === colName ? null : colName,
    });
  };

  const previewColumns = useMemo(() => columns.slice(0, 8), [columns]);

  return (
    <div
      style={{
        width: '280px',
        minWidth: '280px',
        background: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#1F2937',
            marginBottom: '4px',
          }}
        >
          数据面板
        </div>
        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
          {columns.length} 列 · {previewData.length} 行
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 0',
        }}
      >
        <div
          style={{
            padding: '0 16px 8px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          列配置
        </div>

        {columns.map((col) => {
          const role = getColumnRole(col.name, filterConfig);
          const rc = role ? roleColors[role] : null;

          return (
            <div
              key={col.name}
              style={{
                padding: '8px 16px',
                position: 'relative',
                background: rc ? rc.bg : 'transparent',
                borderLeft: rc ? `3px solid ${rc.bar}` : '3px solid transparent',
                transition: 'all 0.2s ease',
                cursor: 'default',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                }}
              >
                <TypeIcon type={col.type} />
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1F2937',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={col.name}
                >
                  {col.name}
                </span>
                {role && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: rc!.badge,
                      color: rc!.badgeText,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {roleLabels[role]}
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: '#9CA3AF',
                  marginBottom: '6px',
                  paddingLeft: '30px',
                }}
              >
                {col.type === 'number' && col.min != null && col.max != null
                  ? `${col.min} ~ ${col.max}`
                  : `${col.uniqueValues} 个唯一值`}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  paddingLeft: '30px',
                }}
              >
                <RoleCheckbox
                  label="X"
                  checked={filterConfig.xAxis === col.name}
                  onChange={() => handleToggleXAxis(col.name)}
                  color="#3B82F6"
                  disabled={filterConfig.xAxis != null && filterConfig.xAxis !== col.name}
                />
                <RoleCheckbox
                  label="Y"
                  checked={filterConfig.yAxis.includes(col.name)}
                  onChange={() => handleToggleYAxis(col.name)}
                  color="#10B981"
                />
                {col.type === 'string' && (
                  <RoleCheckbox
                    label="色"
                    checked={filterConfig.colorBy === col.name}
                    onChange={() => handleToggleColorBy(col.name)}
                    color="#F59E0B"
                    disabled={filterConfig.colorBy != null && filterConfig.colorBy !== col.name}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {previewData.length > 0 && (
        <div
          style={{
            borderTop: '1px solid #E5E7EB',
            maxHeight: '240px',
            overflow: 'auto',
          }}
        >
          <div
            style={{
              padding: '10px 16px 6px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              position: 'sticky',
              top: 0,
              background: '#FFFFFF',
              zIndex: 1,
            }}
          >
            数据预览
          </div>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
            }}
          >
            <thead>
              <tr>
                {previewColumns.map((col) => (
                  <th
                    key={col.name}
                    style={{
                      padding: '6px 8px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#374151',
                      background: '#F3F4F6',
                      borderBottom: '1px solid #E5E7EB',
                      position: 'sticky',
                      top: '28px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '80px',
                    }}
                    title={col.name}
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.slice(0, 5).map((row, ri) => (
                <tr
                  key={ri}
                  style={{
                    background: ri % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                  }}
                >
                  {previewColumns.map((col) => (
                    <td
                      key={col.name}
                      style={{
                        padding: '5px 8px',
                        color: '#6B7280',
                        borderBottom: '1px solid #F3F4F6',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '80px',
                      }}
                      title={String(row[col.name] ?? '')}
                    >
                      {String(row[col.name] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface RoleCheckboxProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  color: string;
  disabled?: boolean;
}

const RoleCheckbox: React.FC<RoleCheckboxProps> = ({
  label,
  checked,
  onChange,
  color,
  disabled,
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onChange();
    }}
    disabled={disabled}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '26px',
      height: '20px',
      borderRadius: '4px',
      border: checked ? 'none' : '1px solid #D1D5DB',
      background: checked ? color : '#FFFFFF',
      color: checked ? '#FFFFFF' : '#9CA3AF',
      fontSize: '10px',
      fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'all 0.2s ease',
      padding: 0,
      lineHeight: 1,
    }}
  >
    {label}
  </button>
);

export default React.memo(DataPanel);
