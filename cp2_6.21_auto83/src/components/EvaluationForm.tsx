import { useState } from 'react';
import StarRating from './StarRating';
import './EvaluationForm.css';

interface Evaluation {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
}

interface EvaluationFormProps {
  instrumentId: string;
  onSubmit: (evaluation: Evaluation) => void;
}

function EvaluationForm({ instrumentId, onSubmit }: EvaluationFormProps) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const maxLength = 200;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating < 1 || rating > 5) return;
    if (!content.trim()) return;
    if (content.length > maxLength) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/instruments/${instrumentId}/evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          content: content.trim(),
        }),
      });

      if (res.ok) {
        const newEvaluation = await res.json();
        onSubmit(newEvaluation);
        setContent('');
        setRating(5);
      }
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="evaluation-form" onSubmit={handleSubmit}>
      <h4 className="form-title">发表评价</h4>
      
      <div className="form-group">
        <label className="form-label">评分</label>
        <StarRating rating={rating} size={28} interactive onChange={setRating} />
      </div>

      <div className="form-group">
        <label className="form-label">评价内容</label>
        <textarea
          className="form-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, maxLength))}
          placeholder="分享您的使用体验..."
          rows={4}
        />
        <div className="char-count">
          {content.length} / {maxLength}
        </div>
      </div>

      <button
        type="submit"
        className="submit-btn"
        disabled={submitting || !content.trim() || rating < 1}
      >
        {submitting ? '提交中...' : '提交评价'}
      </button>
    </form>
  );
}

export default EvaluationForm;
