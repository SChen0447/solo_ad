import { useState, useEffect, useCallback } from 'react';
import CodeInput from './codeInput';
import TestPreview from './testPreview';
import HistoryPanel from './historyPanel';
import type { HistoryItem, FunctionMeta } from './types';

function App() {
  const [code, setCode] = useState<string>('');
  const [testCode, setTestCode] = useState<string>('');
  const [currentFunctions, setCurrentFunctions] = useState<FunctionMeta[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('加载历史记录失败:', err);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleGenerate = useCallback(async (sourceCode: string, fnMeta: FunctionMeta[], generatedTest: string) => {
    setCode(sourceCode);
    setTestCode(generatedTest);
    setCurrentFunctions(fnMeta);
    await loadHistory();
  }, [loadHistory]);

  const handleLoadHistory = useCallback((item: HistoryItem) => {
    setCode(item.code);
    setTestCode(item.testCode);
    setCurrentFunctions(item.functions || []);
  }, []);

  const handleTestCodeChange = useCallback((newCode: string) => {
    setTestCode(newCode);
  }, []);

  return (
    <div className="app-container">
      <div className="top-nav">
        <h1>🧪 单元测试用例自动生成器</h1>
      </div>
      <div className="main-content">
        <CodeInput
          initialCode={code}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
        />
        <TestPreview
          testCode={testCode}
          functions={currentFunctions}
          onTestCodeChange={handleTestCodeChange}
        />
      </div>
      <HistoryPanel
        history={history}
        onLoadHistory={handleLoadHistory}
      />
    </div>
  );
}

export default App;
