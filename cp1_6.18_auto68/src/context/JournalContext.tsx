import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useMemo,
} from "react";
import { v4 as uuidv4 } from "uuid";

export interface GradientColors {
  startHue: number;
  startSaturation: number;
  startLightness: number;
  endHue: number;
  endSaturation: number;
  endLightness: number;
}

export interface MoodWord {
  word: string;
  category: "warm" | "cool" | "neutral";
  baseHue: number;
  baseSaturation: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  mood: string;
  gradient: GradientColors;
  content: string;
  createdAt: number;
  isNew?: boolean;
}

type State = {
  entries: JournalEntry[];
};

type Action =
  | { type: "ADD_ENTRY"; payload: JournalEntry }
  | { type: "CLEAR_NEW_FLAG"; payload: string };

const MOOD_WORDS: MoodWord[] = [
  { word: "愉悦", category: "warm", baseHue: 45, baseSaturation: 85 },
  { word: "快乐", category: "warm", baseHue: 55, baseSaturation: 90 },
  { word: "兴奋", category: "warm", baseHue: 20, baseSaturation: 95 },
  { word: "热情", category: "warm", baseHue: 10, baseSaturation: 90 },
  { word: "甜蜜", category: "warm", baseHue: 330, baseSaturation: 75 },
  { word: "温馨", category: "warm", baseHue: 30, baseSaturation: 70 },
  { word: "幸福", category: "warm", baseHue: 50, baseSaturation: 85 },
  { word: "满足", category: "warm", baseHue: 35, baseSaturation: 75 },
  { word: "感激", category: "warm", baseHue: 40, baseSaturation: 80 },
  { word: "感动", category: "warm", baseHue: 340, baseSaturation: 70 },
  { word: "惊喜", category: "warm", baseHue: 280, baseSaturation: 80 },
  { word: "振奋", category: "warm", baseHue: 15, baseSaturation: 90 },
  { word: "轻松", category: "warm", baseHue: 60, baseSaturation: 70 },
  { word: "活泼", category: "warm", baseHue: 30, baseSaturation: 90 },
  { word: "阳光", category: "warm", baseHue: 50, baseSaturation: 95 },
  { word: "自信", category: "warm", baseHue: 25, baseSaturation: 80 },
  { word: "勇敢", category: "warm", baseHue: 5, baseSaturation: 85 },
  { word: "希望", category: "warm", baseHue: 140, baseSaturation: 65 },
  { word: "期待", category: "warm", baseHue: 260, baseSaturation: 70 },
  { word: "骄傲", category: "warm", baseHue: 20, baseSaturation: 80 },
  { word: "平静", category: "neutral", baseHue: 200, baseSaturation: 35 },
  { word: "安宁", category: "neutral", baseHue: 180, baseSaturation: 40 },
  { word: "淡定", category: "neutral", baseHue: 210, baseSaturation: 30 },
  { word: "放松", category: "neutral", baseHue: 160, baseSaturation: 45 },
  { word: "慵懒", category: "neutral", baseHue: 40, baseSaturation: 40 },
  { word: "惬意", category: "neutral", baseHue: 170, baseSaturation: 50 },
  { word: "专注", category: "neutral", baseHue: 230, baseSaturation: 55 },
  { word: "沉思", category: "neutral", baseHue: 240, baseSaturation: 40 },
  { word: "稳重", category: "neutral", baseHue: 220, baseSaturation: 35 },
  { word: "平和", category: "neutral", baseHue: 190, baseSaturation: 35 },
  { word: "放空", category: "neutral", baseHue: 150, baseSaturation: 25 },
  { word: "无聊", category: "neutral", baseHue: 60, baseSaturation: 20 },
  { word: "迷茫", category: "neutral", baseHue: 270, baseSaturation: 30 },
  { word: "犹豫", category: "neutral", baseHue: 250, baseSaturation: 35 },
  { word: "疲惫", category: "neutral", baseHue: 30, baseSaturation: 25 },
  { word: "忧伤", category: "cool", baseHue: 220, baseSaturation: 60 },
  { word: "难过", category: "cool", baseHue: 230, baseSaturation: 65 },
  { word: "失落", category: "cool", baseHue: 240, baseSaturation: 55 },
  { word: "孤独", category: "cool", baseHue: 250, baseSaturation: 50 },
  { word: "焦虑", category: "cool", baseHue: 260, baseSaturation: 70 },
  { word: "紧张", category: "cool", baseHue: 0, baseSaturation: 65 },
  { word: "烦躁", category: "cool", baseHue: 5, baseSaturation: 75 },
  { word: "愤怒", category: "cool", baseHue: 0, baseSaturation: 85 },
  { word: "恐惧", category: "cool", baseHue: 280, baseSaturation: 55 },
  { word: "嫉妒", category: "cool", baseHue: 120, baseSaturation: 50 },
  { word: "后悔", category: "cool", baseHue: 210, baseSaturation: 45 },
  { word: "愧疚", category: "cool", baseHue: 340, baseSaturation: 40 },
  { word: "羞愧", category: "cool", baseHue: 320, baseSaturation: 45 },
  { word: "无聊", category: "cool", baseHue: 180, baseSaturation: 25 },
  { word: "空虚", category: "cool", baseHue: 200, baseSaturation: 30 },
];

