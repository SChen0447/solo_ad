import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from './store/useAppStore';
import Chart from './components/Chart';
import Panel from './components/Panel';
import { parseCSVFile, buildDataPoints } from './modules/loader';
import {
  computeStatistics, detectAnomalies,
  computeManualAnomalies, exportAnomaliesCSV, triggerDownload
} from './modules/processor';
import type { ChartType, AnomalyAlgorithm, ColumnInfo } from './types';

const App: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    rawData, columns, dataPoints,
    xColumn, yColumn,
    manualAnomalies, autoAnomalies, anomalyRecords,
    statistics, chartType,
    algorithm, zThreshold, iqrThreshold,
    isPanelOpen,
    setRawData, setXColumn, setYColumn,
    setChartType, setAlgorithm, setZThreshold, setIqrThreshold,
    setDataPoints, setStatistics, setAutoAnomalies,
    addManualAnomalies, removeAnomaly, resetAll, togglePanel
  } = useAppStore();

  const numericColumns: ColumnInfo[] = useMemo(
    () => columns.filter(c => c.numeric), [columns]
  );

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { data, columns: cols } = await parseCSVFile(file);
      setRawData(data, cols);
    } catch (err) {
      alert((err as Error).message);
    }
    if (fileRef.current) fileRef.current.value = '';
  }, [setRawData]);

  const refreshProcessing = useCallback(() => {
    if (!yColumn || rawData.length === 0) {
      setDataPoints([]);
      setStatistics(null);
      setAutoAnomalies(new Set(), []);
      return;
    }
    const points = buildDataPoints(rawData, yColumn, xColumn);
    setDataPoints(points);
    if (points.length === 0) {
      setStatistics(null);
      setAutoAnomalies(new Set(), []);
      return;
    }
    const stats = computeStatistics(points, zThreshold, iqrThreshold);
    const { indices, records } = detectAnomalies(points, stats, algorithm);
    stats.anomalyCount = manualAnomalies.size + indices.size;
    stats.anomalyRatio = stats.totalCount > 0 ? stats.anomalyCount / stats.totalCount : 0;
    setStatistics(stats);
    setAutoAnomalies(indices, records);
  }, [rawData, xColumn, yColumn, algorithm, zThreshold, iqrThreshold,
      manualAnomalies, setDataPoints, setStatistics, setAutoAnomalies]);

  useEffect(() => {
    refreshProcessing();
  }, [refreshProcessing]);

  const handleBoxSelect = useCallback((indices: number[]) => {
    if (!statistics) return;
    const records = computeManualAnomalies(dataPoints, indices, statistics, algorithm);
    addManualAnomalies(indices, records);
  }, [dataPoints, statistics, algorithm, addManualAnomalies]);

  const handleExport = useCallback(() => {
    const sorted = [...anomalyRecords].sort((a, b) => a.rowIndex - b.rowIndex);
    const csv = exportAnomaliesCSV(sorted);
    triggerDownload(csv, `anomalies_${Date.now()}.csv`);
  }, [anomalyRecords]);

  const handleReset = useCallback(() => {
    resetAll();
    if (statistics && dataPoints.length > 0) {
      const { indices, records } = detectAnomalies(dataPoints, statistics, algorithm);
      setAutoAnomalies(indices, records);
    }
  }, [resetAll, statistics, dataPoints, algorithm, setAutoAnomalies]);

  const xAxisLabel = xColumn || '行索引';
  const yAxisLabel = yColumn || '—';

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-left">
          <div className="app-title">
            <span className="app-logo">◆</span>
            <span>数据异常值探索面板</span>
          </div>
          <input
            ref={fileRef}
            type="file" accept=".csv"
            className="file-input"
            onChange={handleFileChange}
            hidden
          />
          <button className="upload-btn" onClick={() => fileRef.current?.click()}>
            <span>⬆</span> 上传 CSV
          </button>
          <div className="selector-group">
            <select
              className="col-select"
              value={yColumn ?? ''}
              onChange={e => setYColumn(e.target.value || null)}
              disabled={numericColumns.length === 0}
            >
              <option value="">选择 Y 轴列</option>
              {numericColumns.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              className="col-select"
              value={xColumn ?? ''}
              onChange={e => setXColumn(e.target.value || null)}
              disabled={numericColumns.length === 0}
            >
              <option value="">X 轴（默认行索引）</option>
              {numericColumns.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="toolbar-right">
          <div className="chart-type-group">
            {(['scatter', 'line', 'box'] as ChartType[]).map(t => (
              <button
                key={t}
                className={`chart-type-btn ${chartType === t ? 'chart-type-btn-active' : ''}`}
                onClick={() => setChartType(t)}
                title={t === 'scatter' ? '散点图' : t === 'line' ? '折线图' : '箱线图'}
              >
                {t === 'scatter' ? '◉ 散点' : t === 'line' ? '／ 折线' : '▤ 箱线'}
              </button>
            ))}
          </div>
          <div className="data-count">
            {dataPoints.length > 0 ? (
              <span>数据点: <strong>{dataPoints.length}</strong></span>
            ) : columns.length > 0 ? (
              <span>已加载: <strong>{rawData.length}</strong> 行</span>
            ) : (
              <span className="dim">未加载数据</span>
            )}
          </div>
        </div>
      </header>

      <main className="main-layout">
        <section className="chart-area">
          <Chart
            data={dataPoints}
            chartType={chartType}
            manualAnomalies={manualAnomalies}
            autoAnomalies={autoAnomalies}
            xLabel={xAxisLabel}
            yLabel={yAxisLabel}
            onBoxSelect={handleBoxSelect}
          />
        </section>
        <Panel
          statistics={statistics}
          anomalyRecords={anomalyRecords}
          algorithm={algorithm as AnomalyAlgorithm}
          zThreshold={zThreshold}
          iqrThreshold={iqrThreshold}
          onAlgorithmChange={setAlgorithm}
          onZThresholdChange={setZThreshold}
          onIqrThresholdChange={setIqrThreshold}
          onRemoveAnomaly={removeAnomaly}
          onExport={handleExport}
          onReset={handleReset}
          isOpen={isPanelOpen}
          onToggle={togglePanel}
        />
      </main>
    </div>
  );
};

export default App;
