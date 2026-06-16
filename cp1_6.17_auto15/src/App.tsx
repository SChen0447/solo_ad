import { useState, useCallback, useEffect, useRef } from 'react';
import EditorPanel from './modules/editor/EditorPanel';
import PlayerController from './modules/player/PlayerController';
import SettingsDrawer from './modules/settings/SettingsDrawer';
import { Paragraph, TTSSettings, PlayerState, VoiceOption } from './types';
import { parseTextToParagraphs, createParagraph } from './utils/textParser';

const DEFAULT_TEXT = `欢迎使用TTS协同编辑器。这是一款专为内容创作者打造的文本转语音工具。

您可以在这里输入或粘贴任何文本。系统会自动按段落和句子进行分段。

点击底部的播放按钮即可开始朗读。当前朗读的句子会以淡黄色高亮显示，同时左侧会出现跳动的喇叭图标。

您可以通过右侧的设置面板调整语速、音调和声音类型。祝您使用愉快！`;

const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'female-zh', label: '女声（中文）', gender: 'female' },
  { id: 'male-zh', label: '男声（中文）', gender: 'male' },
];

function App() {
  const [paragraphs, setParagraphs] = useState<Paragraph[]>(() =>
    parseTextToParagraphs(DEFAULT_TEXT)
  );
  const [settings, setSettings] = useState<TTSSettings>({
    speed: 1.0,
    pitch: 0,
    voice: 'female-zh',
  });
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    isPaused: false,
    currentParagraphIndex: 0,
    currentSentenceIndex: 0,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const preloadedAudioRef = useRef<Map<string, Blob>>(new Map());

  const handleTextChange = useCallback((text: string) => {
    const newParagraphs = parseTextToParagraphs(text);
    setParagraphs(newParagraphs.length > 0 ? newParagraphs : [createParagraph('')]);
    setPlayerState((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentParagraphIndex: 0,
      currentSentenceIndex: 0,
    }));
    preloadedAudioRef.current.clear();
  }, []);

  const handleMergeParagraph = useCallback((index: number) => {
    setParagraphs((prev) => {
      if (index < 0 || index >= prev.length - 1) return prev;
      const result = [...prev];
      const merged: Paragraph = {
        id: Math.random().toString(36).substring(2, 11),
        sentences: [...result[index].sentences, ...result[index + 1].sentences],
      };
      result.splice(index, 2, merged);
      return result;
    });
  }, []);

  const handleSplitParagraph = useCallback(
    (paragraphIndex: number, sentenceIndex: number) => {
      setParagraphs((prev) => {
        if (
          sentenceIndex <= 0 ||
          sentenceIndex >= prev[paragraphIndex]?.sentences.length
        ) {
          return prev;
        }
        const result = [...prev];
        const target = result[paragraphIndex];
        const firstPart: Paragraph = {
          id: Math.random().toString(36).substring(2, 11),
          sentences: target.sentences.slice(0, sentenceIndex),
        };
        const secondPart: Paragraph = {
          id: Math.random().toString(36).substring(2, 11),
          sentences: target.sentences.slice(sentenceIndex),
        };
        result.splice(paragraphIndex, 1, firstPart, secondPart);
        return result;
      });
    },
    []
  );

  const handleSettingsUpdate = useCallback((newSettings: TTSSettings) => {
    setSettings(newSettings);
    preloadedAudioRef.current.clear();
  }, []);

  const getCurrentSentence = useCallback((): string | null => {
    const p = paragraphs[playerState.currentParagraphIndex];
    if (!p) return null;
    const s = p.sentences[playerState.currentSentenceIndex];
    return s?.text || null;
  }, [paragraphs, playerState]);

  const moveToNext = useCallback(() => {
    setPlayerState((prev) => {
      const currentPara = paragraphs[prev.currentParagraphIndex];
      if (!currentPara) return prev;

      if (prev.currentSentenceIndex < currentPara.sentences.length - 1) {
        return {
          ...prev,
          currentSentenceIndex: prev.currentSentenceIndex + 1,
        };
      }

      if (prev.currentParagraphIndex < paragraphs.length - 1) {
        return {
          ...prev,
          currentParagraphIndex: prev.currentParagraphIndex + 1,
          currentSentenceIndex: 0,
        };
      }

      return {
        ...prev,
        isPlaying: false,
        isPaused: false,
      };
    });
  }, [paragraphs]);

  const moveToPrev = useCallback(() => {
    setPlayerState((prev) => {
      if (prev.currentSentenceIndex > 0) {
        return {
          ...prev,
          currentSentenceIndex: prev.currentSentenceIndex - 1,
        };
      }

      if (prev.currentParagraphIndex > 0) {
        const prevPara = paragraphs[prev.currentParagraphIndex - 1];
        return {
          ...prev,
          currentParagraphIndex: prev.currentParagraphIndex - 1,
          currentSentenceIndex: prevPara ? prevPara.sentences.length - 1 : 0,
        };
      }

      return prev;
    });
  }, [paragraphs]);

  const jumpToSentence = useCallback(
    (paragraphIndex: number, sentenceIndex: number) => {
      setPlayerState((prev) => ({
        ...prev,
        currentParagraphIndex: paragraphIndex,
        currentSentenceIndex: sentenceIndex,
      }));
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        setPlayerState((prev) => ({
          ...prev,
          isPlaying: !prev.isPlaying,
          isPaused: prev.isPlaying ? false : prev.isPaused,
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
      <header
        style={{
          padding: '12px 20px',
          backgroundColor: '#252526',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🔊</span>
          <h1 style={{ fontSize: '16px', fontWeight: 600 }}>TTS 协同编辑器</h1>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            padding: '6px 14px',
            backgroundColor: 'transparent',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          ⚙️ 设置
        </button>
      </header>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <EditorPanel
          paragraphs={paragraphs}
          onTextChange={handleTextChange}
          playerState={playerState}
          onJumpToSentence={jumpToSentence}
          onMergeParagraph={handleMergeParagraph}
          onSplitParagraph={handleSplitParagraph}
        />
      </div>

      <PlayerController
        paragraphs={paragraphs}
        settings={settings}
        playerState={playerState}
        setPlayerState={setPlayerState}
        onMoveNext={moveToNext}
        onMovePrev={moveToPrev}
        getCurrentSentence={getCurrentSentence}
        preloadedAudioRef={preloadedAudioRef}
      />

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={handleSettingsUpdate}
        voiceOptions={VOICE_OPTIONS}
      />
    </div>
  );
}

export default App;
