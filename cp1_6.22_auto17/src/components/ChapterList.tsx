import React, { useState } from 'react';
import { ChapterWithMood, Mood } from '../types';

interface ChapterListProps {
  chapters: ChapterWithMood[];
  moods: Mood[];
  onAddChapter: (data: { title: string; pageCount: number; moodId: string }) => Promise<void>;
  bookId: string;
}

const ChapterList: React.FC<ChapterListProps> = ({ chapters, moods, onAddChapter }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChapter, setNewChapter] = useState({
    title: '',
    pageCount: '',
    moodId: ''
  });
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapter.title || !selectedMood) return;

    await onAddChapter({
      title: newChapter.title,
      pageCount: newChapter.pageCount ? parseInt(newChapter.pageCount) : 0,
      moodId: selectedMood.id
    });

    setNewChapter({ title: '', pageCount: '', moodId: '' });
    setSelectedMood(null);
    setShowAddForm(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>章节记录</h2>
        <button
          onClick={() => setShowAddForm(true)}
          style={styles.addBtn}
        >
          + 添加章节
        </button>
      </div>

      {showAddForm && (
        <div style={styles.addFormCard} className="fade-in-up">
          <h3 style={styles.formTitle}>记录新章节</h3>
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="text"
              placeholder="章节名 *"
              value={newChapter.title}
              onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
              style={styles.formInput}
              required
            />
            <input
              type="number"
              placeholder="页数"
              value={newChapter.pageCount}
              onChange={(e) => setNewChapter({ ...newChapter, pageCount: e.target.value })}
              style={styles.formInput}
            />
            
            <div style={styles.moodSelector}>
              <span style={styles.moodLabel}>选择心情 *</span>
              <div style={styles.moodGrid}>
                {moods.map((mood) => (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => setSelectedMood(mood)}
                    style={{
                      ...styles.moodOption,
                      backgroundColor: selectedMood?.id === mood.id ? mood.color : '#f5f5f5',
                      borderColor: selectedMood?.id === mood.id ? mood.color : '#e0e0e0',
                      color: selectedMood?.id === mood.id ? '#fff' : '#666'
                    }}
                    title={`${mood.name} (愉悦度: ${mood.happinessScore})`}
                  >
                    <span
                      style={{
                        ...styles.moodDot,
                        backgroundColor: mood.color
                      }}
                    />
                    {mood.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedMood(null);
                  setNewChapter({ title: '', pageCount: '', moodId: '' });
                }}
                style={styles.cancelBtn}
              >
                取消
              </button>
              <button
                type="submit"
                style={{
                  ...styles.submitBtn,
                  opacity: !newChapter.title || !selectedMood ? 0.5 : 1,
                  cursor: !newChapter.title || !selectedMood ? 'not-allowed' : 'pointer'
                }}
                disabled={!newChapter.title || !selectedMood}
              >
                保存
              </button>
            </div>
          </form>
        </div>
      )}

      {chapters.length === 0 ? (
        <div style={styles.emptyChapters}>
          <p style={styles.emptyText}>还没有记录章节，点击上方按钮开始记录你的阅读心情吧！</p>
          <p style={styles.hintText}>记录至少3个章节后，将自动生成情感波动曲线</p>
        </div>
      ) : (
        <div style={styles.chaptersList}>
          {chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              style={{
                ...styles.chapterCard,
                animationDelay: `${index * 0.05}s`
              }}
              className="fade-in-up"
            >
              <div
                style={{
                  ...styles.moodIndicator,
                  backgroundColor: chapter.mood.color
                }}
              />
              <div style={styles.chapterContent}>
                <div style={styles.chapterHeader}>
                  <span style={styles.chapterOrder}>第{chapter.orderIndex + 1}章</span>
                  <span
                    style={{
                      ...styles.moodBadge,
                      backgroundColor: chapter.mood.color
                    }}
                  >
                    {chapter.mood.name}
                  </span>
                </div>
                <h4 style={styles.chapterTitle}>{chapter.title}</h4>
                {chapter.pageCount > 0 && (
                  <span style={styles.pageCount}>{chapter.pageCount} 页</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
    margin: 0
  },
  addBtn: {
    backgroundColor: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  addFormCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 16px 0'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  formInput: {
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none'
  },
  moodSelector: {
    marginTop: '4px'
  },
  moodLabel: {
    fontSize: '14px',
    color: '#666',
    display: 'block',
    marginBottom: '8px'
  },
  moodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
    gap: '8px'
  },
  moodOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    border: '2px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
    backgroundColor: '#f5f5f5'
  },
  moodDot: {
    width: 10,
    height: 10,
    borderRadius: '50%'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '12px'
  },
  cancelBtn: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#666'
  },
  submitBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#4a90d9',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'opacity 0.2s ease'
  },
  emptyChapters: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#faf6f0',
    borderRadius: '12px'
  },
  emptyText: {
    fontSize: '16px',
    color: '#666',
    margin: '0 0 8px 0'
  },
  hintText: {
    fontSize: '14px',
    color: '#999',
    margin: 0
  },
  chaptersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  chapterCard: {
    display: 'flex',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    opacity: 0,
    animation: 'fadeInUp 0.3s ease-out forwards'
  },
  moodIndicator: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    marginRight: '16px',
    marginTop: '6px',
    flexShrink: 0
  },
  chapterContent: {
    flex: 1
  },
  chapterHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px'
  },
  chapterOrder: {
    fontSize: '12px',
    color: '#999',
    fontWeight: 500
  },
  moodBadge: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 500,
    padding: '0 8px'
  },
  chapterTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#333',
    margin: '0 0 4px 0'
  },
  pageCount: {
    fontSize: '13px',
    color: '#999'
  }
};

export default ChapterList;