export { MOOD_WORDS };

function generateGradient(mood: MoodWord): GradientColors {
  const hueOffset =
    mood.category === "warm" ? 25 : mood.category === "cool" ? -25 : 40;
  const lightnessOffset =
    mood.category === "warm" ? 10 : mood.category === "cool" ? -5 : 5;

  let endHue = mood.baseHue + hueOffset;
  if (endHue > 360) endHue -= 360;
  if (endHue < 0) endHue += 360;

  return {
    startHue: mood.baseHue,
    startSaturation: mood.baseSaturation,
    startLightness: 55 + lightnessOffset,
    endHue,
    endSaturation: Math.max(40, mood.baseSaturation - 15),
    endLightness: 65 + lightnessOffset,
  };
}

export { generateGradient };

export function gradientToCss(gradient: GradientColors): string {
  const start = `hsl(${gradient.startHue}, ${gradient.startSaturation}%, ${gradient.startLightness}%)`;
  const end = `hsl(${gradient.endHue}, ${gradient.endSaturation}%, ${gradient.endLightness}%)`;
  return `linear-gradient(135deg, ${start}, ${end})`;
}

export function getBrightColor(gradient: GradientColors): string {
  return `hsl(${gradient.startHue}, ${gradient.startSaturation}%, ${Math.min(gradient.startLightness + 15, 85)}%)`;
}

export function findMoodWord(word: string): MoodWord | undefined {
  return MOOD_WORDS.find((m) => m.word === word);
}

function getSampleData(): JournalEntry[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const formatDate = (d: Date) =>
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

  return [
    {
      id: uuidv4(),
      date: formatDate(twoDaysAgo),
      mood: "平静",
      gradient: generateGradient(findMoodWord("平静")!),
      content:
        "今天下了一整天的雨，坐在窗边听雨声，感觉内心特别宁静。泡了一杯热茶，看完了一本搁置很久的书。",
      createdAt: twoDaysAgo.getTime(),
    },
    {
      id: uuidv4(),
      date: formatDate(yesterday),
      mood: "愉悦",
      gradient: generateGradient(findMoodWord("愉悦")!),
      content:
        "和老朋友重逢，聊了很多以前的趣事。时间过得真快，但有些人和事永远不会变。感恩生命中这些温暖的相遇。",
      createdAt: yesterday.getTime(),
    },
    {
      id: uuidv4(),
      date: formatDate(today),
      mood: "期待",
      gradient: generateGradient(findMoodWord("期待")!),
      content:
        "明天就要去旅行了！收拾行李的时候心情特别雀跃，期待看到新的风景，遇见新的故事。",
      createdAt: today.getTime(),
    },
  ];
}

const initialState: State = {
  entries: getSampleData(),
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_ENTRY":
      return {
        ...state,
        entries: [action.payload, ...state.entries],
      };
    case "CLEAR_NEW_FLAG":
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.payload ? { ...e, isNew: false } : e
        ),
      };
    default:
      return state;
  }
}

interface JournalContextType {
  state: State;
  dispatch: React.Dispatch<Action>;
  moodWords: MoodWord[];
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      moodWords: MOOD_WORDS,
    }),
    [state]
  );

  return (
    <JournalContext.Provider value={value}>{children}</JournalContext.Provider>
  );
}

export function useJournal() {
  const context = useContext(JournalContext);
  if (context === undefined) {
    throw new Error("useJournal must be used within a JournalProvider");
  }
  return context;
}
