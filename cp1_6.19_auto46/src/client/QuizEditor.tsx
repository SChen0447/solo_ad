import React, { useState } from 'react';
import { useQuizStore } from './store';
import { Question, QuestionType, ChoiceQuestion, FillQuestion, SortQuestion } from './types';

interface EditableChoice {
  title: string;
  options: string[];
  correctAnswer: number;
}

interface EditableFill {
  title: string;
  blanks: string[];
}

interface EditableSort {
  title: string;
  items: string[];
  correctOrder: number[];
}

const QuizEditor: React.FC = () => {
  const { questions, addQuestion, updateQuestion, deleteQuestion } = useQuizStore();
  const [selectedType, setSelectedType] = useState<QuestionType>('choice');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [choiceData, setChoiceData] = useState<EditableChoice>({
    title: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  });

  const [fillData, setFillData] = useState<EditableFill>({
    title: '',
    blanks: ['']
  });

  const [sortData, setSortData] = useState<EditableSort>({
    title: '',
    items: ['', '', '', ''],
    correctOrder: [0, 1, 2, 3]
  });

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setChoiceData({ title: '', options: ['', '', '', ''], correctAnswer: 0 });
    setFillData({ title: '', blanks: [''] });
    setSortData({ title: '', items: ['', '', '', ''], correctOrder: [0, 1, 2, 3] });
  };

  const handleEditQuestion = (question: Question) => {
    setEditingId(question.id);
    setSelectedType(question.type);
    
    if (question.type === 'choice') {
      setChoiceData({
        title: question.title,
        options: [...question.options],
        correctAnswer: question.correctAnswer
      });
    } else if (question.type === 'fill') {
      setFillData({
        title: question.title,
        blanks: [...question.blanks]
      });
    } else if (question.type === 'sort') {
      setSortData({
        title: question.title,
        items: [...question.items],
        correctOrder: [...question.correctOrder]
      });
    }
  };

  const handleSaveQuestion = async () => {
    try {
      if (selectedType === 'choice') {
        if (!choiceData.title.trim()) {
          alert('请输入题目标题');
          return;
        }
        if (choiceData.options.some(opt => !opt.trim())) {
          alert('请填写所有选项');
          return;
        }
        
        const questionData = {
          type: 'choice' as const,
          title: choiceData.title,
          options: choiceData.options,
          correctAnswer: choiceData.correctAnswer
        };

        if (editingId) {
          const response = await fetch(`/api/questions/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionData)
          });
          if (response.ok) {
            const updated = await response.json();
            updateQuestion(editingId, updated);
          }
        } else {
          const response = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionData)
          });
          if (response.ok) {
            const newQuestion = await response.json();
            addQuestion(newQuestion);
          }
        }
      } else if (selectedType === 'fill') {
        if (!fillData.title.trim()) {
          alert('请输入题目标题');
          return;
        }
        if (fillData.blanks.some(b => !b.trim())) {
          alert('请填写所有空的答案');
          return;
        }

        const questionData = {
          type: 'fill' as const,
          title: fillData.title,
          blanks: fillData.blanks
        };

        if (editingId) {
          const response = await fetch(`/api/questions/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionData)
          });
          if (response.ok) {
            const updated = await response.json();
            updateQuestion(editingId, updated);
          }
        } else {
          const response = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionData)
          });
          if (response.ok) {
            const newQuestion = await response.json();
            addQuestion(newQuestion);
          }
        }
      } else if (selectedType === 'sort') {
        if (!sortData.title.trim()) {
          alert('请输入题目标题');
          return;
        }
        if (sortData.items.some(item => !item.trim())) {
          alert('请填写所有排序项');
          return;
        }

        const questionData = {
          type: 'sort' as const,
          title: sortData.title,
          items: sortData.items,
          correctOrder: sortData.correctOrder
        };

        if (editingId) {
          const response = await fetch(`/api/questions/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionData)
          });
          if (response.ok) {
            const updated = await response.json();
            updateQuestion(editingId, updated);
          }
        } else {
          const response = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionData)
          });
          if (response.ok) {
            const newQuestion = await response.json();
            addQuestion(newQuestion);
          }
        }
      }

      resetForm();
    } catch (error) {
      console.error('保存题目失败:', error);
      alert('保存题目失败，请检查服务是否启动');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('确定要删除这道题吗？')) return;
    
    try {
      const response = await fetch(`/api/questions/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        deleteQuestion(id);
        if (editingId === id) {
          resetForm();
        }
      }
    } catch (error) {
      console.error('删除题目失败:', error);
    }
  };

  const handleAddOption = () => {
    if (selectedType === 'choice') {
      setChoiceData(prev => ({
        ...prev,
        options: [...prev.options, '']
      }));
    } else if (selectedType === 'fill') {
      setFillData(prev => ({
        ...prev,
        blanks: [...prev.blanks, '']
      }));
    } else if (selectedType === 'sort') {
      const newIndex = sortData.items.length;
      setSortData(prev => ({
        ...prev,
        items: [...prev.items, ''],
        correctOrder: [...prev.correctOrder, newIndex]
      }));
    }
  };

  const handleRemoveOption = (index: number) => {
    if (selectedType === 'choice') {
      if (choiceData.options.length <= 4) {
        alert('单选题至少需要4个选项');
        return;
      }
      setChoiceData(prev => {
        const newOptions = prev.options.filter((_, i) => i !== index);
        let newCorrect = prev.correctAnswer;
        if (index < prev.correctAnswer) {
          newCorrect = prev.correctAnswer - 1;
        } else if (index === prev.correctAnswer) {
          newCorrect = 0;
        }
        return { ...prev, options: newOptions, correctAnswer: newCorrect };
      });
    } else if (selectedType === 'fill') {
      if (fillData.blanks.length <= 1) {
        alert('填空题至少需要1个空位');
        return;
      }
      setFillData(prev => ({
        ...prev,
        blanks: prev.blanks.filter((_, i) => i !== index)
      }));
    } else if (selectedType === 'sort') {
      if (sortData.items.length <= 2) {
        alert('排序题至少需要2个选项');
        return;
      }
      setSortData(prev => {
        const newItems = prev.items.filter((_, i) => i !== index);
        const newOrder = prev.correctOrder
          .filter(i => i !== index)
          .map(i => i > index ? i - 1 : i);
        return { ...prev, items: newItems, correctOrder: newOrder };
      });
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    
    const newItems = [...sortData.items];
    const newOrder = [...sortData.correctOrder];
    
    const draggedItem = newItems[dragIndex];
    newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, draggedItem);
    
    const draggedOrder = newOrder[dragIndex];
    newOrder.splice(dragIndex, 1);
    newOrder.splice(index, 0, draggedOrder);
    
    setSortData(prev => ({ ...prev, items: newItems, correctOrder: newOrder }));
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const getTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'choice': return '单选题';
      case 'fill': return '填空题';
      case 'sort': return '排序题';
    }
  };

  const getTypeColor = (type: QuestionType) => {
    switch (type) {
      case 'choice': return '#3498db';
      case 'fill': return '#2ecc71';
      case 'sort': return '#e67e22';
    }
  };

  return (
    <div className="quiz-editor">
      <h2>题目编辑器</h2>
      
      <div className="editor-layout">
        <div className="question-list">
          <h3>题目列表 ({questions.length})</h3>
          <div className="question-items">
            {questions.map((q, index) => (
              <div 
                key={q.id} 
                className={`question-item ${editingId === q.id ? 'active' : ''}`}
                onClick={() => handleEditQuestion(q)}
              >
                <div 
                  className="question-type-bar"
                  style={{ backgroundColor: getTypeColor(q.type) }}
                />
                <div className="question-item-content">
                  <span className="question-index">第 {index + 1} 题</span>
                  <span className="question-type-tag" style={{ color: getTypeColor(q.type) }}>
                    {getTypeLabel(q.type)}
                  </span>
                  <p className="question-title-preview">{q.title}</p>
                </div>
                <button 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteQuestion(q.id);
                  }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="editor-form">
          <div className="type-selector">
            <span>选择题型：</span>
            <div className="type-buttons">
              {(['choice', 'fill', 'sort'] as QuestionType[]).map(type => (
                <button
                  key={type}
                  className={`type-btn ${selectedType === type ? 'active' : ''}`}
                  style={{ 
                    borderColor: selectedType === type ? getTypeColor(type) : '#ddd',
                    backgroundColor: selectedType === type ? getTypeColor(type) + '15' : 'transparent'
                  }}
                  onClick={() => {
                    setSelectedType(type);
                    resetForm();
                  }}
                >
                  {getTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {selectedType === 'choice' && (
            <div className="form-section">
              <label>
                题目标题：
                <textarea
                  value={choiceData.title}
                  onChange={(e) => setChoiceData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="请输入题目内容"
                  rows={3}
                />
              </label>
              
              <div className="options-list">
                <label>选项（至少4个）：</label>
                {choiceData.options.map((option, index) => (
                  <div key={index} className="option-row">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={choiceData.correctAnswer === index}
                      onChange={() => setChoiceData(prev => ({ ...prev, correctAnswer: index }))}
                      title="设为正确答案"
                    />
                    <span className="option-label">{String.fromCharCode(65 + index)}.</span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...choiceData.options];
                        newOptions[index] = e.target.value;
                        setChoiceData(prev => ({ ...prev, options: newOptions }));
                      }}
                      placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                    />
                    <button 
                      className="remove-option-btn"
                      onClick={() => handleRemoveOption(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className="add-option-btn" onClick={handleAddOption}>
                  + 添加选项
                </button>
              </div>
            </div>
          )}

          {selectedType === 'fill' && (
            <div className="form-section">
              <label>
                题目标题（用 ___ 表示空位）：
                <textarea
                  value={fillData.title}
                  onChange={(e) => setFillData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="例如：React 中用于管理状态的 Hook 是 ___"
                  rows={3}
                />
              </label>
              
              <div className="blanks-list">
                <label>正确答案（按顺序）：</label>
                {fillData.blanks.map((blank, index) => (
                  <div key={index} className="blank-row">
                    <span className="blank-index">空 {index + 1}:</span>
                    <input
                      type="text"
                      value={blank}
                      onChange={(e) => {
                        const newBlanks = [...fillData.blanks];
                        newBlanks[index] = e.target.value;
                        setFillData(prev => ({ ...prev, blanks: newBlanks }));
                      }}
                      placeholder={`第 ${index + 1} 个空的答案`}
                    />
                    <button 
                      className="remove-option-btn"
                      onClick={() => handleRemoveOption(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className="add-option-btn" onClick={handleAddOption}>
                  + 添加空位
                </button>
              </div>
            </div>
          )}

          {selectedType === 'sort' && (
            <div className="form-section">
              <label>
                题目标题：
                <textarea
                  value={sortData.title}
                  onChange={(e) => setSortData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="请输入排序题目的描述"
                  rows={3}
                />
              </label>
              
              <div className="sort-list">
                <label>正确顺序（拖拽调整顺序）：</label>
                {sortData.items.map((item, index) => (
                  <div 
                    key={index} 
                    className={`sort-row ${dragIndex === index ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="sort-handle">⋮⋮</span>
                    <span className="sort-index">{index + 1}.</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...sortData.items];
                        newItems[index] = e.target.value;
                        setSortData(prev => ({ ...prev, items: newItems }));
                      }}
                      placeholder={`排序项 ${index + 1}`}
                    />
                    <button 
                      className="remove-option-btn"
                      onClick={() => handleRemoveOption(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className="add-option-btn" onClick={handleAddOption}>
                  + 添加排序项
                </button>
              </div>
            </div>
          )}

          <div className="form-actions">
            {editingId && (
              <button className="cancel-btn" onClick={resetForm}>
                取消编辑
              </button>
            )}
            <button className="save-btn" onClick={handleSaveQuestion}>
              {editingId ? '更新题目' : '保存题目'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizEditor;
