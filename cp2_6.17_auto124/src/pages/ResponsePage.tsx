import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useSurveyStore } from '../store';
import type { Answer } from '../types';

export default function ResponsePage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const questionnaire = useSurveyStore((s) =>
    s.questionnaires.find((q) => q.id === id)
  );
  const addResponse = useSurveyStore((s) => s.addResponse);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!questionnaire) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-slate-600 text-lg">问卷不存在或已删除</div>
      </div>
    );
  }

  const allQuestions = questionnaire.questions;
  const answeredCount = allQuestions.filter((q) => {
    const v = answers[q.id];
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }).length;
  const progress =
    allQuestions.length > 0 ? (answeredCount / allQuestions.length) * 100 : 0;

  const validateRequired = () => {
    for (const q of allQuestions) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (!v || (Array.isArray(v) && v.length === 0)) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateRequired()) {
      alert('请填写所有必填题目');
      return;
    }
    const list: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));
    addResponse(id, list);
    setSubmitted(true);
  };

  useEffect(() => {
    if (submitted) {
      const t = setTimeout(() => {
        navigate('/');
      }, 500);
      return () => clearTimeout(t);
    }
  }, [submitted, navigate]);

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center flex-col gap-4">
        <div className="success-checkmark w-24 h-24 rounded-full bg-green-50 flex items-center justify-center">
          <Check className="w-12 h-12 text-green-500" strokeWidth={3} />
        </div>
        <div className="text-xl font-semibold text-slate-800">提交成功！</div>
        <div className="text-sm text-slate-500">即将返回首页...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="stat-card mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          {questionnaire.title}
        </h1>
        <p className="text-slate-500 text-sm mb-6">{questionnaire.description}</p>
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>答题进度</span>
          <span>
            {answeredCount}/{allQuestions.length}
          </span>
        </div>
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {allQuestions.map((q, idx) => (
          <div key={q.id} className="stat-card">
            <div className="mb-4 text-base font-medium text-slate-800">
              <span className="text-sm text-slate-400 mr-2">{idx + 1}.</span>
              {q.required && <span className="required-star">*</span>}
              {q.title}
            </div>

            {q.type === 'single' && q.options && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.value}
                      checked={answers[q.id] === opt.value}
                      onChange={(e) =>
                        setAnswers({ ...answers, [q.id]: e.target.value })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'multiple' && q.options && (
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const current = (answers[q.id] as string[]) || [];
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={current.includes(opt.value)}
                        onChange={(e) => {
                          let next: string[];
                          if (e.target.checked) {
                            next = [...current, opt.value];
                          } else {
                            next = current.filter((v) => v !== opt.value);
                          }
                          setAnswers({ ...answers, [q.id]: next });
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-slate-700">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === 'scale' && (
              <div className="flex gap-2 justify-between">
                {[1, 2, 3, 4, 5].map((v) => {
                  const selected = answers[q.id] === String(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        setAnswers({ ...answers, [q.id]: String(v) })
                      }
                      className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-base font-medium transition-colors ${
                        selected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-center pt-4">
          <button type="submit" className="submit-btn">
            提交问卷
          </button>
        </div>
      </form>
    </div>
  );
}
