import { useState, useEffect, useCallback } from 'react';
import EditorPanel from './components/EditorPanel';
import ChapterTimeline from './components/ChapterTimeline';
import DetailPanel from './components/DetailPanel';
import RelationGraph from './components/RelationGraph';
import {
  Chapter,
  Character,
  Relation,
  loadChapters,
  saveChapter,
  loadCharacters,
  saveCharacter,
  loadRelations,
  saveRelation,
} from './api';
import './styles/App.css';

const defaultCharacters: Character[] = [
  { id: 'char-1', name: '林羽', color: '#667eea', description: '主角，年轻的探险家' },
  { id: 'char-2', name: '苏清雪', color: '#ed64a6', description: '神秘的女剑士' },
  { id: 'char-3', name: '老陈', color: '#48bb78', description: '经验丰富的向导' },
  { id: 'char-4', name: '墨影', color: '#9f7aea', description: '神秘组织的首领' },
  { id: 'char-5', name: '小雨', color: '#f6ad55', description: '机灵的小助手' },
];

const defaultRelations: Relation[] = [
  { id: 'rel-1', source: 'char-1', target: 'char-2', strength: 3, type: '伙伴' },
  { id: 'rel-2', source: 'char-1', target: 'char-3', strength: 2, type: '师徒' },
  { id: 'rel-3', source: 'char-1', target: 'char-4', strength: 1, type: '敌对' },
  { id: 'rel-4', source: 'char-2', target: 'char-3', strength: 2, type: '朋友' },
  { id: 'rel-5', source: 'char-1', target: 'char-5', strength: 3, type: '同伴' },
  { id: 'rel-6', source: 'char-2', target: 'char-5', strength: 2, type: '朋友' },
];

const defaultChapters: Chapter[] = [
  {
    id: 'ch-1',
    title: '序章：迷雾森林',
    content: '# 序章：迷雾森林\n\n清晨的迷雾笼罩着古老的森林，林羽独自踏上了寻找传说中宝藏的旅程。他背着简单的行囊，手中紧握着父亲留下的地图。\n\n"据说这片森林里住着吃人的妖怪..." 村里老人的话在他耳边回响。\n\n但林羽没有退缩，他知道，答案就在森林的深处。',
    type: 'plot',
    characters: ['char-1'],
    events: ['启程', '进入迷雾森林'],
    timestamp: Date.now() - 86400000 * 5,
    order: 0,
  },
  {
    id: 'ch-2',
    title: '相遇：剑影寒光',
    content: '# 相遇：剑影寒光\n\n第三天，林羽在一条小溪边遇到了苏清雪。她正与一群黑衣人激战，剑光如电，衣袂飘飘。\n\n林羽躲在树后，看得目瞪口呆。他从未见过如此精妙的剑法。\n\n"喂，看够了吗？" 苏清雪突然转头，冷冷地看向他藏身的方向。\n\n林羽尴尬地走出来，挠了挠头："那个...我只是路过..."',
    type: 'character',
    characters: ['char-1', 'char-2'],
    events: ['初遇苏清雪', '黑衣人袭击'],
    timestamp: Date.now() - 86400000 * 4,
    order: 1,
  },
  {
    id: 'ch-3',
    title: '转折：真相浮现',
    content: '# 转折：真相浮现\n\n老陈带着他们来到一座废弃的神庙。墙上的壁画揭示了一个惊人的真相——所谓的宝藏，其实是封印上古妖兽的钥匙。\n\n"墨影组织也在找这个。" 老陈沉声说道，"如果让他们得到钥匙，整个世界都会陷入灾难。"\n\n林羽握紧了拳头："那我们必须抢在他们前面。"',
    type: 'turning',
    characters: ['char-1', 'char-2', 'char-3', 'char-4'],
    events: ['发现真相', '墨影组织现身'],
    timestamp: Date.now() - 86400000 * 2,
    order: 2,
  },
  {
    id: 'ch-4',
    title: '深入：地下迷宫',
    content: '# 深入：地下迷宫\n\n神庙下方隐藏着巨大的地下迷宫。小雨带着地图跑在前面，蹦蹦跳跳地像只小兔子。\n\n"这边走！我闻到宝藏的味道了！"\n\n苏清雪无奈地摇摇头："你是狗鼻子吗？"\n\n虽然嘴上说着，但她的手却不自觉地握紧了剑柄。迷宫深处，似乎有什么东西在蠢蠢欲动...',
    type: 'plot',
    characters: ['char-1', 'char-2', 'char-5'],
    events: ['进入地下迷宫', '发现机关'],
    timestamp: Date.now() - 86400000,
    order: 3,
  },
];

