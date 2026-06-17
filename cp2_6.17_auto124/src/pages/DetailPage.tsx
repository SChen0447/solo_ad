import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Loader2,
  Link as LinkIcon,
  Copy,
  Play,
  Pause,
} from 'lucide-react';
import { useSurveyStore } from '../store';
import StatChart from '../components/StatChart';

export default function DetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const questionnaire = useSurveyStore((s) =>
    s.questionnaires.find((q) => q.id === id)
  );
  const allResponses = useSurveyStore((s) => s.responses);
  const updateStatus = useSurveyStore((s) => s.updateQuestionnaireStatus);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!questionnaire) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-slate-600 text-lg">问卷不存在</div>
      </div>
    );
  }

  const responses = allResponses.filter((r) => r.questionnaireId === id);
  const shareLink = `/response/${id}`;

  const copyLink = async () => {
    const full = window.location.origin + shareLink;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert('复制失败，请手动复制: ' + full);
    }
  };

  const exportCSV = () => {
    if (responses.length === 0) {
      alert('暂无数据可导出');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const headers = ['提交时间', ...questionnaire.questions.map((q) => q.title)];
      const rows = responses.map((r) => {
        const row: string[] = [new Date(r.createdAt).toLocaleString()];
        questionnaire.questions.forEach((q) => {
          const ans = r.answers.find((a) => a.questionId === q.id);
          if (!ans) {
            row.push('');
          } else if (Array.isArray(ans.value)) {
            const labels = ans.value
              .map((v) => {
                const opt = q.options?.find((o) => o.value === v);
                return opt ? opt.label : v;
              })
              .join(';');
            row.push(labels);
          } else {
            const opt = q.options?.find((o) => o.value === ans.value);
            row.push(opt ? opt.label : String(ans.value));
          }
        });
        return row;
      });
      const csv =
        '\ufeff' +
        [headers, ...rows]
          .map((r) =>
            r
              .map((cell) => {
                const c = String(cell ?? '').replace(/"/g, '""');
                return /[",\n]/.test(c) ? `"${c}"` : c;
              })
              .join(',')
          )
          .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${questionnaire.title || '问卷'}_结果.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLoading(false);
    }, 300);
  };

  const toggleStatus = () => {
    updateStatus(
      id,
      questionnaire.status === 'active' ? 'closed' : 'active'
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-white/70 text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 flex-1">
          {questionnaire.title}
        </h1>
        <span
          className={`status-tag static ${questionnaire.status}`}
        >
          {questionnaire.status === 'active' ? '进行中' : '已结束'}
        </span>
      </div>

      <div className="stat-card mb-6">
        <p className="text-slate-600 text-sm mb-4">{questionnaire.description}</p>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-sm flex-1 min-w-[200px]">
            <LinkIcon size={16} className="text-slate-400" />
            <span className="text-slate-500 truncate">{shareLink}</span>
            <button
              onClick={copyLink}
              className="ml-auto text-blue-600 hover:text-blue-700 text-xs font-medium"
            >
              {copied ? '已复制' : <Copy size={14} />}
            </button>
          </div>
          <Link
            to={shareLink}
            target="_blank"
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"
          >
            预览填写页
          </Link>
          <button
            onClick={toggleStatus}
            className="flex items-center gap-1 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm hover:bg-slate-100"
          >
            {questionnaire.status === 'active' ? (
              <>
                <Pause size={14} /> 结束问卷
              </>
            ) : (
              <>
                <Play size={14} /> 重新开启
              </>
            )}
          </button>
          <button
            onClick={exportCSV}
            disabled={loading}
            className="flex items-center gap-2 submit-btn !px-4 !py-2 !text-sm"
          >
            {loading ? (
              <Loader2 size={16} className="spinner" />
            ) : (
              <Download size={16} />
            )}
            导出 CSV
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          统计结果（共 {responses.length} 份回答）
        </h2>
        {questionnaire.questions.length === 0 ? (
          <div className="stat-card text-center text-slate-500 py-12">
            该问卷还没有题目
          </div>
        ) : (
          questionnaire.questions.map((q) => (
            <StatChart key={q.id} question={q} responses={responses} />
          ))
        )}
      </div>
    </div>
  );
}
