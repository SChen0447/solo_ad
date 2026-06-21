import { useEffect, useState, useMemo, useRef } from 'react';
import { orderApi } from '../api/orderApi';
import type { Order, OrderStatus, CreateOrderData, CreateCommunicationData, Communication } from '../types';
import { STATUS_LABELS, ORDER_TYPE_LABELS, COMMUNICATION_METHOD_LABELS } from '../types';
import Modal from '../components/Modal';
import Lightbox from '../components/Lightbox';
import DatePicker from '../components/DatePicker';
import '../components/DatePicker.css';
import './ListBoard.css';

const COLUMN_CONFIG: { status: OrderStatus; gradient: string }[] = [
  { status: 'pending', gradient: 'linear-gradient(180deg, #FADBD8 0%, #E8DAEF 100%)' },
  { status: 'in_progress', gradient: 'linear-gradient(180deg, #D6EAF8 0%, #AED6F1 100%)' },
  { status: 'ready', gradient: 'linear-gradient(180deg, #D5F5E3 0%, #ABEBC6 100%)' },
  { status: 'completed', gradient: 'linear-gradient(180deg, #E5E7E9 0%, #FFFFFF 100%)' },
];

const STATUS_ICONS: Record<OrderStatus, string> = {
  pending: '💬',
  in_progress: '🔨',
  ready: '📦',
  completed: '✅',
};

const METHOD_ICONS: Record<string, string> = {
  phone: '📞',
  wechat: '💬',
  in_person: '🤝',
  email: '📧',
};

