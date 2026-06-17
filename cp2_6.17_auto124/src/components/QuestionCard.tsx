import { useNavigate } from 'react-router-dom';
import type { Questionnaire } from '../types';

interface Props {
  questionnaire: Questionnaire;
  index: number;
  responseCount: number;
}

export default function QuestionnaireCard({ questionnaire, index, responseCount }: Props) {
  const navigate = useNavigate();
  const bgClass = index % 2 === 0 ? 'questionnaire-card-bg-0' : 'questionnaire-card-bg-1';

  return (
    <div
      className={`questionnaire-card ${bgClass}`}
      onClick={() => navigate(`/detail/${questionnaire.id}`)}
    >
      <span className={`status-tag ${questionnaire.status}`}>
        {questionnaire.status === 'active' ? '进行中' : '已结束'}
      </span>
      <div className="mt-10">
        <h3 className="text-lg font-semibold text-slate-800 line-clamp-1">
          {questionnaire.title}
        </h3>
        <p className="text-sm text-slate-500 mt-2 line-clamp-3">
          {questionnaire.description}
        </p>
      </div>
      <div className="mt-auto flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-200/60">
        <span>{questionnaire.questions.length} 题</span>
        <span>{responseCount} 回答</span>
      </div>
    </div>
  );
}
