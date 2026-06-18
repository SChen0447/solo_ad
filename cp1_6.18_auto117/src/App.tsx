import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import EditorPage from './pages/EditorPage';
import ExportPage from './pages/ExportPage';
import Navigation from './components/Navigation';
import NotificationBell from './components/NotificationBell';
import NotificationsPanel from './components/NotificationsPanel';
import { getAvailableStyles } from './modules/scriptEngine';

export default function App() {
  const page = useAppStore(s => s.page);
  const readOnlyMode = useAppStore(s => s.readOnlyMode);
  const setScriptSections = useAppStore(s => s.setScriptSections);
  const setReadOnlyMode = useAppStore(s => s.setReadOnlyMode);
  const addNotification = useAppStore(s => s.addNotification);
  const setTopic = useAppStore(s => s.setTopic);
  const setKeywords = useAppStore(s => s.setKeywords);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (shareId) {
      const cached = localStorage.getItem(`share_${shareId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.expiry && Date.now() > parsed.expiry) {
            localStorage.removeItem(`share_${shareId}`);
            addNotification('分享链接已过期', 'error');
            return;
          }
          if (parsed.data) {
            if (parsed.data.sections) setScriptSections(parsed.data.sections);
            if (parsed.data.topic) setTopic(parsed.data.topic);
            if (parsed.data.keywords) setKeywords(parsed.data.keywords);
            setReadOnlyMode(true);
            addNotification('已加载分享内容（只读模式）', 'info');
          }
        } catch {
          addNotification('分享数据解析失败', 'error');
        }
      } else {
        fetch(`/api/share/${shareId}`)
          .then(r => {
            if (!r.ok) throw new Error('fetch failed');
            return r.json();
          })
          .then(result => {
            if (result.data) {
              if (result.data.sections) setScriptSections(result.data.sections);
              if (result.data.topic) setTopic(result.data.topic);
              if (result.data.keywords) setKeywords(result.data.keywords);
              setReadOnlyMode(true);
              localStorage.setItem(`share_${shareId}`, JSON.stringify({
                data: result.data,
                expiry: result.expiry,
              }));
              addNotification('已加载分享内容（只读模式）', 'info');
            }
          })
          .catch(() => addNotification('无法加载分享内容', 'error'));
      }
    }
  }, []);

  return (
    <div className="app-root">
      <Navigation />
      <NotificationBell />
      <NotificationsPanel />
      <main className={`main-content ${readOnlyMode ? 'read-only' : ''}`}>
        {readOnlyMode && (
          <div className="read-only-banner">
            <span>🔒 只读模式 — 这是一个分享链接，内容不可编辑</span>
          </div>
        )}
        {page === 'editor' ? <EditorPage /> : <ExportPage />}
      </main>
    </div>
  );
}
