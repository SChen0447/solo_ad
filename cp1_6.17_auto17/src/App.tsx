import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import Scene3D from './components/Scene3D';
import StepPanel from './components/StepPanel';
import InfoPopup from './components/InfoPopup';

interface Ingredient {
  name: string;
  category: string;
  color: string;
  shape: string;
  status: string;
  position: number;
}

interface Tool {
  name: string;
  type: string;
  color: string;
}

interface Action {
  name: string;
  action: string;
  duration: number;
}

interface Step {
  id: number;
  description: string;
  actions: Action[];
  ingredients: string[];
  tools: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

interface RecipeData {
  title: string;
  ingredients: Ingredient[];
  tools: Tool[];
  steps: Step[];
  ingredient_states: Record<string, string>;
}

interface SelectedObject {
  name: string;
  type: 'ingredient' | 'tool';
  status: string;
  position: { x: number; y: number };
}

const App: React.FC = () => {
  const [recipeText, setRecipeText] = useState('');
  const [recipeData, setRecipeData] = useState<RecipeData | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);

  const sampleRecipe = `1. 将胡萝卜和土豆切丁备用。
2. 鸡胸肉切块，用盐腌制10分钟。
3. 热锅倒油，放入鸡丁翻炒至变色。
4. 加入胡萝卜丁和土豆丁继续翻炒。
5. 倒入适量酱油，焖煮15分钟。
6. 盛出装盘即可享用。`;

  const handleParseRecipe = useCallback(async () => {
    setIsParsing(true);
    try {
      const text = recipeText.trim() || sampleRecipe;
      const response = await axios.post('/api/parse_recipe', { text });
      const data = response.data as RecipeData;
      data.steps = data.steps.map((step, idx) => ({
        ...step,
        status: idx === 0 ? 'in_progress' : 'pending' as const
      }));
      setRecipeData(data);
      setCurrentStepIndex(0);
      setIsPlaying(true);
    } catch (error) {
      console.error('解析菜谱失败:', error);
      const fallbackData: RecipeData = {
        title: '家常小炒',
        ingredients: [
          { name: '胡萝卜', category: 'vegetable', color: '#ff7f00', shape: 'cylinder', status: '未处理', position: 0 },
          { name: '土豆', category: 'vegetable', color: '#d4a574', shape: 'sphere', status: '未处理', position: 1 },
          { name: '鸡胸肉', category: 'meat', color: '#f5deb3', shape: 'box', status: '未处理', position: 2 },
        ],
        tools: [
          { name: '炒锅', type: 'pan', color: '#333333' },
          { name: '菜刀', type: 'knife', color: '#c0c0c0' },
          { name: '砧板', type: 'board', color: '#8b4513' },
        ],
        steps: [
          { id: 1, description: '将胡萝卜和土豆切丁备用', actions: [{ name: '切丁', action: 'dice', duration: 2000 }], ingredients: ['胡萝卜', '土豆'], tools: ['菜刀', '砧板'], status: 'in_progress' },
          { id: 2, description: '鸡胸肉切块腌制', actions: [{ name: '切丁', action: 'dice', duration: 2000 }], ingredients: ['鸡胸肉'], tools: ['菜刀', '砧板'], status: 'pending' },
          { id: 3, description: '热锅倒油，放入鸡丁翻炒', actions: [{ name: '翻炒', action: 'stir_fry', duration: 3000 }], ingredients: ['鸡胸肉'], tools: ['炒锅'], status: 'pending' },
          { id: 4, description: '加入蔬菜丁继续翻炒', actions: [{ name: '翻炒', action: 'stir_fry', duration: 3000 }], ingredients: ['胡萝卜', '土豆', '鸡胸肉'], tools: ['炒锅'], status: 'pending' },
          { id: 5, description: '焖煮入味', actions: [{ name: '焖煮', action: 'simmer', duration: 4000 }], ingredients: ['胡萝卜', '土豆', '鸡胸肉'], tools: ['炒锅'], status: 'pending' },
          { id: 6, description: '盛出装盘', actions: [{ name: '盛出', action: 'serve', duration: 1000 }], ingredients: ['胡萝卜', '土豆', '鸡胸肉'], tools: ['盘子'], status: 'pending' },
        ],
        ingredient_states: { '胡萝卜': '未处理', '土豆': '未处理', '鸡胸肉': '未处理' }
      };
      setRecipeData(fallbackData);
      setCurrentStepIndex(0);
      setIsPlaying(true);
    } finally {
      setIsParsing(false);
    }
  }, [recipeText, sampleRecipe]);

