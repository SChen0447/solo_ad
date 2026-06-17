import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import type { Question, QuestionType } from '../types';

interface Props {
  questions: Question[];
  setQuestions: (qs: Question[]) => void;
}

const defaultOptions = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    label: `选项${i + 1}`,
    value: `option_${i + 1}`,
  }));

export default function QuestionForm({ questions, setQuestions }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [newId, setNewId] = useState<string | null>(null);

  const addQuestion = (type: QuestionType) => {
    if (questions.length >= 5) {
      alert('最多只能添加5个问题');
      return;
    }
    const id = uuidv4();
    const q: Question = {
      id,
      type,
      title: '',
      required: true,
      order: questions.length,
      options: type === 'scale' ? undefined : defaultOptions(4),
    };
    setQuestions([...questions, q]);
    setNewId(id);
    setTimeout(() => setNewId(null), 400);
  };

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions(
      questions
        .filter((q) => q.id !== id)
        .map((q, i) => ({ ...q, order: i }))
    );
  };

  const updateOption = (qid: string, idx: number, label: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qid || !q.options) return q;
        const opts = [...q.options];
        opts[idx] = { ...opts[idx], label };
        return { ...q, options: opts };
      })
    );
  };

  const addOption = (qid: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qid || !q.options) return q;
        const idx = q.options.length + 1;
        return {
          ...q,
          options: [
            ...q.options,
            { label: `选项${idx}`, value: `option_${idx}` },
          ],
        };
      })
    );
  };

  const removeOption = (qid: string, idx: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qid || !q.options || q.options.length <= 2) return q;
        return {
          ...q,
          options: q.options.filter((_, i) => i !== idx),
        };
      })
    );
  };

  const onDragStart = (e: React.DragEvent, i: number) => {
    setDragIndex(i);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== i) setDragOverIndex(i);
  };

  const onDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const arr = [...questions];
      const [item] = arr.splice(dragIndex, 1);
      arr.splice(dragOverIndex, 0, item);
      setQuestions(arr.map((q, i) => ({ ...q, order: i })));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-3">
      {questions.map((q, idx) => {
        const isDragging = dragIndex === idx;
        const isOver = dragOverIndex === idx && dragIndex !== idx;
        return (
          <div
            key={q.id}
            className={`question-card fade-in ${
              isDragging ? 'dragging opacity-60' : ''
            } ${isOver ? 'ring-2 ring-blue-400' : ''} ${
              newId === q.id ? '' : ''
            }`}
            draggable
            onDragStart={(e) => onDragStart(e, idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDragEnd={onDragEnd}
          >
            <div className="flex items-start gap-2">
              <div className="cursor-grab text-slate-400 pt-2">
                <GripVertical size={18} />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
                    {q.type === 'single'
                      ? '单选'
                      : q.type === 'multiple'
                      ? '多选'
                      : '量表 1-5'}
                  </span>
                  <input
                    type="text"
                    value={q.title}
                    placeholder="请输入题目标题"
                    onChange={(e) =>
                      updateQuestion(q.id, { title: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) =>
                        updateQuestion(q.id, { required: e.target.checked })
                      }
                    />
                    必答
                  </label>
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {q.type !== 'scale' && q.options && (
                  <div className="pl-1 space-y-2">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block" />
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) =>
                            updateOption(q.id, optIdx, e.target.value)
                          }
                          className="flex-1 px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        {q.options!.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(q.id, optIdx)}
                            className="text-slate-400 hover:text-red-500 text-xs px-1"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(q.id)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      + 添加选项
                    </button>
                  </div>
                )}

                {q.type === 'scale' && (
                  <div className="pl-1 text-xs text-slate-500">
                    1 分（非常不满意） —— 5 分（非常满意）
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {questions.length < 5 && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => addQuestion('single')}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600"
          >
            <Plus size={16} /> 添加单选题
          </button>
          <button
            type="button"
            onClick={() => addQuestion('multiple')}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600"
          >
            <Plus size={16} /> 添加多选题
          </button>
          <button
            type="button"
            onClick={() => addQuestion('scale')}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600"
          >
            <Plus size={16} /> 添加量表题
          </button>
        </div>
      )}
    </div>
  );
}