export default function ListBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<{ order: Order; toStatus: OrderStatus } | null>(null);
  const [commModalOpen, setCommModalOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<{ images: string[]; index: number } | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<OrderStatus | null>(null);

  const [newOrder, setNewOrder] = useState<CreateOrderData>({
    customer_name: '',
    customer_phone: '',
    work_name: '',
    order_type: 'by_piece',
    deadline: '',
    notes: '',
    status: 'pending',
  });

  const [newComm, setNewComm] = useState<CreateCommunicationData>({
    communication_date: new Date().toISOString().split('T')[0],
    method: 'wechat',
    content: '',
  });

  const [commFilter, setCommFilter] = useState({ start_date: '', end_date: '', keyword: '' });
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderApi.getAll();
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const ordersByStatus = useMemo(() => {
    const map: Record<OrderStatus, Order[]> = {
      pending: [], in_progress: [], ready: [], completed: [],
    };
    orders.forEach(o => { map[o.status].push(o); });
    return map;
  }, [orders]);

  const handleCreateOrder = async () => {
    if (!newOrder.customer_name.trim() || !newOrder.work_name.trim()) {
      alert('请填写客户姓名和作品名称');
      return;
    }
    try {
      const created = await orderApi.create(newOrder);
      setOrders([created, ...orders]);
      setCreateModalOpen(false);
      setNewOrder({ customer_name: '', customer_phone: '', work_name: '', order_type: 'by_piece', deadline: '', notes: '', status: 'pending' });
    } catch (e) {
      alert(e instanceof Error ? e.message : '创建失败');
    }
  };

  const handleDragStart = (e: React.DragEvent, orderId: number) => {
    setDraggedId(orderId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(orderId));
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, status: OrderStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, toStatus: OrderStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const orderId = Number(e.dataTransfer.getData('text/plain'));
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status === toStatus) {
      setDraggedId(null);
      return;
    }
    setStatusConfirm({ order, toStatus });
    setDraggedId(null);
  };

  const confirmStatusChange = async () => {
    if (!statusConfirm) return;
    try {
      const updated = await orderApi.updateStatus(statusConfirm.order.id, statusConfirm.toStatus);
      setOrders(orders.map(o => o.id === updated.id ? updated : o));
      if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
      setStatusConfirm(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新失败');
    }
  };

  const handleAddCommunication = async () => {
    if (!selectedOrder) return;
    if (!newComm.communication_date || !newComm.method || !newComm.content.trim()) {
      alert('请完整填写沟通记录');
      return;
    }
    try {
      await orderApi.addCommunication(selectedOrder.id, newComm);
      const updated = await orderApi.getById(selectedOrder.id);
      setOrders(orders.map(o => o.id === updated.id ? updated : o));
      setSelectedOrder(updated);
      setCommModalOpen(false);
      setNewComm({ communication_date: new Date().toISOString().split('T')[0], method: 'wechat', content: '' });
    } catch (e) {
      alert(e instanceof Error ? e.message : '添加失败');
    }
  };

  const filteredCommunications = useMemo(() => {
    if (!selectedOrder) return [];
    let list = [...selectedOrder.communications];
    if (commFilter.start_date) list = list.filter(c => c.communication_date >= commFilter.start_date);
    if (commFilter.end_date) list = list.filter(c => c.communication_date <= commFilter.end_date);
    if (commFilter.keyword.trim()) {
      const kw = commFilter.keyword.toLowerCase();
      list = list.filter(c => c.content.toLowerCase().includes(kw));
    }
    return list;
  }, [selectedOrder, commFilter]);

  useEffect(() => {
    if (!selectedOrder || !commFilter.keyword.trim()) {
      setKeywordSuggestions([]);
      return;
    }
    const kw = commFilter.keyword.toLowerCase();
    const contents = selectedOrder.communications.map(c => c.content);
    const matches = new Set<string>();
    contents.forEach(text => {
      const sentences = text.split(/[，。；\n.!?]/);
      sentences.forEach(s => {
        if (s.toLowerCase().includes(kw) && s.trim().length <= 30) {
          matches.add(s.trim());
        }
      });
    });
    setKeywordSuggestions(Array.from(matches).slice(0, 5));
  }, [commFilter.keyword, selectedOrder]);

  const formatDate = (s: string | null) => {
    if (!s) return '-';
    return s.replace('T', ' ').slice(0, 16);
  };

  if (loading) {
    return <div className="board-loading">加载中...</div>;
  }

  if (error) {
    return (
      <div className="board-error">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={loadOrders}>重试</button>
      </div>
    );
  }

  return (
    <div className="list-board">
      <div className="board-header">
        <h2 className="board-title">订单看板</h2>
        <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
          + 新建订单
        </button>
      </div>

      <div className="board-columns">
        {COLUMN_CONFIG.map(col => (
          <div
            key={col.status}
            className={`board-column ${dragOverCol === col.status ? 'drag-over' : ''}`}
            style={{ background: col.gradient }}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className="column-header">
              <span className="column-icon">{STATUS_ICONS[col.status]}</span>
              <span className="column-title">{STATUS_LABELS[col.status]}</span>
              <span className="column-count">{ordersByStatus[col.status].length}</span>
            </div>
            <div className="column-cards">
              {ordersByStatus[col.status].length === 0 && (
                <div className="empty-column">暂无订单</div>
              )}
              {ordersByStatus[col.status].map(order => (
                <div
                  key={order.id}
                  className={`order-card card ${draggedId === order.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, order.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="card-workname">{order.work_name}</div>
                  <div className="card-customer">👤 {order.customer_name}</div>
                  {order.customer_phone && (
                    <div className="card-phone">📱 {order.customer_phone}</div>
                  )}
                  <div className="card-meta">
                    <span className="badge">{ORDER_TYPE_LABELS[order.order_type]}</span>
                    {order.deadline && <span className="deadline">⏰ {order.deadline}</span>}
                  </div>
                  {(order.comm_count || order.communications.length > 0) && (
                    <div className="card-footer">
                      <span>💬 {order.comm_count || order.communications.length}</span>
                      {order.last_communication && (
                        <span className="last-comm">最近: {order.last_communication}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="新建订单"
      >
        <div className="form-group">
          <label className="form-label">客户姓名 *</label>
          <input
            className="form-input"
            value={newOrder.customer_name}
            onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
            placeholder="请输入客户姓名"
          />
        </div>
        <div className="form-group">
          <label className="form-label">联系方式</label>
          <input
            className="form-input"
            value={newOrder.customer_phone}
            onChange={(e) => setNewOrder({ ...newOrder, customer_phone: e.target.value })}
            placeholder="请输入电话或微信"
          />
        </div>
        <div className="form-group">
          <label className="form-label">作品名称 *</label>
          <input
            className="form-input"
            value={newOrder.work_name}
            onChange={(e) => setNewOrder({ ...newOrder, work_name: e.target.value })}
            placeholder="请输入作品名称"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">订单类型</label>
            <select
              className="form-select"
              value={newOrder.order_type}
              onChange={(e) => setNewOrder({ ...newOrder, order_type: e.target.value as any })}
            >
              <option value="by_piece">按件收费</option>
              <option value="by_hour">按工时收费</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">初始状态</label>
            <select
              className="form-select"
              value={newOrder.status}
              onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value as OrderStatus })}
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">截止日期</label>
          <DatePicker
            value={newOrder.deadline || ''}
            onChange={(d) => setNewOrder({ ...newOrder, deadline: d })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">备注</label>
          <textarea
            className="form-textarea"
            value={newOrder.notes}
            onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
            placeholder="订单备注信息..."
            rows={3}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>取消</button>
          <button className="btn btn-primary" onClick={handleCreateOrder}>创建订单</button>
        </div>
      </Modal>

      {statusConfirm && (
        <Modal
          open={true}
          onClose={() => setStatusConfirm(null)}
          title="确认状态变更"
          width="400px"
        >
          <p style={{ marginBottom: 8 }}>
            确定要将订单 <strong>{statusConfirm.order.work_name}</strong>
          </p>
          <p style={{ marginBottom: 20 }}>
            从 <span className="badge">{STATUS_LABELS[statusConfirm.order.status]}</span>
            {' 变更为 '}
            <span className="badge" style={{ background: 'var(--color-primary)', color: 'white' }}>
              {STATUS_LABELS[statusConfirm.toStatus]}
            </span>
            ？
          </p>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setStatusConfirm(null)}>取消</button>
            <button className="btn btn-primary" onClick={confirmStatusChange}>确认变更</button>
          </div>
        </Modal>
      )}

      {selectedOrder && (
        <div className="detail-panel-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <div>
                <h3 className="detail-title">{selectedOrder.work_name}</h3>
                <div className="detail-sub">
                  <span className="badge">{STATUS_LABELS[selectedOrder.status]}</span>
                  <span>{ORDER_TYPE_LABELS[selectedOrder.order_type]}</span>
                </div>
              </div>
              <button className="detail-close" onClick={() => setSelectedOrder(null)}>×</button>
            </div>

            <div className="detail-info">
              <div className="info-row"><span className="info-label">客户</span><span>{selectedOrder.customer_name}</span></div>
              {selectedOrder.customer_phone && (
                <div className="info-row"><span className="info-label">联系方式</span><span>{selectedOrder.customer_phone}</span></div>
              )}
              {selectedOrder.deadline && (
                <div className="info-row"><span className="info-label">截止日期</span><span>{selectedOrder.deadline}</span></div>
              )}
              <div className="info-row"><span className="info-label">创建时间</span><span>{formatDate(selectedOrder.created_at)}</span></div>
              {selectedOrder.notes && (
                <div className="info-row notes"><span className="info-label">备注</span><span>{selectedOrder.notes}</span></div>
              )}
            </div>

            <div className="detail-section">
              <h4 className="section-title">📌 订单时间线</h4>
              <div className="timeline">
                {selectedOrder.status_history.map((h, i) => (
                  <div key={h.id || i} className="timeline-item">
                    <div className="timeline-dot">{STATUS_ICONS[h.to_status]}</div>
                    <div className="timeline-content">
                      <div className="timeline-text">
                        {h.from_status
                          ? `${STATUS_LABELS[h.from_status]} → ${STATUS_LABELS[h.to_status]}`
                          : `创建订单 → ${STATUS_LABELS[h.to_status]}`}
                      </div>
                      <div className="timeline-time">{formatDate(h.changed_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <div className="section-header">
                <h4 className="section-title">💬 沟通记录 ({filteredCommunications.length})</h4>
                <button className="btn btn-primary btn-sm" onClick={() => setCommModalOpen(true)}>
                  + 添加记录
                </button>
              </div>

              <div className="comm-filter">
                <DatePicker
                  value={commFilter.start_date}
                  onChange={(d) => setCommFilter({ ...commFilter, start_date: d })}
                  placeholder="开始日期"
                />
                <span className="filter-sep">至</span>
                <DatePicker
                  value={commFilter.end_date}
                  onChange={(d) => setCommFilter({ ...commFilter, end_date: d })}
                  placeholder="结束日期"
                />
                <div className="keyword-input-wrapper" ref={suggestionRef}>
                  <input
                    className="form-input keyword-input"
                    placeholder="关键词搜索"
                    value={commFilter.keyword}
                    onChange={(e) => {
                      setCommFilter({ ...commFilter, keyword: e.target.value });
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  {showSuggestions && keywordSuggestions.length > 0 && (
                    <div className="keyword-suggestions">
                      {keywordSuggestions.map((s, i) => (
                        <div
                          key={i}
                          className="suggestion-item"
                          onClick={() => {
                            setCommFilter({ ...commFilter, keyword: s });
                            setShowSuggestions(false);
                          }}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="comm-list">
                {filteredCommunications.length === 0 && (
                  <div className="empty-state">暂无沟通记录</div>
                )}
                {filteredCommunications.map((comm) => (
                  <CommunicationItem key={comm.id} comm={comm} />
                ))}
              </div>
            </div>

            {selectedOrder.attachments.length > 0 && (
              <div className="detail-section">
                <h4 className="section-title">🖼️ 附件素材</h4>
                <div className="attachment-thumbs">
                  {selectedOrder.attachments.slice(0, 5).map((att, idx) => (
                    <div
                      key={att.id}
                      className="attachment-thumb"
                      onClick={() => setLightboxImages({
                        images: selectedOrder.attachments.map(a => '/' + a.file_path),
                        index: idx,
                      })}
                    >
                      <img src={'/' + att.file_path} alt={att.file_name} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {commModalOpen && selectedOrder && (
        <Modal
          open={commModalOpen}
          onClose={() => setCommModalOpen(false)}
          title="添加沟通记录"
        >
          <div className="form-group">
            <label className="form-label">沟通日期</label>
            <DatePicker
              value={newComm.communication_date}
              onChange={(d) => setNewComm({ ...newComm, communication_date: d })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">沟通方式</label>
            <select
              className="form-select"
              value={newComm.method}
              onChange={(e) => setNewComm({ ...newComm, method: e.target.value as any })}
            >
              <option value="wechat">微信</option>
              <option value="phone">电话</option>
              <option value="in_person">当面</option>
              <option value="email">邮件</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">沟通内容（最多500字）</label>
            <textarea
              className="form-textarea"
              value={newComm.content}
              onChange={(e) => setNewComm({ ...newComm, content: e.target.value.slice(0, 500) })}
              placeholder="记录沟通详情..."
              rows={5}
              maxLength={500}
            />
            <div className="char-count">{newComm.content.length}/500</div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setCommModalOpen(false)}>取消</button>
            <button className="btn btn-primary" onClick={handleAddCommunication}>保存</button>
          </div>
        </Modal>
      )}

      {lightboxImages && (
        <Lightbox
          open={true}
          images={lightboxImages.images}
          currentIndex={lightboxImages.index}
          onClose={() => setLightboxImages(null)}
        />
      )}
    </div>
  );
}

function CommunicationItem({ comm }: { comm: Communication }) {
  const [expanded, setExpanded] = useState(false);
  const summary = comm.content.slice(0, 200);
  const needExpand = comm.content.length > 200;

  return (
    <div className="comm-item card">
      <div className="comm-header">
        <span className="comm-method">
          {METHOD_ICONS[comm.method]} {COMMUNICATION_METHOD_LABELS[comm.method]}
        </span>
        <span className="comm-date">{comm.communication_date}</span>
      </div>
      <div className="comm-content">
        {expanded || !needExpand ? comm.content : summary + '...'}
      </div>
      {needExpand && (
        <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? '收起' : '展开全文'}
        </button>
      )}
    </div>
  );
}
