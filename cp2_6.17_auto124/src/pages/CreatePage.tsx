import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSurveyStore } from '../store';
import QuestionForm from '../components/QuestionForm';
import type { Question } from '../types';

export default function CreatePage() {
  const navigate = useNavigate();
  const addQuestionnaire = useSurveyStore((s) => s.addQuestionnaire);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('请填写问卷标题');
      return;
    }
    if (questions.length === 0) {
      alert('请至少添加一个题目');
      return;
    }
    for (const q of questions) {
      if (!q.title.trim()) {
        alert('请完善所有题目标题');
        return;
      }
    }
    const id = addQuestionnaire(title.trim(), description.trim(), questions);
    navigate(`/detail/${id}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-white/70 text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">创建问卷</h1>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <div className="stat-card">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              问卷标题 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                maxLength={20}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入问卷标题（最多20字）"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {title.length}/20
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              问卷描述
            </label>
            <div className="relative">
              <textarea
                value={description}
                maxLength={100}
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入问卷描述（最多100字）"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="absolute right-3 bottom-2 text-xs text-slate-400">
                {description.length}/100
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            题目（最多5题）
            <span className="text-xs text-slate-400 ml-2">
              可拖拽调整顺序
            </span>
          </h2>
          <QuestionForm questions={questions} setQuestions={setQuestions} />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
          >
            取消
          </button>
          <button type="submit" className="submit-btn !px-6 !py-2.5">
            创建问卷
          </button>
        </div>
      </form>
    </div>
  );
}
