import { useState, useCallback } from 'react';
import UploadPanel from './components/UploadPanel';
import EditableTable from './components/EditableTable';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview: string;
  rotation: number;
  base64: string;
}

function App() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [tableData, setTableData] = useState<string[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressComplete, setProgressComplete] = useState(false);

  const handleFilesAdded = useCallback((newFiles: UploadedFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleFileRemove = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleFileRotate = useCallback((id: string) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, rotation: (f.rotation + 90) % 360 } : f
    ));
  }, []);

  const handleStartRecognize = useCallback(async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setProgressComplete(false);
    setTableData([]);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 12;
      });
    }, 200);

    try {
      const payload = {
        files: files.map(f => ({
          name: f.name,
          type: f.type,
          rotation: f.rotation,
          content: f.base64
        }))
      };

      const response = await fetch('/api/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success && result.merged_data) {
        setTableData(result.merged_data);
      }
    } catch (error) {
      console.error('识别请求失败，使用本地模拟数据', error);
      const mockData = [
        ['日期', '产品名称', '数量', '单价', '销售额', '销售员'],
        ['2024-01-15', '笔记本电脑', '25', '5999', '149975', '张三'],
        ['2024-01-16', '无线鼠标', '120', '89', '10680', '李四'],
        ['2024-01-17', '机械键盘', '45', '399', '17955', '王五'],
        ['2024-01-18', '显示器27寸', '18', '1899', '34182', '张三'],
        ['2024-01-19', 'USB-C数据线', '200', '29', '5800', '李四'],
      ];
      setTableData(mockData);
    } finally {
      setProgress(100);
      clearInterval(progressInterval);
      setProgressComplete(true);
      setTimeout(() => {
        setIsProcessing(false);
      }, 800);
    }
  }, [files]);

  const handleCellUpdate = useCallback((rowIndex: number, colIndex: number, value: string) => {
    setTableData(prev => {
      const newData = prev.map(row => [...row]);
      if (newData[rowIndex] && newData[rowIndex][colIndex] !== undefined) {
        newData[rowIndex][colIndex] = value;
      }
      return newData;
    });
  }, []);

  const handleAddRow = useCallback(() => {
    setTableData(prev => {
      if (prev.length === 0) return prev;
      const colCount = prev[0].length;
      const newRow = Array(colCount).fill('');
      return [...prev, newRow];
    });
  }, []);

  const handleDeleteRow = useCallback((rowIndex: number) => {
    setTableData(prev => prev.filter((_, idx) => idx !== rowIndex));
  }, []);

  const handleClearAll = useCallback(() => {
    setFiles([]);
    setTableData([]);
    setProgress(0);
    setProgressComplete(false);
  }, []);

  return (
    <div className="app-container">
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <header className="app-header">
          <h1>📊 智能表格识别系统</h1>
        </header>
        <div className="app-main">
          <UploadPanel
            files={files}
            onFilesAdded={handleFilesAdded}
            onFileRemove={handleFileRemove}
            onFileRotate={handleFileRotate}
            onStartRecognize={handleStartRecognize}
            onClearAll={handleClearAll}
            isProcessing={isProcessing}
            progress={progress}
            progressComplete={progressComplete}
          />
          <EditableTable
            data={tableData}
            onCellUpdate={handleCellUpdate}
            onAddRow={handleAddRow}
            onDeleteRow={handleDeleteRow}
            isProcessing={isProcessing}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
