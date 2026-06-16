import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { EditorAPI } from '../api/EditorAPI';
import { StoryPage, StoryOption } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const createEmptyPage = (): StoryPage => ({
  id: generateId(),
  title: '',
  content: '',
  backgroundColor: '#FFFAF0',
  backgroundImage: '',
  musicUrl: '',
  options: []
});

const createEmptyOption = (): StoryOption => ({
  id: generateId(),
  text: '',
  targetPageIndex: 0
});

const Editor: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const [storyTitle, setStoryTitle] = useState('未命名故事');
  const [pages, setPages] = useState<StoryPage[]>([createEmptyPage()]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (storyId) {
      EditorAPI.getStory(storyId).then(story => {
        setStoryTitle(story.title);
        setPages(story.pages.length > 0 ? story.pages : [createEmptyPage()]);
      }).catch(() => {
        setPages([createEmptyPage()]);
      });
    }
  }, [storyId]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(pages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setPages(items);
    if (selectedPageIndex === result.source.index) {
      setSelectedPageIndex(result.destination.index);
    } else if (
      result.source.index < selectedPageIndex &&
      result.destination.index >= selectedPageIndex
    ) {
      setSelectedPageIndex(selectedPageIndex - 1);
    } else if (
      result.source.index > selectedPageIndex &&
      result.destination.index <= selectedPageIndex
    ) {
      setSelectedPageIndex(selectedPageIndex + 1);
    }
  };

  const addPage = () => {
    const newPage = createEmptyPage();
    setPages([...pages, newPage]);
    setSelectedPageIndex(pages.length);
  };

  const removePage = (index: number) => {
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    if (selectedPageIndex >= index && selectedPageIndex > 0) {
      setSelectedPageIndex(selectedPageIndex - 1);
    }
  };

  const updatePage = (index: number, updates: Partial<StoryPage>) => {
    const newPages = [...pages];
    newPages[index] = { ...newPages[index], ...updates };
    setPages(newPages);
  };

  const addOption = (pageIndex: number) => {
    if (pages[pageIndex].options.length >= 3) return;
    const newPages = [...pages];
    newPages[pageIndex].options = [...newPages[pageIndex].options, createEmptyOption()];
    setPages(newPages);
  };

  const removeOption = (pageIndex: number, optionIndex: number) => {
    const newPages = [...pages];
    newPages[pageIndex].options = newPages[pageIndex].options.filter((_, i) => i !== optionIndex);
    setPages(newPages);
  };

  const updateOption = (pageIndex: number, optionIndex: number, updates: Partial<StoryOption>) => {
    const newPages = [...pages];
    newPages[pageIndex].options[optionIndex] = { ...newPages[pageIndex].options[optionIndex], ...updates };
    setPages(newPages);
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (storyId) {
        await EditorAPI.updateStory(storyId, storyTitle, pages);
      } else {
        const story = await EditorAPI.createStory(storyTitle, pages);
        navigate(`/editor/${story.story_id}`);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [storyId, storyTitle, pages, navigate]);

  const currentPage = pages[selectedPageIndex];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <input
          type="text"
          value={storyTitle}
          onChange={(e) => setStoryTitle(e.target.value)}
          style={styles.titleInput}
          placeholder="故事标题"
        />
        <button onClick={handleSave} disabled={isSaving} style={styles.saveButton}>
          {isSaving ? '保存中...' : '保存故事'}
        </button>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          返回市场
        </button>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span style={styles.sidebarTitle}>页面列表</span>
            <button onClick={addPage} style={styles.addPageButton}>+</button>
          </div>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="pages">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} style={styles.pageList}>
                  {pages.map((page, index) => (
                    <Draggable key={page.id} draggableId={page.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...styles.pageThumbnail,
                            ...(selectedPageIndex === index ? styles.selectedThumbnail : {}),
                            ...(snapshot.isDragging ? styles.draggingThumbnail : {}),
                            backgroundColor: page.backgroundColor || '#FFFAF0'
                          }}
                          onClick={() => setSelectedPageIndex(index)}
                        >
                          {snapshot.isDragging && <div style={styles.placeholder} />}
                          <div style={styles.thumbnailContent}>
                            <span style={styles.pageNumber}>第{index + 1}页</span>
                            <span style={styles.pageTitleThumb}>{page.title || '未命名'}</span>
                          </div>
                          {pages.length > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); removePage(index); }}
                              style={styles.removePageButton}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <div style={styles.editorPanel}>
          <div style={styles.editorSection}>
            <label style={styles.label}>标题</label>
            <input
              type="text"
              value={currentPage?.title || ''}
              onChange={(e) => updatePage(selectedPageIndex, { title: e.target.value })}
              style={styles.textInput}
              placeholder="页面标题"
            />
          </div>

          <div style={styles.editorSection}>
            <label style={styles.label}>正文内容</label>
            <textarea
              value={currentPage?.content || ''}
              onChange={(e) => updatePage(selectedPageIndex, { content: e.target.value })}
              style={styles.textarea}
              placeholder="在这里输入故事内容..."
              rows={6}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.editorSection}>
              <label style={styles.label}>背景颜色</label>
              <input
                type="color"
                value={currentPage?.backgroundColor || '#FFFAF0'}
                onChange={(e) => updatePage(selectedPageIndex, { backgroundColor: e.target.value })}
                style={styles.colorInput}
              />
            </div>
            <div style={styles.editorSection}>
              <label style={styles.label}>背景图片URL</label>
              <input
                type="text"
                value={currentPage?.backgroundImage || ''}
                onChange={(e) => updatePage(selectedPageIndex, { backgroundImage: e.target.value })}
                style={styles.textInput}
                placeholder="图片链接"
              />
            </div>
          </div>

          <div style={styles.editorSection}>
            <label style={styles.label}>配乐链接</label>
            <input
              type="text"
              value={currentPage?.musicUrl || ''}
              onChange={(e) => updatePage(selectedPageIndex, { musicUrl: e.target.value })}
              style={styles.textInput}
              placeholder="音乐URL（可选）"
            />
          </div>

          <div style={styles.editorSection}>
            <div style={styles.optionsHeader}>
              <label style={styles.label}>交互选项 ({currentPage?.options.length || 0}/3)</label>
              {(currentPage?.options.length || 0) < 3 && (
                <button onClick={() => addOption(selectedPageIndex)} style={styles.addOptionButton}>
                  + 添加选项
                </button>
              )}
            </div>
            {currentPage?.options.map((option, optIndex) => (
              <div key={option.id} style={styles.optionRow}>
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => updateOption(selectedPageIndex, optIndex, { text: e.target.value })}
                  style={styles.optionTextInput}
                  placeholder="选项文本"
                />
                <select
                  value={option.targetPageIndex}
                  onChange={(e) => updateOption(selectedPageIndex, optIndex, { targetPageIndex: parseInt(e.target.value) })}
                  style={styles.optionSelect}
                >
                  {pages.map((_, idx) => (
                    <option key={idx} value={idx}>跳转到第{idx + 1}页</option>
                  ))}
                </select>
                <button
                  onClick={() => removeOption(selectedPageIndex, optIndex)}
                  style={styles.removeOptionButton}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.previewPanel}>
          <div style={styles.previewHeader}>
            <span style={styles.previewTitle}>实时预览</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                ...styles.previewContent,
                backgroundColor: currentPage?.backgroundColor || '#FFFAF0',
                backgroundImage: currentPage?.backgroundImage ? `url(${currentPage.backgroundImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div style={styles.previewCard}>
                <h2 style={styles.previewCardTitle}>{currentPage?.title || '标题'}</h2>
                <p style={styles.previewCardContent}>
                  {currentPage?.content || '在这里输入故事内容...'}
                </p>
                <div style={styles.previewOptions}>
                  {currentPage?.options.map((option) => (
                    <button
                      key={option.id}
                      style={styles.previewOptionButton}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
                        (e.target as HTMLButtonElement).style.backgroundColor = '#D2691E';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.transform = 'scale(1)';
                        (e.target as HTMLButtonElement).style.backgroundColor = '#E07A2F';
                      }}
                    >
                      {option.text || '选项'}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#FFFAF0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#333333'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#FFE4C4',
    borderBottom: '1px solid #DEB887',
    gap: '16px'
  },
  titleInput: {
    flex: 1,
    fontSize: '24px',
    fontWeight: 'bold',
    padding: '8px 12px',
    border: '2px solid transparent',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    color: '#333333',
    outline: 'none'
  },
  saveButton: {
    padding: '10px 24px',
    backgroundColor: '#E07A2F',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  backButton: {
    padding: '10px 24px',
    backgroundColor: '#8B7355',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  sidebar: {
    width: '220px',
    backgroundColor: '#FFF8DC',
    borderRight: '1px solid #DEB887',
    display: 'flex',
    flexDirection: 'column'
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #DEB887'
  },
  sidebarTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#5D4E37'
  },
  addPageButton: {
    width: '32px',
    height: '32px',
    backgroundColor: '#E07A2F',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px'
  },
  pageThumbnail: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    marginBottom: '8px',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
    minHeight: '60px'
  },
  selectedThumbnail: {
    borderColor: '#E07A2F',
    boxShadow: '0 2px 8px rgba(224, 122, 47, 0.3)'
  },
  draggingThumbnail: {
    opacity: 0.8,
    transform: 'rotate(2deg)'
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    border: '2px dashed #E07A2F',
    borderRadius: '8px'
  },
  thumbnailContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: 0
  },
  pageNumber: {
    fontSize: '12px',
    color: '#8B7355',
    fontWeight: '600'
  },
  pageTitleThumb: {
    fontSize: '14px',
    color: '#333333',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  removePageButton: {
    width: '24px',
    height: '24px',
    backgroundColor: '#CD5C5C',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '8px'
  },
  editorPanel: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    backgroundColor: '#FFFAF0'
  },
  editorSection: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#5D4E37',
    marginBottom: '8px'
  },
  textInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #DEB887',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    outline: 'none'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #DEB887',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none'
  },
  row: {
    display: 'flex',
    gap: '16px'
  },
  colorInput: {
    width: '60px',
    height: '40px',
    border: '1px solid #DEB887',
    borderRadius: '6px',
    cursor: 'pointer',
    padding: '2px'
  },
  optionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  addOptionButton: {
    padding: '6px 12px',
    backgroundColor: '#DEB887',
    color: '#5D4E37',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  optionRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    alignItems: 'center'
  },
  optionTextInput: {
    flex: 1,
    padding: '8px 10px',
    border: '1px solid #DEB887',
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: 'white',
    outline: 'none'
  },
  optionSelect: {
    padding: '8px 10px',
    border: '1px solid #DEB887',
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: 'white',
    outline: 'none'
  },
  removeOptionButton: {
    padding: '8px 12px',
    backgroundColor: '#CD5C5C',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  previewPanel: {
    width: '450px',
    backgroundColor: '#FFF8DC',
    borderLeft: '1px solid #DEB887',
    display: 'flex',
    flexDirection: 'column'
  },
  previewHeader: {
    padding: '16px',
    borderBottom: '1px solid #DEB887'
  },
  previewTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#5D4E37'
  },
  previewContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px'
  },
  previewCard: {
    width: '100%',
    maxWidth: '380px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '32px',
    borderRadius: '16px',
    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.1)'
  },
  previewCardTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: '16px',
    textAlign: 'center'
  },
  previewCardContent: {
    fontSize: '15px',
    lineHeight: '1.8',
    color: '#444444',
    marginBottom: '24px',
    textAlign: 'justify'
  },
  previewOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  previewOptionButton: {
    padding: '12px 20px',
    backgroundColor: '#E07A2F',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};

export default Editor;
