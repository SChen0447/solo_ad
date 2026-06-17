import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ideaApi } from '../../services/api';
import MatrixCard from './MatrixCard';
import type { Idea, Weights } from '../../types';

interface MatrixViewProps {
  ideas: Idea[];
  weights: Weights;
  onWeightsChange: (weights: Weights) => void;
  onIdeaUpdated: (idea: Idea) => void;
}

export default function MatrixView({
  ideas,
  weights,
  onWeightsChange,
  onIdeaUpdated
}: MatrixViewProps) {
  const [importanceWeight, setImportanceWeight] = useState(weights.importance_weight);
  const [urgencyWeight, setUrgencyWeight] = useState(weights.urgency_weight);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const matrixRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setImportanceWeight(weights.importance_weight);
    setUrgencyWeight(weights.urgency_weight);
  }, [weights]);

  const handleWeightChange = useCallback(
    (type: 'importance' | 'urgency', value: number) => {
      if (type === 'importance') {
        setImportanceWeight(value);
      } else {
        setUrgencyWeight(value);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const newWeights = {
          importance_weight: type === 'importance' ? value : importanceWeight,
          urgency_weight: type === 'urgency' ? value : urgencyWeight
        };
        onWeightsChange(newWeights);
      }, 300);
    },
    [importanceWeight, urgencyWeight, onWeightsChange]
  );

  const handleDragStart = useCallback((ideaId: string) => {
    setDraggingId(ideaId);
  }, []);

  const handleDragEnd = useCallback(
    async (ideaId: string, x: number, y: number) => {
      setDraggingId(null);

      if (!matrixRef.current) return;

      const rect = matrixRef.current.getBoundingClientRect();
      const matrixX = (x / rect.width) * 100;
      const matrixY = (1 - y / rect.height) * 100;

      const clampedX = Math.max(5, Math.min(95, matrixX));
      const clampedY = Math.max(5, Math.min(95, matrixY));

      try {
        const updatedIdea = await ideaApi.updateMatrixPosition({
          idea_id: ideaId,
          matrix_x: clampedX,
          matrix_y: clampedY
        });
        onIdeaUpdated(updatedIdea);
      } catch (error) {
        console.error('更新矩阵位置失败:', error);
      }
    },
    [onIdeaUpdated]
  );

  const getQuadrant = useCallback((x: number, y: number) => {
    if (x >= 50 && y >= 50) return 'q1';
    if (x < 50 && y >= 50) return 'q2';
    if (x >= 50 && y < 50) return 'q3';
    return 'q4';
  }, []);

  const getQuadrantLabel = useCallback((quadrant: string) => {
    const labels: Record<string, string> = {
      q1: '重要且紧急',
      q2: '重要不紧急',
      q3: '不重要但紧急',
      q4: '不重要不紧急'
    };
    return labels[quadrant] || quadrant;
  }, []);

  const ideasByQuadrant = {
    q1: ideas.filter((i) => getQuadrant(i.matrix_x, i.matrix_y) === 'q1'),
    q2: ideas.filter((i) => getQuadrant(i.matrix_x, i.matrix_y) === 'q2'),
    q3: ideas.filter((i) => getQuadrant(i.matrix_x, i.matrix_y) === 'q3'),
    q4: ideas.filter((i) => getQuadrant(i.matrix_x, i.matrix_y) === 'q4')
  };

  return (
    <div className="matrix-view">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="matrix-controls"
      >
        <div className="slider-control">
          <span className="slider-label">重要性权重</span>
          <input
            type="range"
            className="slider"
            min="0"
            max="10"
            step="0.1"
            value={importanceWeight}
            onChange={(e) => handleWeightChange('importance', parseFloat(e.target.value))}
          />
          <span className="slider-value">{importanceWeight.toFixed(1)}</span>
        </div>
        <div className="slider-control">
          <span className="slider-label">紧迫性权重</span>
          <input
            type="range"
            className="slider"
            min="0"
            max="10"
            step="0.1"
            value={urgencyWeight}
            onChange={(e) => handleWeightChange('urgency', parseFloat(e.target.value))}
          />
          <span className="slider-value">{urgencyWeight.toFixed(1)}</span>
        </div>
      </motion.div>

      <motion.div
        ref={matrixRef}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="matrix-container"
      >
        <div className="matrix-grid">
          <div className="quadrant quadrant-q1">
            <span className="quadrant-label">
              {getQuadrantLabel('q1')} ({ideasByQuadrant.q1.length})
            </span>
          </div>
          <div className="quadrant quadrant-q2">
            <span className="quadrant-label">
              {getQuadrantLabel('q2')} ({ideasByQuadrant.q2.length})
            </span>
          </div>
          <div className="quadrant quadrant-q3">
            <span className="quadrant-label">
              {getQuadrantLabel('q3')} ({ideasByQuadrant.q3.length})
            </span>
          </div>
          <div className="quadrant quadrant-q4">
            <span className="quadrant-label">
              {getQuadrantLabel('q4')} ({ideasByQuadrant.q4.length})
            </span>
          </div>

          <div className="matrix-axis matrix-axis-x" />
          <div className="matrix-axis matrix-axis-y" />
          <div className="matrix-axis-label axis-label-x">紧急程度 →</div>
          <div className="matrix-axis-label axis-label-y">重要性 →</div>

          <AnimatePresence>
            {ideas.map((idea, index) => (
              <MatrixCard
                key={idea.id}
                idea={idea}
                index={index}
                isDragging={draggingId === idea.id}
                onDragStart={() => handleDragStart(idea.id)}
                onDragEnd={handleDragEnd}
                containerRef={matrixRef}
              />
            ))}
          </AnimatePresence>
        </div>

        {ideas.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">📊</span>
            <p>发布想法后，这里会显示优先级矩阵</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
