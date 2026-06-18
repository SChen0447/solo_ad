import React, { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  useJournal,
  GradientColors,
  MoodWord,
  JournalEntry,
  generateGradient,
  findMoodWord,
} from "./context/JournalContext";
import { MoodPicker } from "./components/MoodPicker";
import { EntryCard } from "./components/EntryCard";

const CHAR_LIMIT = 140;
const DEBOUNCE_MS = 2000;
const VIRTUAL_THRESHOLD = 50;
const BUFFER = 5;

function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function getDefaultGradient(): GradientColors {
  const defaultMood = findMoodWord("平静");
  return defaultMood
    ? generateGradient(defaultMood)
    : {
        startHue: 200,
        startSaturation: 35,
        startLightness: 65,
        endHue: 240,
        endSaturation: 20,
        endLightness: 70,
      };
}

const App: React.FC = () => {
  const { state, dispatch } = useJournal();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [gradient, setGradient] = useState<GradientColors>(getDefaultGradient());
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 50,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<number | null>(null);

  const today = formatDate(new Date());
  const overLimit = content.length > CHAR_LIMIT;

  const handleSelectMood = useCallback(
    (mood: MoodWord) => {
      setSelectedMood(mood.word);
      setGradient(generateGradient(mood));
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (!selectedMood || !content.trim() || overLimit || isSubmitting) return;

    setIsSubmitting(true);
    setFormCollapsed(true);

    const newEntry: JournalEntry = {
      id: uuidv4(),
      date: today,
      mood: selectedMood,
      gradient: { ...gradient },
      content: content.trim(),
      createdAt: Date.now(),
      isNew: true,
    };

    dispatch({ type: "ADD_ENTRY", payload: newEntry });

    window.setTimeout(() => {
      setSelectedMood(null);
      setGradient(getDefaultGradient());
      setContent("");
      setFormCollapsed(false);
    }, 600);

    debounceTimer.current = window.setTimeout(() => {
      setIsSubmitting(false);
      debounceTimer.current = null;
    }, DEBOUNCE_MS);
  }, [selectedMood, content, overLimit, isSubmitting, today, gradient, dispatch]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleCardAnimationEnd = useCallback(
    (id: string) => {
      dispatch({ type: "CLEAR_NEW_FLAG", payload: id });
    },
    [dispatch]
  );

  const handleScroll = useCallback(() => {
    if (state.entries.length <= VIRTUAL_THRESHOLD) return;

    const container = containerRef.current;
    if (!container) return;

    const viewportHeight = window.innerHeight;
    const cardEstimateHeight = 220;
    const columns =
      window.innerWidth > 1024 ? 4 : window.innerWidth > 768 ? 3 : 2;

    const scrollTop = window.scrollY;
    const containerTop = container.offsetTop;

    const startIndex = Math.max(
      0,
      Math.floor((scrollTop - containerTop) / cardEstimateHeight) * columns - BUFFER * columns
    );
    const endIndex = Math.min(
      state.entries.length,
      Math.ceil((scrollTop - containerTop + viewportHeight) / cardEstimateHeight) *
        columns +
        BUFFER * columns
    );

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [state.entries.length]);

  useEffect(() => {
    if (state.entries.length <= VIRTUAL_THRESHOLD) return;
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [state.entries.length, handleScroll]);

  const renderEntries = () => {
    if (state.entries.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-title">还没有心情记录</div>
          <div className="empty-state-desc">在上方记录你的第一条心情吧 ✨</div>
        </div>
      );
    }

    if (state.entries.length <= VIRTUAL_THRESHOLD) {
      return state.entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          onAnimationEnd={handleCardAnimationEnd}
        />
      ));
    }

    const result: React.ReactNode[] = [];
    for (let i = 0; i < state.entries.length; i++) {
      if (i >= visibleRange.start && i < visibleRange.end) {
        const entry = state.entries[i];
        result.push(
          <EntryCard
            key={entry.id}
            entry={entry}
            onAnimationEnd={handleCardAnimationEnd}
          />
        );
      } else {
        result.push(<div key={`ph-${i}`} className="card-placeholder" />);
      }
    }
    return result;
  };

  return (
    <div className="app">
      <header className="top-panel">
        <div className="top-panel-inner">
          <div className="date-display">📅 {today}</div>

          <div className={`form-container${formCollapsed ? " collapsed" : ""}`}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">今日心情</label>
                <button
                  type="button"
                  className={`mood-select-btn${selectedMood ? " selected" : ""}`}
                  onClick={() => setPickerOpen(true)}
                >
                  {selectedMood || "点击选择心情词..."}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">心情随笔</label>
              <div className="textarea-wrapper">
                <textarea
                  className={`journal-textarea${overLimit ? " over-limit" : ""}`}
                  placeholder="用几句话记录今天的心情..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={200}
                />
                <span className={`char-count${overLimit ? " over-limit" : ""}`}>
                  {content.length}/{CHAR_LIMIT}
                </span>
              </div>
            </div>

            <div className="submit-row">
              <button
                type="button"
                className="submit-btn"
                onClick={handleSubmit}
                disabled={!selectedMood || !content.trim() || overLimit || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner" />
                    <span>保存中</span>
                  </>
                ) : (
                  <span>保存心情</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="waterfall-container" ref={containerRef}>
        <div className="waterfall">{renderEntries()}</div>
      </main>

      <MoodPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedMood={selectedMood}
        onSelectMood={handleSelectMood}
        gradient={gradient}
        onGradientChange={setGradient}
      />
    </div>
  );
};

export default App;
