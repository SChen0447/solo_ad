import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Questionnaire } from '../types';

interface Ripple {
  x: number;
  y: number;
  size: number;
  id: number;
}

interface Props {
  questionnaire: Questionnaire;
  index: number;
  responseCount: number;
}

function getRelativeTime(dateStr: string): string {
  const now = new Date().getTime();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;

  const nowDate = new Date();
  const targetDate = new Date(dateStr);
  const isYesterday =
    nowDate.getFullYear() === targetDate.getFullYear() &&
    nowDate.getMonth() === targetDate.getMonth() &&
    nowDate.getDate() - targetDate.getDate() === 1;

  if (isYesterday) return '昨天';
  if (diffDay < 7) return `${diffDay}天前`;

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function QuestionnaireCard({ questionnaire, index, responseCount }: Props) {
  const navigate = useNavigate();
  const bgClass = index % 2 === 0 ? 'questionnaire-card-bg-0' : 'questionnaire-card-bg-1';
  const ripplesRef = useRef<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const newRipple: Ripple = {
      x,
      y,
      size,
      id: ++rippleIdRef.current,
    };
    ripplesRef.current = [...ripplesRef.current, newRipple];
    const container = containerRef.current;
    if (container) {
      const el = document.createElement('span');
      el.className = 'ripple';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.dataset.id = String(newRipple.id);
      container.appendChild(el);
      setTimeout(() => {
        ripplesRef.current = ripplesRef.current.filter((r) => r.id !== newRipple.id);
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 420);
    }
    navigate(`/detail/${questionnaire.id}`);
  };

  return (
    <div
      className={`questionnaire-card ${bgClass}`}
      onClick={handleClick}
    >
      <div ref={containerRef} className="ripple-container" />
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
        <span>{getRelativeTime(questionnaire.createdAt)}</span>
        <span>{responseCount} 回答</span>
      </div>
    </div>
  );
}
