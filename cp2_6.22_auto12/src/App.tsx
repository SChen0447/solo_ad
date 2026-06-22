import { useState, useEffect } from 'react';
import { DiaryEntry } from './types';
import { analyzeMood } from './utils/moodAnalyzer';
import { formatDateKey } from './utils/calendarHelper';
import DiaryInput from './components/DiaryInput';
import Timeline from './components/Timeline';
import MoodBar from './components/MoodBar';
import Calendar from './components/Calendar';
import './App.css';

const STORAGE_KEY = 'mood-diary-entries';

function generateSampleData(): DiaryEntry[] {
  const today = new Date();
  const samples = [
    { offset: 0, content: '今天阳光明媚，和朋友一起去公园散步，心情特别好，感觉生活充满了希望和美好。', mood: 'high' },
    { offset: 1, content: '工作有点累，但是完成了一个重要的项目，还是很有成就感的。喝了杯咖啡继续加油。', mood: 'medium-high' },
    { offset: 2, content: '今天下雨了，天气阴沉，心情有点低落，什么都不想做，感觉很疲惫。', mood: 'low' },
    { offset: 3, content: '和家人一起吃了顿丰盛的晚餐，聊了很多开心的事情，感觉很温暖很幸福。', mood: 'high' },
    { offset: 4, content: '普通的一天，上班下班，看看电影，平平淡淡也挺好的。', mood: 'medium' },
    { offset: 5, content: '学习了新技能，虽然有点难但很有收获，期待明天继续进步。', mood: 'medium-high' },
    { offset: 6, content: '遇到了一些烦心事，有点焦虑，希望明天会更好。', mood: 'low-medium' },
  ];

  return samples.map((sample, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - sample.offset);
    const dateStr = formatDateKey(date);
    const analysis = analyzeMood(sample.content);
    
    return {
      id: `sample-${index}`,
      date: dateStr,
      content: sample.content,
      moodColor: analysis.color,
      keywords: analysis.keywords,
      moodLevel: analysis.moodLevel,
    };
  });
}

function App() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setEntries(parsed);
      } catch (e) {
        setEntries(generateSampleData());
      }
    } else {
      setEntries(generateSampleData());
    }
  }, []);

  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  }, [entries]);

  const handleSave = (content: string) => {
    const todayStr = formatDateKey(new Date());
    const analysis = analyzeMood(content);
    
    const existingIndex = entries.findIndex(e => e.date === todayStr);
    
    if (existingIndex >= 0) {
      const updated = [...entries];
      updated[existingIndex] = {
        ...updated[existingIndex],
        content,
        moodColor: analysis.color,
        keywords: analysis.keywords,
        moodLevel: analysis.moodLevel,
      };
      setEntries(updated);
    } else {
      const newEntry: DiaryEntry = {
        id: `diary-${Date.now()}`,
        date: todayStr,
        content,
        moodColor: analysis.color,
        keywords: analysis.keywords,
        moodLevel: analysis.moodLevel,
      };
      setEntries([...entries, newEntry]);
    }
  };

  const handleDateSelect = (date: string) => {
    console.log('Selected date:', date);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">🌈</span>
          心情日记
        </h1>
        <p className="app-subtitle">记录每一天的色彩</p>
      </header>

      <div className="main-content">
        <aside className="left-panel">
          <Calendar entries={entries} onDateSelect={handleDateSelect} />
        </aside>

        <main className="center-panel">
          <DiaryInput onSave={handleSave} />
        </main>

        <aside className="right-panel">
          <Timeline entries={entries} />
        </aside>
      </div>

      <footer className="app-footer">
        <MoodBar entries={entries} />
      </footer>
    </div>
  );
}

export default App;
