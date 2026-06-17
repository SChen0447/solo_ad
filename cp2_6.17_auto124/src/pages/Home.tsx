import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useSurveyStore } from '../store';
import QuestionnaireCard from '../components/QuestionCard';

export default function Home() {
  const navigate = useNavigate();
  const questionnaires = useSurveyStore((s) => s.questionnaires);
  const responses = useSurveyStore((s) => s.responses);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">我的问卷</h1>
          <p className="text-sm text-slate-500 mt-1">
            共 {questionnaires.length} 个问卷，{responses.length} 份回答
          </p>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="submit-btn !px-5 !py-2.5 !text-sm flex items-center gap-2"
        >
          <Plus size={18} />
          创建问卷
        </button>
      </div>

      {questionnaires.length === 0 ? (
        <div className="stat-card text-center py-20">
          <div className="text-slate-400 text-5xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            还没有问卷
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            点击右上角按钮创建你的第一个微型问卷吧
          </p>
          <button
            onClick={() => navigate('/create')}
            className="submit-btn !px-6 !py-2.5 !text-sm"
          >
            立即创建
          </button>
        </div>
      ) : (
        <div
          className="cards-grid grid gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, 260px)' }}
        >
          {questionnaires.map((q, idx) => {
            const count = responses.filter(
              (r) => r.questionnaireId === q.id
            ).length;
            return (
              <QuestionnaireCard
                key={q.id}
                questionnaire={q}
                index={idx}
                responseCount={count}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
