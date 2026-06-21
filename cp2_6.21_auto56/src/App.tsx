import { useState, useEffect } from 'react';
import InputPanel from './components/InputPanel';
import WordCloudView from './components/WordCloudView';
import Timeline from './components/Timeline';
import { getCapsules, saveCapsule, generateWordCloud, type Capsule, type WordCloudData } from './api/timeline';

function App() {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [cloudData, setCloudData] = useState<WordCloudData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  useEffect(() => {
    loadCapsules();
  }, []);

  const loadCapsules = async () => {
    try {
      const data = await getCapsules();
      setCapsules(data);
    } catch (err) {
      console.error('加载时间胶囊失败:', err);
    }
  };

  const handleGenerate = async (text: string) => {
    setIsGenerating(true);
    setGenerateSuccess(false);
    try {
      const data = await generateWordCloud(text);
      setCloudData(data);
      setGenerateSuccess(true);
      setTimeout(() => setGenerateSuccess(false), 500);
    } catch (err) {
      console.error('生成词云失败:', err);
    } finally {
      setTimeout(() => setIsGenerating(false), 300);
    }
  };

  const handleSave = async (text: string, tags: string[], imageDataUrl: string) => {
    try {
      const newCapsule = await saveCapsule({
        text,
        tags,
        imageDataUrl,
        timestamp: new Date().toISOString(),
      });
      setCapsules(prev => [newCapsule, ...prev]);
      setCloudData(null);
    } catch (err) {
      console.error('保存胶囊失败:', err);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">词云时间胶囊</h1>
        <p className="app-subtitle">记录此刻的心情，未来的你会感谢现在的自己</p>
      </header>

      <div className="main-content">
        <section className="input-section">
          <InputPanel
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            canSave={!!cloudData}
            onSave={handleSave}
            cloudData={cloudData}
          />
        </section>

        <section className="preview-section">
          <WordCloudView
            cloudData={cloudData}
            isLoading={isGenerating}
            showSuccess={generateSuccess}
          />
        </section>
      </div>

      <section className="timeline-section">
        <Timeline capsules={capsules} />
      </section>
    </div>
  );
}

export default App;
