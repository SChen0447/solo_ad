import React, { useState, useEffect, useRef, useCallback } from 'react';
import DataTable from './components/DataTable';
import FilterPanel from './components/FilterPanel';
import { getMockData, type DataType, type FilterConfig } from './utils/MockDataProvider';
import { exportToCSV, exportToPdf } from './utils/ExportUtils';

const App: React.FC = () => {
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [immediateFilters, setImmediateFilters] = useState<FilterConfig>({
    keyword: '',
    status: 'all',
    dateStart: '',
    dateEnd: ''
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterConfig>({
    keyword: '',
    status: 'all',
    dateStart: '',
    dateEnd: ''
  });
  const [exportingCSV, setExportingCSV] = useState<boolean>(false);
  const [exportingPDF, setExportingPDF] = useState<boolean>(false);

  const debounceTimerRef = useRef<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mockData = await getMockData();
      setData(mockData);
    } catch (err) {
      setError('数据加载失败');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (newFilters: FilterConfig) => {
    setImmediateFilters(newFilters);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      setAppliedFilters(newFilters);
    }, 300);
  };

  const handleCellEdit = (id: number, field: keyof DataType, value: string) => {
    const startTime = performance.now();

    setData(prevData =>
      prevData.map(item => {
        if (item.id === id) {
          const updated = { ...item };
          if (field === 'id') {
            updated[field] = parseInt(value, 10) as number & DataType[keyof DataType];
          } else {
            updated[field] = value as DataType[keyof DataType];
          }
          return updated;
        }
        return item;
      })
    );

    const endTime = performance.now();
    if (endTime - startTime > 10) {
      console.warn(`编辑保存耗时: ${(endTime - startTime).toFixed(2)}ms`);
    }
  };

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      exportToCSV(data);
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      exportToPdf(data);
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">数据表格管理面板</h1>
          <div className="export-buttons">
            <button
              className="btn btn-csv"
              onClick={handleExportCSV}
              disabled={exportingCSV || exportingPDF || loading}
            >
              {exportingCSV ? '导出中...' : '导出CSV'}
            </button>
            <button
              className="btn btn-pdf"
              onClick={handleExportPDF}
              disabled={exportingCSV || exportingPDF || loading}
            >
              {exportingPDF ? '导出中...' : '导出PDF'}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {loading ? (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div className="error-state">
            <p className="error-message">{error}</p>
            <button className="btn btn-retry" onClick={loadData}>
              重试
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="error-state">
            <p className="error-message">暂无数据，请稍后重试</p>
            <button className="btn btn-retry" onClick={loadData}>
              重试
            </button>
          </div>
        ) : (
          <>
            <FilterPanel filters={immediateFilters} onFilterChange={handleFilterChange} />
            <DataTable
              data={data}
              filters={appliedFilters}
              onCellEdit={handleCellEdit}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default App;
