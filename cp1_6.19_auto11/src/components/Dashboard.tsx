import React, { useState, useMemo } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import ChartPanel from './ChartPanel';
import Toolbar from './Toolbar';
import { useDashboardStore } from '../store/dashboardStore';
import { ChartType, ChartConfig } from '../hooks/useChartData';
import { detectColumnType } from '../utils/csvParser';

const ResponsiveGridLayout = WidthProvider(Responsive);

const Dashboard: React.FC = () => {
  const {
    data,
    charts,
    layout,
    fullscreenChartId,
    addChart,
    setLayout,
    openUploadModal
  } = useDashboardStore();

  const [selectedChartType, setSelectedChartType] = useState<ChartType>('line');
  const [selectedXField, setSelectedXField] = useState<string>('');
  const [selectedYField, setSelectedYField] = useState<string>('');

  const columnTypes = useMemo(() => {
    if (!data) return {};
    const types: Record<string, 'number' | 'string' | 'date'> = {};
    data.columns.forEach((col, index) => {
      const values = data.rows.map(row => row[index]).filter(v => v !== undefined && v !== null && v !== '');
      types[col] = detectColumnType(values);
    });
    return types;
  }, [data]);

  const numericFields = useMemo(() => {
    if (!data) return [];
    return data.columns.filter(col => columnTypes[col] === 'number');
  }, [data, columnTypes]);

  const categoricalFields = useMemo(() => {
    if (!data) return [];
    return data.columns.filter(col => columnTypes[col] !== 'number');
  }, [data, columnTypes]);

  const handleAddChart = () => {
    if (!data || !selectedXField || !selectedYField) return;

    const newChart: ChartConfig = {
      id: '',
      title: `${selectedYField} - ${selectedXField}`,
      type: selectedChartType,
      xField: selectedXField,
      yField: selectedYField
    };

    addChart(newChart);
  };

  const handleLayoutChange = (currentLayout: Layout[]) => {
    setLayout(currentLayout.map(l => ({
      i: l.i,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h
    })));
  };

  const fullscreenChart = charts.find(c => c.id === fullscreenChartId);

  return (
    <div className="dashboard-container">
      <Toolbar />

      <div className="dashboard-main">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">📊 添加图表</h3>

            {!data ? (
              <div className="empty-state">
                <p>请先上传CSV数据</p>
                <button className="btn btn-primary btn-block" onClick={openUploadModal}>
                  上传CSV
                </button>
              </div>
            ) : (
              <div className="chart-config">
                <div className="config-item">
                  <label className="config-label">图表类型</label>
                  <div className="chart-type-options">
                    {(['line', 'bar', 'pie'] as ChartType[]).map(type => (
                      <button
                        key={type}
                        className={`type-btn ${selectedChartType === type ? 'active' : ''}`}
                        onClick={() => setSelectedChartType(type)}
                      >
                        {type === 'line' && '📈 折线图'}
                        {type === 'bar' && '📊 柱状图'}
                        {type === 'pie' && '🥧 饼图'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="config-item">
                  <label className="config-label">X轴字段</label>
                  <select
                    className="config-select"
                    value={selectedXField}
                    onChange={(e) => setSelectedXField(e.target.value)}
                  >
                    <option value="">请选择</option>
                    {(selectedChartType === 'pie' ? data.columns : categoricalFields).map(col => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="config-item">
                  <label className="config-label">Y轴字段</label>
                  <select
                    className="config-select"
                    value={selectedYField}
                    onChange={(e) => setSelectedYField(e.target.value)}
                    disabled={selectedChartType === 'pie'}
                  >
                    <option value="">请选择</option>
                    {numericFields.map(col => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn-primary btn-block"
                  onClick={handleAddChart}
                  disabled={!selectedXField || (!selectedYField && selectedChartType !== 'pie')}
                >
                  + 添加图表
                </button>
              </div>
            )}
          </div>

          {data && (
            <div className="sidebar-section">
              <h3 className="sidebar-title">📋 数据字段</h3>
              <div className="field-list">
                {data.columns.map((col, index) => (
                  <div key={col} className="field-item">
                    <span className="field-name">{col}</span>
                    <span className={`field-type type-${columnTypes[col]}`}>
                      {columnTypes[col] === 'number' ? '数值' : columnTypes[col] === 'date' ? '日期' : '文本'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {charts.length > 0 && (
            <div className="sidebar-section">
              <h3 className="sidebar-title">📈 图表列表</h3>
              <div className="chart-list">
                {charts.map(chart => (
                  <div key={chart.id} className="chart-list-item">
                    <span className="chart-list-title">{chart.title}</span>
                    <span className="chart-list-type">{chart.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className="dashboard-content">
          {charts.length === 0 ? (
            <div className="empty-dashboard">
              <div className="empty-icon">📊</div>
              <h2>暂无图表</h2>
              <p>
                {data
                  ? '从左侧面板选择字段，点击"添加图表"开始可视化'
                  : '请先上传CSV数据文件以创建图表'}
              </p>
              {!data && (
                <button className="btn btn-primary" onClick={openUploadModal}>
                  上传CSV文件
                </button>
              )}
            </div>
          ) : (
            <div className="dashboard-grid">
              <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: layout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={100}
                margin={[16, 16]}
                containerPadding={[16, 16]}
                onLayoutChange={handleLayoutChange}
                draggableHandle=".chart-header"
                isDraggable={true}
                isResizable={true}
              >
                {charts.map(chart => (
                  <div key={chart.id} className="grid-item">
                    <ChartPanel config={chart} />
                  </div>
                ))}
              </ResponsiveGridLayout>
            </div>
          )}
        </main>
      </div>

      {fullscreenChart && (
        <ChartPanel config={fullscreenChart} isFullscreen={true} />
      )}

      <style>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #1e1e2e;
          color: #e0e0e0;
          font-family: Inter, sans-serif;
        }

        .dashboard-main {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        .sidebar {
          width: 260px;
          min-width: 260px;
          background: #252535;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          overflow-y: auto;
          padding: 20px 0;
        }

        .sidebar-section {
          padding: 0 16px 20px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 20px;
        }

        .sidebar-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .sidebar-title {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
          color: #e0e0e0;
        }

        .chart-config {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .config-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .config-label {
          font-size: 13px;
          color: #aaa;
        }

        .config-select {
          padding: 10px 12px;
          background: #1e1e2e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #e0e0e0;
          font-size: 14px;
          cursor: pointer;
          outline: none;
        }

        .config-select:focus {
          border-color: #4f46e5;
        }

        .config-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chart-type-options {
          display: flex;
          gap: 8px;
        }

        .type-btn {
          flex: 1;
          padding: 10px 6px;
          background: #1e1e2e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #e0e0e0;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .type-btn:hover {
          border-color: #4f46e5;
        }

        .type-btn.active {
          background: #4f46e5;
          border-color: #4f46e5;
        }

        .type-btn:active {
          transform: scale(0.95);
        }

        .btn {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: Inter, sans-serif;
        }

        .btn:active {
          transform: scale(0.95);
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4338ca;
        }

        .btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-block {
          width: 100%;
        }

        .field-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #1e1e2e;
          border-radius: 6px;
          font-size: 13px;
        }

        .field-name {
          color: #e0e0e0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 140px;
        }

        .field-type {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .type-number {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .type-string {
          background: rgba(6, 182, 212, 0.2);
          color: #06b6d4;
        }

        .type-date {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .chart-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chart-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #1e1e2e;
          border-radius: 6px;
          font-size: 13px;
        }

        .chart-list-title {
          color: #e0e0e0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 140px;
        }

        .chart-list-type {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
        }

        .dashboard-content {
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .dashboard-grid {
          width: 100%;
          height: 100%;
          overflow: auto;
        }

        .grid-item {
          opacity: 1;
          transition: opacity 0.2s ease;
        }

        .empty-state {
          text-align: center;
          padding: 20px 0;
        }

        .empty-state p {
          color: #888;
          margin: 0 0 16px 0;
          font-size: 14px;
        }

        .empty-dashboard {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: #888;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .empty-dashboard h2 {
          color: #e0e0e0;
          margin: 0 0 12px 0;
          font-size: 24px;
        }

        .empty-dashboard p {
          margin: 0 0 24px 0;
          font-size: 14px;
          max-width: 400px;
        }

        .react-grid-placeholder {
          background: transparent !important;
          border: 2px dashed #4f46e5 !important;
          border-radius: 12px !important;
        }

        .react-grid-item.react-grid-placeholder {
          background: transparent !important;
        }

        .react-grid-item.cssTransforms {
          transition-property: transform;
        }

        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
          opacity: 0.8;
        }

        .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          background: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2IDYiIHN0eWxlPSJiYWNrZ3JvdW5kOiNmZmYiPjxyZWN0IHdpZHRoPSI2IiBoZWlnaHQ9IjYiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNIDAgNCBMIDQgMCBNIDAgNiBMIDYgMCBNIDIgNiBMIDYgMiIgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=');
          background-position: bottom right;
          padding: 0 3px 3px 0;
          background-repeat: no-repeat;
          background-origin: content-box;
          box-sizing: border-box;
          cursor: se-resize;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
