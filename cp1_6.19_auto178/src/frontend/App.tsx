import { useState, useEffect, useRef } from 'react';
import { MelodyEditor } from './pages/MelodyEditor';
import { MelodyLibrary } from './pages/MelodyLibrary';
import { Api, Melody, Note } from './utils/Api';
import { AudioEngine } from './engine/AudioEngine';

const TRACK_COLORS = ['#ff6b6b', '#00d2ff', '#ffd93d', '#6bcf7f'];

function App() {
  const [melodies, setMelodies] = useState<Melody[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadedNotes, setLoadedNotes] = useState<Note[] | null>(null);
  const [loadedBpm, setLoadedBpm] = useState(120);
  const [isMixPlaying, setIsMixPlaying] = useState(false);
  const [mixTracks, setMixTracks] = useState<{ notes: Note[]; color: string }[]>([]);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const mixAudioRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    loadMelodies();
    const shareData = Api.parseShareData();
    if (shareData && shareData.length > 0) {
      const tracks = shareData.map((m, idx) => ({
        notes: m.notes,
        color: TRACK_COLORS[idx % TRACK_COLORS.length],
      }));
      setMixTracks(tracks);
      setLoadedBpm(shareData[0].bpm);
      setTimeout(() => {
        if (mixAudioRef.current) {
          mixAudioRef.current.setTracks(tracks);
          mixAudioRef.current.setBpm(shareData[0].bpm);
          mixAudioRef.current.playTracks();
          setIsMixPlaying(true);
        }
      }, 500);
    }
  }, []);

  useEffect(() => {
    mixAudioRef.current = new AudioEngine();
    mixAudioRef.current.setOnEndCallback(() => {
      setIsMixPlaying(false);
    });
  }, []);

  const loadMelodies = async () => {
    try {
      const data = await Api.loadMelodies();
      setMelodies(data);
    } catch (e) {
      console.error('Failed to load melodies:', e);
    }
  };

  const handleSave = async (data: { name: string; tags: string[]; notes: Note[]; bpm: number }) => {
    try {
      const newMelody = await Api.saveMelody(data);
      setMelodies([newMelody, ...melodies]);
    } catch (e) {
      console.error('Failed to save melody:', e);
      alert('保存失败，请重试');
    }
  };

  const handleLoad = (melody: Melody) => {
    setLoadedNotes(melody.notes);
    setLoadedBpm(melody.bpm);
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const melody = melodies.find(m => m.id === id);
      if (!melody) return;
      const updated = await Api.updateMelody(id, { favorite: !melody.favorite });
      setMelodies(melodies.map(m => m.id === id ? updated : m));
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleMixPlay = () => {
    if (selectedIds.length < 2) return;
    const selectedMelodies = melodies.filter(m => selectedIds.includes(m.id));
    if (selectedMelodies.length < 2) return;

    const bpm = Math.max(...selectedMelodies.map(m => m.bpm));
    const tracks = selectedMelodies.map((m, idx) => ({
      notes: m.notes,
      color: TRACK_COLORS[idx % TRACK_COLORS.length],
    }));

    setMixTracks(tracks);
    setIsMixPlaying(true);

    if (mixAudioRef.current) {
      mixAudioRef.current.setTracks(tracks);
      mixAudioRef.current.setBpm(bpm);
      mixAudioRef.current.playTracks();
    }
  };

  const handleExportShare = async () => {
    if (selectedIds.length === 0) return;
    try {
      const url = await Api.generateShareLink(selectedIds);
      const fullUrl = window.location.origin + url;
      setShareUrl(fullUrl);
      setShareModalVisible(true);
    } catch (e) {
      console.error('Failed to generate share link:', e);
      alert('生成分享链接失败');
    }
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('链接已复制到剪贴板！');
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🎵 Melody Maker</h1>
        <p className="app-subtitle">简单创作，自由分享你的旋律</p>
      </header>

      <main className="app-main">
        <div className="editor-section">
          <MelodyEditor
            loadedNotes={loadedNotes}
            loadedBpm={loadedBpm}
            onSave={handleSave}
            mixTracks={mixTracks}
            isMixPlaying={isMixPlaying}
          />
        </div>
        <div className="library-section">
          <MelodyLibrary
            melodies={melodies}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onLoad={handleLoad}
            onToggleFavorite={handleToggleFavorite}
            onMixPlay={handleMixPlay}
            onExportShare={handleExportShare}
            isMixPlaying={isMixPlaying}
          />
        </div>
      </main>

      {shareModalVisible && (
        <div className="modal-overlay" onClick={() => setShareModalVisible(false)}>
          <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()}>
            <h3>分享旋律</h3>
            <p className="share-desc">复制以下链接分享给好友，对方打开即可听到相同的旋律组合</p>
            <div className="share-url-container">
              <input type="text" value={shareUrl} readOnly className="share-url-input" />
              <button className="copy-btn" onClick={copyShareUrl}>复制</button>
            </div>
            <button className="modal-save close-share-btn" onClick={() => setShareModalVisible(false)}>
              关闭
            </button>
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #1a1a2e;
          color: #fff;
          min-height: 100vh;
        }

        #root {
          min-height: 100vh;
        }

        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 24px;
          box-sizing: border-box;
          max-width: 1400px;
          margin: 0 auto;
        }

        .app-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .app-title {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, #00d2ff, #ff6b6b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .app-subtitle {
          margin: 0;
          color: #888;
          font-size: 14px;
        }

        .app-main {
          flex: 1;
          display: flex;
          gap: 24px;
          min-height: 0;
        }

        .editor-section {
          flex: 65;
          min-width: 0;
          min-height: 600px;
        }

        .library-section {
          flex: 35;
          min-width: 0;
          min-height: 600px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: #16213e;
          border-radius: 16px;
          padding: 32px;
          width: 90%;
          max-width: 480px;
          animation: modalIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }

        .modal-content h3 {
          margin: 0 0 16px 0;
          color: #fff;
          font-size: 20px;
        }

        .share-modal {
          text-align: center;
        }

        .share-desc {
          color: #aaa;
          font-size: 14px;
          margin: 0 0 20px 0;
        }

        .share-url-container {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }

        .share-url-input {
          flex: 1;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #2a2a4e;
          background: #1a1a2e;
          color: #fff;
          font-size: 13px;
          outline: none;
          font-family: monospace;
        }

        .copy-btn {
          padding: 12px 20px;
          border-radius: 8px;
          border: none;
          background: #e94560;
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .copy-btn:hover {
          background: #ff6b6b;
        }

        .modal-save {
          padding: 12px 32px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #e94560, #ff6b6b);
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modal-save:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
        }

        .close-share-btn {
          display: block;
          margin: 0 auto;
        }

        @media (max-width: 900px) {
          .app-main {
            flex-direction: column;
          }

          .editor-section,
          .library-section {
            flex: none;
            width: 100%;
          }

          .library-section {
            min-height: 200px;
          }
        }

        @media (max-width: 768px) {
          .app-container {
            padding: 16px;
          }

          .app-title {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