function App() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [editingChapter, setEditingChapter] = useState<Partial<Chapter> | null>(null);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100]);
  const [isMobile, setIsMobile] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedChapters, fetchedCharacters, fetchedRelations] = await Promise.all([
          loadChapters(),
          loadCharacters(),
          loadRelations(),
        ]);

        if (fetchedChapters.length === 0) {
          setChapters(defaultChapters);
          for (const ch of defaultChapters) {
            await saveChapter(ch);
          }
        } else {
          setChapters(fetchedChapters);
        }

        if (fetchedCharacters.length === 0) {
          setCharacters(defaultCharacters);
          for (const char of defaultCharacters) {
            await saveCharacter(char);
          }
        } else {
          setCharacters(fetchedCharacters);
        }

        if (fetchedRelations.length === 0) {
          setRelations(defaultRelations);
          for (const rel of defaultRelations) {
            await saveRelation(rel);
          }
        } else {
          setRelations(fetchedRelations);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setChapters(defaultChapters);
        setCharacters(defaultCharacters);
        setRelations(defaultRelations);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSaveChapter = useCallback(async (chapterData: Partial<Chapter>) => {
    try {
      const saved = await saveChapter(chapterData);
      if (chapterData.id) {
        setChapters((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      } else {
        setChapters((prev) => [...prev, saved]);
      }
      setEditingChapter(null);
      setSelectedChapterId(saved.id);
    } catch (error) {
      console.error('Failed to save chapter:', error);
    }
  }, []);

  const handleSelectChapter = useCallback((chapterId: string) => {
    setSelectedChapterId(chapterId);
    setEditingChapter(null);
    if (isMobile) {
      setIsDetailOpen(true);
    }
  }, [isMobile]);

  const handleNewChapter = useCallback(() => {
    setEditingChapter({
      title: '',
      content: '',
      type: 'plot' as const,
      characters: [],
      events: [],
    });
    setSelectedChapterId(null);
  }, []);

  const handleEditChapter = useCallback((chapter: Chapter) => {
    setEditingChapter(chapter);
    setSelectedChapterId(null);
  }, []);

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) || null;

  const sortedChapters = [...chapters].sort((a, b) => a.timestamp - b.timestamp);

  const minTime = sortedChapters.length > 0 ? sortedChapters[0].timestamp : 0;
  const maxTime = sortedChapters.length > 0 ? sortedChapters[sortedChapters.length - 1].timestamp : 0;
  const totalTimeSpan = maxTime - minTime || 1;

  const filteredChapters = sortedChapters.filter((ch) => {
    const progress = ((ch.timestamp - minTime) / totalTimeSpan) * 100;
    return progress >= timeRange[0] && progress <= timeRange[1];
  });

  const getCharacterById = (id: string) => characters.find((c) => c.id === id);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>正在加载创作实验室...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title">
          <span className="title-icon">✍️</span>
          <h1>创作实验室</h1>
        </div>
        <div className="header-stats">
          <span className="stat-item">📖 {chapters.length} 章节</span>
          <span className="stat-item">👤 {characters.length} 角色</span>
        </div>
      </header>

      <main className="app-main">
        <div className="editor-section">
          <EditorPanel
            chapter={editingChapter}
            onSave={handleSaveChapter}
            onNewChapter={handleNewChapter}
            characters={characters}
          />
        </div>

        <div className="timeline-section">
          <ChapterTimeline
            chapters={filteredChapters}
            selectedChapterId={selectedChapterId}
            onSelectChapter={handleSelectChapter}
            onEditChapter={handleEditChapter}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            minTime={minTime}
            maxTime={maxTime}
          />
        </div>

        {!isMobile && (
          <div className="detail-section">
            <DetailPanel
              chapter={selectedChapter}
              characters={characters}
              getCharacterById={getCharacterById}
            />
          </div>
        )}
      </main>

      <div className="relation-graph-section">
        <div className="graph-header">
          <h2>角色关系网</h2>
          <span className="graph-subtitle">拖拽节点 · 滚轮缩放</span>
        </div>
        <RelationGraph characters={characters} relations={relations} />
      </div>

      {isMobile && isDetailOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setIsDetailOpen(false)} />
          <div className={`drawer-panel ${isDetailOpen ? 'open' : ''}`}>
            <DetailPanel
              chapter={selectedChapter}
              characters={characters}
              getCharacterById={getCharacterById}
              onClose={() => setIsDetailOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
