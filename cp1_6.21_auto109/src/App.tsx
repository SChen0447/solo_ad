import React, { useState, useMemo, useRef, useCallback } from 'react';
import InputSection from '@/components/InputSection';
import TemplateList from '@/templates/TemplateList';
import CoverPreview from '@/generator/CoverPreview';
import CoverExporter from '@/generator/CoverExporter';
import { TEMPLATES, getTemplateById } from '@/data/templates';
import { generateWaveData } from '@/utils/waveGenerator';
import type { InputValues } from '@/types';
import { Headphones, Wand2 } from 'lucide-react';

const App: React.FC = () => {
  const [values, setValues] = useState<InputValues>({
    showName: '深夜漫谈',
    episodeTitle: '第12期：在AI浪潮中寻找人类的温度',
    guestName: '张博士',
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMPLATES[0].id);
  const coverRef = useRef<HTMLElement>(null);

  const handleInputChange = useCallback((key: keyof InputValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const template = useMemo(
    () => getTemplateById(selectedTemplateId),
    [selectedTemplateId]
  );

  const waveData = useMemo(
    () => generateWaveData(values.showName, values.episodeTitle, values.guestName),
    [values.showName, values.episodeTitle, values.guestName]
  );

  const exportFileName = useMemo(() => {
    const base = (values.showName || 'podcast').replace(/[^\w\u4e00-\u9fa5]/g, '-');
    return `cover-${base}`;
  }, [values.showName]);

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-logo">
          <div className="logo-icon">
            <Headphones size={22} />
          </div>
          <div>
            <h1 className="app-title">播客封面生成器</h1>
            <p className="app-subtitle">一键创建声纹风格化的单集海报</p>
          </div>
        </div>
        <div className="header-badge">
          <Wand2 size={14} />
          <span>10种专业模板</span>
        </div>
      </header>

      <main className="app-main">
        <div className="panel panel-left">
          <div className="panel-card">
            <div className="card-title-row">
              <span className="card-title">节目信息</span>
              <span className="card-title-dot" />
            </div>
            <InputSection values={values} onChange={handleInputChange} />
          </div>

          <div className="panel-card">
            <div className="card-title-row">
              <span className="card-title">选择模板</span>
              <span className="card-title-dot" />
            </div>
            <TemplateList
              templates={TEMPLATES}
              selectedId={selectedTemplateId}
              onSelect={setSelectedTemplateId}
            />
            <div className="template-selected-info" style={{ color: template.primary }}>
              当前模板：<strong>{template.name}</strong>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="panel panel-right">
          <div className="preview-container">
            <div className="panel-card preview-card">
              <div className="card-title-row">
                <span className="card-title">实时预览</span>
                <span className="preview-tag">400 × 400</span>
              </div>
              <div className="preview-stage">
                <CoverPreview
                  ref={coverRef}
                  template={template}
                  waveData={waveData}
                  showName={values.showName}
                  episodeTitle={values.episodeTitle}
                  guestName={values.guestName}
                />
              </div>
            </div>
          </div>

          <div className="export-area">
            <CoverExporter targetRef={coverRef} fileName={exportFileName} />
            <p className="export-tip">点击按钮下载高清PNG封面（2倍分辨率）</p>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <span>Podcast Cover Generator · Crafted for creators</span>
      </footer>
    </div>
  );
};

export default App;
