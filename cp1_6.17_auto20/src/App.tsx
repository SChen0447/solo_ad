import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { VideoPlayer } from './components/VideoPlayer';
import { PoemDisplay } from './components/PoemDisplay';
import { ControlPanel } from './components/ControlPanel';
import type { PoemFeatures, GenerateVideoResponse } from './types';

const DEFAULT_POEM = `床前明月光
疑是地上霜
举头望明月
低头思故乡`;

function App() {
  const [poemText, setPoemText] = useState<string>(DEFAULT_POEM);
  const [poemFeatures, setPoemFeatures] = useState<PoemFeatures | null>(null);
  const [videoData, setVideoData] = useState<GenerateVideoResponse | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(0.7);
  const [style, setStyle] = useState('nature');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!poemText.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const response = await axios.post<PoemFeatures>('/api/analyze-poem', {
        text: poemText,
      });
      setPoemFeatures(response.data);
    } catch (error) {
      console.error('分析诗歌失败:', error);
      alert('分析诗歌失败，请稍后重试');
    } finally {
      setIsAnalyzing(false);
    }
  }, [poemText]);

  const handleGenerateVideo = useCallback(async () => {
    if (!poemFeatures) return;
    
    setIsGenerating(true);
    try {
      const response = await axios.post<GenerateVideoResponse>('/api/generate-video', {
        poemFeatures,
        speed,
        volume,
        style,
      });
      setVideoData(response.data);
      setCurrentTime(0);
      setCurrentLineIndex(0);
      setIsPlaying(false);
    } catch (error) {
      console.error('生成视频失败:', error);
      alert('生成视频失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  }, [poemFeatures, speed, volume, style]);

  useEffect(() => {
    if (poemFeatures) {
      handleGenerateVideo();
    }
  }, [poemFeatures, handleGenerateVideo]);

  const handleStyleChange = useCallback((newStyle: string) => {
    setStyle(newStyle);
    if (poemFeatures) {
      handleGenerateVideo();
    }
  }, [poemFeatures, handleGenerateVideo]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleTimeUpdate = useCallback((time: number, lineIndex: number) => {
    setCurrentTime(time);
    setCurrentLineIndex(lineIndex);
  }, []);

  const handleLineClick = useCallback((index: number) => {
    if (!videoData) return;
    const timestamp = videoData.lineTimestamps[index] || 0;
    setCurrentTime(timestamp);
    setCurrentLineIndex(index);
  }, [videoData]);

  const handleExport = useCallback(async () => {
    if (!videoData) return;
    
    setIsExporting(true);
    try {
      const response = await axios.post('/api/export-video', {
        poemFeatures,
        videoData,
        speed,
        volume,
        style,
      }, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `poem_video_${Date.now()}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出视频失败:', error);
      alert('导出视频失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  }, [poemFeatures, videoData, speed, volume, style]);

  const handlePoemTextChange = useCallback((text: string) => {
    setPoemText(text);
    if (text === '') {
      setPoemFeatures(null);
      setVideoData(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentLineIndex(0);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-primary-bg via-secondary-bg to-primary-bg border-b border-white/10 py-6 px-6 animate-fade-in">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-2xl shadow-lg shadow-accent/30">
              🎵
            </div>
            <div>
              <h1 className="font-display text-3xl font-black text-white tracking-tight">
                诗韵 <span className="text-accent">PoemVerse</span>
              </h1>
              <p className="text-text-secondary text-sm mt-0.5">
                让每一首诗都拥有专属的声音与画面 · 自动分析诗歌情感 · 智能匹配背景音乐
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {isGenerating && (
            <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-xl animate-pulse-glow">
              <div className="flex items-center gap-3">
                <span className="text-2xl animate-spin">🎬</span>
                <div>
                  <p className="text-white font-semibold">正在生成视频预览...</p>
                  <p className="text-text-secondary text-sm">分析诗歌特征、匹配背景音乐、合成画面，约需8秒</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[25%_50%_25%] gap-6">
            <div className="order-2 lg:order-1">
              <PoemDisplay
                lines={videoData?.lines || []}
                currentLineIndex={currentLineIndex}
                onLineClick={handleLineClick}
                poemText={poemText}
                onPoemTextChange={handlePoemTextChange}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                mood={poemFeatures?.mood || ''}
              />
            </div>

            <div className="order-1 lg:order-2">
              <VideoPlayer
                videoUrl={videoData?.backgroundVideoUrl || ''}
                audioUrl={videoData?.audioUrl || ''}
                totalDuration={videoData?.totalDuration || 0}
                lineTimestamps={videoData?.lineTimestamps || []}
                lines={videoData?.lines || []}
                currentLineIndex={currentLineIndex}
                isPlaying={isPlaying}
                currentTime={currentTime}
                volume={volume}
                playbackRate={speed}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onVolumeChange={setVolume}
                onTimeUpdate={handleTimeUpdate}
              />
            </div>

            <div className="order-3">
              <ControlPanel
                speed={speed}
                volume={volume}
                style={style}
                onSpeedChange={setSpeed}
                onVolumeChange={setVolume}
                onStyleChange={handleStyleChange}
                onExport={handleExport}
                isExporting={isExporting}
                hasVideo={!!videoData}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 px-6 text-center text-text-secondary/50 text-sm border-t border-white/5">
        <p>© 2024 诗韵 PoemVerse · 让诗歌之美，可听可视</p>
      </footer>
    </div>
  );
}

export default App;
