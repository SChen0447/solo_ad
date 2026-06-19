import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { GripVertical, Play, Shuffle } from 'lucide-react';
import { generatePaper, type ExamRule, type Question } from '../data/questionBank';
import { useAppContext } from '../App';

const typeLabel: Record<string, string> = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
};

const reorder = (list: Question[], startIndex: number, endIndex: number): Question[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

export default function CreatePaperPage() {
  const navigate = useNavigate();
  const { setExamQuestions } = useAppContext();

  const [rule, setRule] = useState<ExamRule>({
    singleCount: 8,
    multipleCount: 4,
    judgeCount: 8,
    easyRatio: 0.4,
    mediumRatio: 0.4,
    hardRatio: 0.2,
  });

  const [paper, setPaper] = useState<Question[]>([]);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    const total = rule.singleCount + rule.multipleCount + rule.judgeCount;
    if (total === 0) {
      alert('请至少设置一种题型的数量');
      return;
    }
    const ratioSum = rule.easyRatio + rule.mediumRatio + rule.hardRatio;
    if (Math.abs(ratioSum - 1) > 0.01) {
      alert('难易度比例之和必须等于1');
      return;
    }
    const result = generatePaper(rule);
    if (result.length === 0) {
      alert('题库中符合条件的题目不足，请调整规则');
      return;
    }
    setPaper(result);
    setGenerated(true);
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = reorder(paper, result.source.index, result.destination.index);
    setPaper(items);
  };

  const handleStartExam = () => {
    if (paper.length === 0) {
      alert('请先生成试卷');
      return;
    }
    setExamQuestions(paper);
    navigate('/exam');
  };

  const totalQuestions = rule.singleCount + rule.multipleCount + rule.judgeCount;
  const totalRatio = (rule.easyRatio + rule.mediumRatio + rule.hardRatio) * 100;

  return (
    <div className="page-container">
      <h1 className="page-title">自动组卷</h1>

      <div className="paper-rule-section" style={{ marginBottom: 24 }}>
        <div className="rule-group">
          <div className="section-title">题型数量设置</div>

          <div className="rule-input-row">
            <label>单选题</label>
            <input
              type="number"
              min={0}
              value={rule.singleCount}
              onChange={(e) => setRule({ ...rule, singleCount: Math.max(0, Number(e.target.value)) })}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>题 × 2分</span>
          </div>

          <div className="rule-input-row">
            <label>多选题</label>
            <input
              type="number"
              min={0}
              value={rule.multipleCount}
              onChange={(e) => setRule({ ...rule, multipleCount: Math.max(0, Number(e.target.value)) })}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>题 × 3分</span>
          </div>

          <div className="rule-input-row">
            <label>判断题</label>
            <input
              type="number"
              min={0}
              value={rule.judgeCount}
              onChange={(e) => setRule({ ...rule, judgeCount: Math.max(0, Number(e.target.value)) })}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>题 × 1分</span>
          </div>

          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--primary-light)', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)' }}>题目总数</span>
              <strong style={{ color: 'var(--primary-color)' }}>{totalQuestions} 题</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4 }}>
              <span style={{ color: 'var(--text-secondary)' }}>试卷满分</span>
              <strong style={{ color: 'var(--primary-color)' }}>
                {rule.singleCount * 2 + rule.multipleCount * 3 + rule.judgeCount} 分
              </strong>
            </div>
          </div>
        </div>

        <div className="rule-group">
          <div className="section-title">难易度分布</div>

          <div className="rule-input-row">
            <label>简单</label>
            <div className="slider-container">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={rule.easyRatio}
                onChange={(e) => setRule({ ...rule, easyRatio: Number(e.target.value) })}
              />
              <span className="slider-value">{Math.round(rule.easyRatio * 100)}%</span>
            </div>
          </div>

          <div className="rule-input-row">
            <label>中等</label>
            <div className="slider-container">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={rule.mediumRatio}
                onChange={(e) => setRule({ ...rule, mediumRatio: Number(e.target.value) })}
              />
              <span className="slider-value">{Math.round(rule.mediumRatio * 100)}%</span>
            </div>
          </div>

          <div className="rule-input-row">
            <label>困难</label>
            <div className="slider-container">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={rule.hardRatio}
                onChange={(e) => setRule({ ...rule, hardRatio: Number(e.target.value) })}
              />
              <span className="slider-value">{Math.round(rule.hardRatio * 100)}%</span>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              borderRadius: 6,
              background: Math.abs(totalRatio - 100) < 1 ? '#E8F5E9' : '#FFEBEE',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)' }}>比例合计</span>
              <strong style={{ color: Math.abs(totalRatio - 100) < 1 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {Math.round(totalRatio)}% {Math.abs(totalRatio - 100) < 1 ? '✓' : '（需等于100%）'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: generated ? 16 : 0 }}>
          <div className="section-title" style={{ margin: 0 }}>
            {generated ? `组卷结果（共 ${paper.length} 题）` : '尚未生成试卷'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={handleGenerate}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Shuffle size={16} /> {generated ? '重新生成' : '生成试卷'}
              </span>
            </button>
            {generated && (
              <>
                <button className="btn-secondary" onClick={handleRegenerate}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Shuffle size={16} /> 随机重排
                  </span>
                </button>
                <button className="btn-primary" onClick={handleStartExam}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Play size={16} /> 开始考试
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {generated && paper.length > 0 && (
        <div className="card">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="paper">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    minHeight: 200,
                    background: snapshot.isDraggingOver ? 'var(--primary-light)' : 'transparent',
                    borderRadius: 8,
                    padding: snapshot.isDraggingOver ? 8 : 0,
                    transition: 'background 200ms ease-out',
                  }}
                >
                  {paper.map((q, index) => (
                    <Draggable key={q.id} draggableId={q.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            transform: snapshot.isDragging
                              ? `${provided.draggableProps.style?.transform} scale(1.02)`
                              : provided.draggableProps.style?.transform,
                            boxShadow: snapshot.isDragging
                              ? '0 12px 24px rgba(0,0,0,0.15)'
                              : 'var(--shadow-sm)',
                            background: snapshot.isDragging ? 'white' : undefined,
                            borderRadius: 8,
                          }}
                          className="drag-item"
                        >
                          <span className="drag-handle">
                            <GripVertical size={18} />
                          </span>
                          <span className="drag-index">{index + 1}</span>
                          <span className={`tag tag-${q.type}`} style={{ flexShrink: 0 }}>
                            {typeLabel[q.type]}
                          </span>
                          <span className={`tag tag-${q.difficulty}`} style={{ flexShrink: 0 }}>
                            {q.difficulty === 'easy' ? '简单' : q.difficulty === 'medium' ? '中等' : '困难'}
                          </span>
                          <span className="drag-content">{q.content}</span>
                          <span style={{ flexShrink: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                            {q.score}分
                          </span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
            💡 提示：拖拽题目左侧手柄可以调整顺序
          </div>
        </div>
      )}

      {!generated && (
        <div className="card empty-state">
          <div className="empty-state-icon">📝</div>
          <div>设置组卷规则后，点击「生成试卷」</div>
        </div>
      )}
    </div>
  );
}
