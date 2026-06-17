import { useState, useEffect, useRef, useMemo } from 'react';
import type { Annotation, Message, Product } from '../types';
import { messageApi, productApi } from '../api';

interface NegotiationPanelProps {
  product: Product;
  annotations: Annotation[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  currentUserRole: 'buyer' | 'seller';
  selectedAnnotationId: string | null;
  onPriceUpdate?: (newPrice: number) => void;
  onMessagesUpdate?: (messages: Message[]) => void;
}

const getRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
};

export default function NegotiationPanel({
  product,
  annotations,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserRole,
  selectedAnnotationId,
  onPriceUpdate,
  onMessagesUpdate,
}: NegotiationPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [negotiationAmount, setNegotiationAmount] = useState('');
  const [negotiationAnnotationId, setNegotiationAnnotationId] = useState<string>('');
  const [selectedAnnIdForView, setSelectedAnnIdForView] = useState<string | null>(
    selectedAnnotationId
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageApi.getMessages(product.id).then((data) => {
      const sorted = [...data].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(sorted);
      onMessagesUpdate?.(sorted);
    });
  }, [product.id, onMessagesUpdate]);

  useEffect(() => {
    setSelectedAnnIdForView(selectedAnnotationId);
    if (selectedAnnotationId && listRef.current) {
      const target = listRef.current.querySelector(
        `[data-ann-id="${selectedAnnotationId}"]`
      );
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedAnnotationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const groupedMessages = useMemo(() => {
    const groups: Record<string, Message[]> = {};
    messages.forEach((msg) => {
      const key = msg.annotationId || 'general';
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    });
    return groups;
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const msg = await messageApi.createMessage({
        productId: product.id,
        annotationId: selectedAnnIdForView,
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        userRole: currentUserRole,
        content: newMessage.trim(),
      });
      setMessages((prev) => [...prev, msg]);
      setNewMessage('');
    } catch (e) {
      console.error('发送消息失败', e);
    }
  };

  const handleSendNegotiation = async () => {
    const amount = parseInt(negotiationAmount);
    if (!amount || amount >= 0 || !negotiationAnnotationId) return;
    try {
      const msg = await messageApi.createMessage({
        productId: product.id,
        annotationId: negotiationAnnotationId,
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        userRole: currentUserRole,
        content: `针对该标注申请降价 ${Math.abs(amount)} 元`,
        priceOffer: amount,
      });
      setMessages((prev) => [...prev, msg]);
      setShowNegotiationModal(false);
      setNegotiationAmount('');
      setNegotiationAnnotationId('');
      setSelectedAnnIdForView(negotiationAnnotationId);
    } catch (e) {
      console.error('发起议价失败', e);
    }
  };

  const handleConfirmOffer = async (messageId: string, priceAdjustment: number) => {
    try {
      await messageApi.confirmOffer(messageId);
      const updatedProduct = await productApi.updateProductPrice(product.id, priceAdjustment);
      onPriceUpdate?.(updatedProduct.currentPrice);

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isConfirmed: true } : m))
      );
      const confirmMsg = await messageApi.createMessage({
        productId: product.id,
        annotationId:
          prev[prev.findIndex((m) => m.id === messageId)]?.annotationId || null,
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        userRole: currentUserRole,
        content: `已同意降价 ${Math.abs(priceAdjustment)} 元`,
      });
      setMessages((prev) => [...prev, confirmMsg]);
    } catch (e) {
      console.error('确认议价失败', e);
    }
  };

  const getAnnotationLabel = (annId: string | null) => {
    if (!annId) return '通用讨论';
    const ann = annotations.find((a) => a.id === annId);
    if (!ann) return `标注 ${annId.slice(-4)}`;
    const typeLabel = ann.type === 'rectangle' ? '矩形' : '箭头';
    return `${typeLabel}标注-${annId.slice(-4)}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 4,
        border: '1px solid #e8e8e8',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e8e8e8',
          backgroundColor: '#fafafa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <strong style={{ fontSize: 15 }}>协商面板</strong>
        {currentUserRole === 'buyer' && (
          <button
            onClick={() => {
              if (annotations.length > 0) {
                setNegotiationAnnotationId(annotations[0].id);
              }
              setShowNegotiationModal(true);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f5222d',
              color: '#fff',
              borderRadius: 4,
              fontSize: 13,
            }}
          >
            发起议价
          </button>
        )}
      </div>

      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>筛选讨论：</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedAnnIdForView(null)}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12,
              backgroundColor: selectedAnnIdForView === null ? '#1890ff' : '#f0f0f0',
              color: selectedAnnIdForView === null ? '#fff' : '#333',
            }}
          >
            全部
          </button>
          {annotations.map((ann) => (
            <button
              key={ann.id}
              onClick={() => setSelectedAnnIdForView(ann.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 12,
                backgroundColor: selectedAnnIdForView === ann.id ? '#1890ff' : '#f0f0f0',
                color: selectedAnnIdForView === ann.id ? '#fff' : '#333',
              }}
            >
              {ann.type === 'rectangle' ? '矩形' : '箭头'}-{ann.id.slice(-4)}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#999',
              padding: 40,
              fontSize: 13,
            }}
          >
            暂无协商消息
          </div>
        ) : (
          Object.entries(groupedMessages)
            .filter(
              ([key]) => selectedAnnIdForView === null || key === selectedAnnIdForView
            )
            .map(([annId, msgs]) => (
              <div key={annId} data-ann-id={annId} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: '#666',
                    backgroundColor: '#f5f5f5',
                    padding: '4px 8px',
                    borderRadius: 4,
                    alignSelf: 'flex-start',
                  }}
                >
                  {getAnnotationLabel(annId === 'general' ? null : annId)}
                </div>
                {msgs.map((msg, idx) => {
                  const isSeller = msg.userRole === 'seller';
                  const bgColor = idx % 2 === 0 ? '#f5f5f5' : '#ffffff';
                  return (
                    <div
                      key={msg.id}
                      className="fade-in-up"
                      style={{
                        display: 'flex',
                        flexDirection: isSeller ? 'row-reverse' : 'row',
                        gap: 8,
                        alignItems: 'flex-start',
                      }}
                    >
                      <img
                        src={msg.userAvatar}
                        alt={msg.userName}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          maxWidth: '75%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isSeller ? 'flex-end' : 'flex-start',
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: '#999',
                            display: 'flex',
                            gap: 6,
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontWeight: 500, color: '#666' }}>
                            {msg.userName}
                          </span>
                          <span>{isSeller ? '卖家' : '买家'}</span>
                          <span>{getRelativeTime(msg.createdAt)}</span>
                        </div>
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            backgroundColor: bgColor,
                            border: '1px solid #e8e8e8',
                            position: 'relative',
                            wordBreak: 'break-word',
                            fontSize: 14,
                          }}
                        >
                          {msg.priceOffer && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                backgroundColor: '#f5222d',
                                color: '#fff',
                                fontSize: 12,
                                fontWeight: 600,
                                marginRight: 8,
                                verticalAlign: 'middle',
                              }}
                            >
                              {msg.priceOffer}
                            </span>
                          )}
                          {msg.content}
                          {msg.priceOffer && !msg.isConfirmed && currentUserRole === 'seller' && (
                            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => handleConfirmOffer(msg.id, msg.priceOffer!)}
                                style={{
                                  padding: '4px 10px',
                                  backgroundColor: '#52c41a',
                                  color: '#fff',
                                  borderRadius: 4,
                                  fontSize: 12,
                                }}
                              >
                                确认
                              </button>
                              <button
                                style={{
                                  padding: '4px 10px',
                                  backgroundColor: '#fff',
                                  color: '#999',
                                  border: '1px solid #d9d9d9',
                                  borderRadius: 4,
                                  fontSize: 12,
                                }}
                              >
                                拒绝
                              </button>
                            </div>
                          )}
                          {msg.isConfirmed && (
                            <span
                              style={{
                                display: 'inline-block',
                                marginLeft: 8,
                                fontSize: 11,
                                color: '#52c41a',
                                fontWeight: 500,
                              }}
                            >
                              ✓ 已确认
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: 12,
          borderTop: '1px solid #e8e8e8',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="输入消息..."
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            fontSize: 14,
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: newMessage.trim() ? '#1890ff' : '#bfbfbf',
            color: '#fff',
            borderRadius: 4,
            fontSize: 14,
          }}
        >
          发送
        </button>
      </div>

      {showNegotiationModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowNegotiationModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: 4,
              padding: 20,
              width: 360,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>发起议价</h3>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#666' }}>
                关联标注
              </label>
              <select
                value={negotiationAnnotationId}
                onChange={(e) => setNegotiationAnnotationId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  fontSize: 14,
                }}
              >
                <option value="">请选择标注</option>
                {annotations.map((ann) => (
                  <option key={ann.id} value={ann.id}>
                    {ann.type === 'rectangle' ? '矩形' : '箭头'}标注-{ann.id.slice(-4)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#666' }}>
                降价金额（负数，如-20）
              </label>
              <input
                type="number"
                value={negotiationAmount}
                onChange={(e) => setNegotiationAmount(e.target.value)}
                placeholder="例如：-20"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowNegotiationModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#fff',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  fontSize: 14,
                }}
              >
                取消
              </button>
              <button
                onClick={handleSendNegotiation}
                disabled={!negotiationAnnotationId || parseInt(negotiationAmount) >= 0}
                style={{
                  padding: '8px 16px',
                  backgroundColor:
                    negotiationAnnotationId && parseInt(negotiationAmount) < 0
                      ? '#f5222d'
                      : '#bfbfbf',
                  color: '#fff',
                  borderRadius: 4,
                  fontSize: 14,
                }}
              >
                发送议价
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
