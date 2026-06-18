import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ScriptSection } from '../modules/scriptEngine';

export default function ExportPage() {
  const topic = useAppStore(s => s.topic);
  const keywords = useAppStore(s => s.keywords);
  const scriptSections = useAppStore(s => s.scriptSections);
  const selectedSentiment = useAppStore(s => s.selectedSentiment);
  const musicSuggestions = useAppStore(s => s.musicSuggestions);
  const shareCode = useAppStore(s => s.shareCode);
  const setShareCode = useAppStore(s => s.setShareCode);
  const addNotification = useAppStore(s => s.addNotification);

  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const markdown = useMemo(() => buildMarkdown(topic, keywords, scriptSections, selectedSentiment, musicSuggestions),
    [topic, keywords, scriptSections, selectedSentiment, musicSuggestions]);

  const hasContent = scriptSections.length > 0;

  const handleExportMarkdown = () => {
    if (!hasContent) {
      addNotification('没有可导出的脚本内容', 'error');
      return;
    }
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fname = `video-script-${(topic || 'untitled').slice(0, 30).replace(/[^\w\u4e00-\u9fa5-]/g, '_')}-${Date.now()}.md`;
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
    addNotification(`已导出为 Markdown 文件：${fname}`, 'success');
  };

  const handleGenerateShare = async () => {
    if (!hasContent) {
      addNotification('没有可分享的脚本内容', 'error');
      return;
    }
    setSharing(true);
    const payload = {
      topic,
      keywords,
      sections: scriptSections,
      sentiment: selectedSentiment,
      music: musicSuggestions,
      createdAt: Date.now(),
    };
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      });
      if (!res.ok) throw new Error('share failed');
      const json = await res.json();
      const code = json.id;
      setShareCode(code);
      const link = `${window.location.origin}${window.location.pathname}?share=${code}`;
      setShareLink(link);
      localStorage.setItem(`share_${code}`, JSON.stringify({
        data: payload, expiry: json.expiry }));
      addNotification('分享链接已生成（有效期24小时）', 'success');
    } catch {
      addNotification('分享生成失败，请检查后端服务是否启动', 'error');
    } finally {
      setSharing(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(key);
      addNotification('已复制到剪贴板', 'success');
      setTimeout(() => setCopySuccess(null), 1800);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
      setCopySuccess(key);
      addNotification('已复制到剪贴板', 'success');
      setTimeout(() => setCopySuccess(null), 1800);
    }
  };

  return (
    <div className="export-page">
      <h1 className="export-title">导出与分享</h1>
      <p className="export-subtitle">
        将你的脚本大纲、分镜表和