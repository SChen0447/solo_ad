import { useState, useEffect } from 'react';
import type { Tool, ToolReservation } from './types';

interface ToolMarketProps {
  onNotify: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

function ToolMarket({ onNotify }: ToolMarketProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [reservationForm, setReservationForm] = useState<ToolReservation>({
    toolId: '',
    startDate: '',
    duration: 1,
  });

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/tools');
      const data = await response.json();
      setTools(data);
    } catch (error) {
      console.error('Failed to fetch tools:', error);
      onNotify('获取工具列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToolClick = (tool: Tool) => {
    if (tool.status !== 'available') {
      return;
    }
    setSelectedTool(tool);
    setReservationForm({
      toolId: tool.id,
      startDate: new Date().toISOString().split('T')[0],
      duration: 1,
    });
  };

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool) return;

    try {
      const response = await fetch(`/api/tools/${selectedTool.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'reserved' }),
      });

      if (response.ok) {
        const updatedTool = await response.json();
        setTools(prev => prev.map(t => t.id === updatedTool.id ? updatedTool : t));
        setSelectedTool(null);
        onNotify('已发送预约请求，等待主人确认', 'success');
      } else {
        const error = await response.json();
        onNotify(error.message || '预约失败', 'error');
      }
    } catch (error) {
      console.error('Failed to reserve tool:', error);
      onNotify('预约失败，请重试', 'error');
    }
  };

  const isToolUnavailable = (tool: Tool) => tool.status === 'reserved' || tool.status === 'lent';

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">工具市场</h1>
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">工具市场</h1>
      <p className="page-subtitle" style={{ marginBottom: '24px', color: '#718096' }}>
        向邻居借用闲置工具，节省购买成本
      </p>
      
      <div className="tool-grid" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
      }}>
        {tools.map(tool => (
          <div
            key={tool.id}
            className={`tool-card ${isToolUnavailable(tool) ? 'unavailable' : ''}`}
            onClick={() => handleToolClick(tool)}
            style={{
              width: '280px',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
              cursor: isToolUnavailable(tool) ? 'not-allowed' : 'pointer',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!isToolUnavailable(tool)) {
                e.currentTarget.style.boxShadow = '0px 8px 24px rgba(0,0,0,0.15)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0,0,0,0.08)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isToolUnavailable(tool) && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                backdropFilter: 'blur(2px)',
              }}>
                <span style={{
                  backgroundColor: 'rgba(91,70,55,0.9)',
                  color: '#ffffff',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 500,
                }}>
                  已借出
                </span>
              </div>
            )}
            
            <div className="tool-image" style={{
              width: '100%',
              height: '180px',
              backgroundColor: '#f5f0e8',
              overflow: 'hidden',
            }}>
              <img 
                src={tool.image} 
                alt={tool.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
            
            <div className="tool-content" style={{ padding: '16px 20px 20px' }}>
              <div className="tool-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px',
              }}>
                <h3 className="tool-name" style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#5b4637',
                  margin: 0,
                }}>
                  {tool.name}
                </h3>
              </div>
              
              <p className="tool-description" style={{
                fontSize: '13px',
                color: '#718096',
                marginBottom: '12px',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {tool.description}
              </p>
              
              <div className="tool-footer" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid #f0ebe3',
              }}>
                <div className="tool-owner" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#c4a882',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}>
                    {tool.ownerNickname.charAt(0)}
                  </div>
                  <span style={{ fontSize: '13px', color: '#5b4637' }}>
                    {tool.ownerNickname}
                  </span>
                </div>
                
                <div className="tool-price" style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#c4a882',
                }}>
                  {tool.pricePerDay} <span style={{ fontSize: '12px', fontWeight: 400 }}>积分/天</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedTool && (
        <div className="modal-overlay" onClick={() => setSelectedTool(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">预约工具 - {selectedTool.name}</h2>
            
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#f5f0e8',
              borderRadius: '12px',
            }}>
              <img 
                src={selectedTool.image} 
                alt={selectedTool.name}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                }}
              />
              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '4px', color: '#5b4637' }}>
                  {selectedTool.name}
                </h3>
                <p style={{ fontSize: '13px', color: '#718096', marginBottom: '8px' }}>
                  {selectedTool.description}
                </p>
                <p style={{ fontSize: '14px', color: '#c4a882', fontWeight: 600 }}>
                  {selectedTool.pricePerDay} 积分/天
                </p>
              </div>
            </div>

            <form onSubmit={handleReservationSubmit}>
              <div className="form-group">
                <label className="form-label">借用日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={reservationForm.startDate}
                  onChange={e => setReservationForm(prev => ({
                    ...prev,
                    startDate: e.target.value,
                  }))}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">借用时长（天）</label>
                <input
                  type="number"
                  className="form-input"
                  value={reservationForm.duration}
                  onChange={e => setReservationForm(prev => ({
                    ...prev,
                    duration: Math.max(1, parseInt(e.target.value) || 1),
                  }))}
                  min="1"
                  max="30"
                  required
                />
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#f0fff4',
                borderRadius: '10px',
                marginBottom: '20px',
              }}>
                <p style={{ fontSize: '14px', color: '#38a169' }}>
                  预计费用：<strong>{selectedTool.pricePerDay * reservationForm.duration}</strong> 积分
                </p>
              </div>

              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedTool(null)}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  确认预约
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ToolMarket;