  const handleStepClick = useCallback((index: number) => {
    if (!recipeData) return;
    setCurrentStepIndex(index);
    setIsPlaying(true);
    const newSteps = recipeData.steps.map((step, idx) => {
      let status: 'pending' | 'in_progress' | 'completed';
      if (idx < index) {
        status = 'completed';
      } else if (idx === index) {
        status = 'in_progress';
      } else {
        status = 'pending';
      }
      return { ...step, status };
    });
    setRecipeData({ ...recipeData, steps: newSteps });
  }, [recipeData]);

  const handleNextStep = useCallback(() => {
    if (!recipeData || currentStepIndex >= recipeData.steps.length - 1) return;
    handleStepClick(currentStepIndex + 1);
  }, [recipeData, currentStepIndex, handleStepClick]);

  const handlePrevStep = useCallback(() => {
    if (!recipeData || currentStepIndex <= 0) return;
    handleStepClick(currentStepIndex - 1);
  }, [recipeData, currentStepIndex, handleStepClick]);

  const handleObjectClick = useCallback((obj: SelectedObject) => {
    setSelectedObject(obj);
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedObject(null);
  }, []);

  const handleExportGif = useCallback(() => {
    alert('GIF导出功能：截取关键帧合成动画（实际项目中可使用gif.js等库实现）');
  }, []);

  const handleShareLink = useCallback(() => {
    const shareUrl = `${window.location.origin}?recipe=${encodeURIComponent(recipeText || sampleRecipe)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('分享链接已复制到剪贴板！');
    }).catch(() => {
      prompt('复制以下链接分享：', shareUrl);
    });
  }, [recipeText, sampleRecipe]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '16px 24px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginRight: 'auto' }}>
          🍳 3D烹饪模拟指南
        </h1>
        <textarea
          value={recipeText}
          onChange={(e) => setRecipeText(e.target.value)}
          placeholder="输入菜谱文本，或使用示例菜谱..."
          style={{
            width: '300px',
            height: '60px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: '13px',
            resize: 'none',
            outline: 'none'
          }}
        />
        <button
          onClick={handleParseRecipe}
          disabled={isParsing}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: isParsing ? '#666' : 'linear-gradient(135deg, #e94560, #f39c12)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isParsing ? 'not-allowed' : 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseDown={(e) => !isParsing && (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => !isParsing && (e.currentTarget.style.transform = 'scale(1)')}
        >
          {isParsing ? '解析中...' : '🎯 解析菜谱'}
        </button>
        <button
          onClick={handleExportGif}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
        >
          📹 导出GIF
        </button>
        <button
          onClick={handleShareLink}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
        >
          🔗 分享链接
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{
          width: '15%',
          minWidth: '200px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(8px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          overflowY: 'auto'
        }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px', color: '#e94560' }}>📋 食材清单</h3>
          {recipeData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recipeData.ingredients.map((ing) => (
                <div
                  key={ing.name}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                  onClick={() => handleObjectClick({ name: ing.name, type: 'ingredient', status: ing.status, position: { x: 0, y: 0 } })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: ing.shape === 'sphere' ? '50%' : '3px',
                      background: ing.color,
                      boxShadow: `0 0 8px ${ing.color}40`
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{ing.name}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                    {recipeData.ingredient_states?.[ing.name] || ing.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#888' }}>暂无食材，请先解析菜谱</p>
          )}

          <h3 style={{ fontSize: '15px', margin: '24px 0 12px', color: '#3498db' }}>🔧 烹饪工具</h3>
          {recipeData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recipeData.tools.map((tool) => (
                <div
                  key={tool.name}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                  onClick={() => handleObjectClick({ name: tool.name, type: 'tool', status: '可用', position: { x: 0, y: 0 } })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      background: tool.color,
                      boxShadow: `0 0 8px ${tool.color}40`
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{tool.name}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#888' }}>暂无工具</p>
          )}
        </div>

        <div ref={sceneRef} style={{ flex: 1, position: 'relative' }}>
          {recipeData ? (
            <Scene3D
              ingredients={recipeData.ingredients}
              tools={recipeData.tools}
              currentStep={recipeData.steps[currentStepIndex]}
              isPlaying={isPlaying}
              onObjectClick={handleObjectClick}
              onAnimationComplete={handleNextStep}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666'
            }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>🍲</div>
              <h2 style={{ fontSize: '24px', marginBottom: '10px', color: '#aaa' }}>欢迎使用3D烹饪模拟</h2>
              <p style={{ fontSize: '14px' }}>在上方输入菜谱文本，点击"解析菜谱"开始</p>
            </div>
          )}

          {selectedObject && (
            <InfoPopup
              name={selectedObject.name}
              type={selectedObject.type}
              status={selectedObject.status}
              onClose={handleClosePopup}
            />
          )}
        </div>

        <StepPanel
          steps={recipeData?.steps || []}
          currentStepIndex={currentStepIndex}
          onStepClick={handleStepClick}
          onPrevStep={handlePrevStep}
          onNextStep={handleNextStep}
        />
      </div>
    </div>
  );
};

export default App;
