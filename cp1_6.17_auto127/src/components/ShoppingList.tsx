import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import type { ShoppingList as ShoppingListType, ShoppingListItem, User } from '../types';
import { shoppingListApi } from '../api';

interface ShoppingListProps {
  currentUser: User | null;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ currentUser }) => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const [shoppingList, setShoppingList] = useState<ShoppingListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!shareCode || !currentUser) return;

    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_list', {
        share_code: shareCode,
        user: currentUser
      });

      shoppingListApi
        .join(shareCode)
        .then((res) => {
          setShoppingList(res.data.shopping_list);
          setOnlineUsers([
            res.data.shopping_list.owner,
            ...res.data.shopping_list.collaborators.map((c) => c.user)
          ]);
        })
        .catch((err) => {
          setError(err.response?.data?.error || '加载清单失败');
        })
        .finally(() => setLoading(false));
    });

    socket.on('message', (data: any) => {
      if (data.type === 'user_joined' && data.user) {
        setOnlineUsers((prev) => {
          if (prev.some((u) => u.id === data.user.id)) return prev;
          return [...prev, data.user];
        });
      } else if (data.type === 'user_left' && data.user) {
        setOnlineUsers((prev) => prev.filter((u) => u.id !== data.user.id));
      }
    });

    socket.on('item_updated', (data: any) => {
      if (data.item && shoppingList) {
        setShoppingList((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((item) =>
              item.id === data.item.id ? { ...item, ...data.item } : item
            )
          };
        });
      }
    });

    return () => {
      socket.emit('leave_list', {
        share_code: shareCode,
        user: currentUser
      });
      socket.disconnect();
    };
  }, [shareCode, currentUser]);

  const handleItemToggle = async (item: ShoppingListItem) => {
    if (!shareCode) return;

    const updatedItem = { ...item, checked: !item.checked };

    setShoppingList((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === item.id ? updatedItem : i
        )
      };
    });

    try {
      await shoppingListApi.updateItem(shareCode, item.id, {
        checked: updatedItem.checked
      });

      if (socketRef.current && currentUser) {
        socketRef.current.emit('item_update', {
          share_code: shareCode,
          item: updatedItem,
          user: currentUser
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '更新失败');
      setShoppingList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === item.id ? item : i
          )
        };
      });
    }
  };

  const handleNoteChange = async (
    item: ShoppingListItem,
    note: string
  ) => {
    if (!shareCode) return;

    const updatedItem = { ...item, note };

    setShoppingList((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === item.id ? updatedItem : i
        )
      };
    });

    try {
      await shoppingListApi.updateItem(shareCode, item.id, { note });

      if (socketRef.current && currentUser) {
        socketRef.current.emit('item_update', {
          share_code: shareCode,
          item: updatedItem,
          user: currentUser
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '更新失败');
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/shopping-list/${shareCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error && !shoppingList) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <button className="btn-primary" onClick={() => navigate('/')}>
          返回食谱库
        </button>
      </div>
    );
  }

  if (!shoppingList) {
    return null;
  }

  const totalItems = shoppingList.items.length;
  const totalQuantity = shoppingList.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const checkedCount = shoppingList.items.filter((i) => i.checked).length;

  const uniqueUsers = onlineUsers.filter(
    (user, index, self) => index === self.findIndex((u) => u.id === user.id)
  );

  return (
    <div className="container shopping-list-page">
      <div className="shopping-list-header">
        <div>
          <h1 className="shopping-list-title">{shoppingList.name}</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>
            创建者: {shoppingList.owner.username}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="collaborators" title="在线协作者">
            {uniqueUsers.map((user) => (
              <div
                key={user.id}
                className="avatar"
                title={user.username}
              >
                {user.avatar}
              </div>
            ))}
          </div>
          <button
            className={copied ? 'btn-secondary' : 'btn-primary'}
            onClick={copyShareLink}
          >
            {copied ? '✓ 已复制' : '🔗 分享链接'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {checkedCount > 0 && (
        <div className="success">
          已完成 {checkedCount}/{totalItems} 项
        </div>
      )}

      <table className="shopping-table">
        <thead>
          <tr>
            <th style={{ width: '60px' }}>状态</th>
            <th>食材名称</th>
            <th style={{ width: '120px' }}>数量</th>
            <th style={{ width: '100px' }}>单位</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          {shoppingList.items.map((item) => (
            <tr key={item.id} className={item.checked ? 'checked-item' : ''}>
              <td>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleItemToggle(item)}
                />
              </td>
              <td>{item.name}</td>
              <td>
                {item.quantity % 1 === 0
                  ? item.quantity
                  : item.quantity.toFixed(1)}
              </td>
              <td>{item.unit}</td>
              <td>
                <input
                  type="text"
                  placeholder="添加备注..."
                  value={item.note}
                  onChange={(e) => handleNoteChange(item, e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="shopping-summary">
        <div className="summary-item">
          <span className="summary-label">食材种类</span>
          <span className="summary-value">{totalItems}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">总件数</span>
          <span className="summary-value">
            {totalQuantity % 1 === 0 ? totalQuantity : totalQuantity.toFixed(1)}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">已完成</span>
          <span className="summary-value" style={{ color: '#10b981' }}>
            {checkedCount}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">协作者</span>
          <span className="summary-value" style={{ color: '#f59e0b' }}>
            {uniqueUsers.length}
          </span>
        </div>
      </div>

      <div style={{ marginTop: '24px', textAlign: 'right' }}>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          返回食谱库
        </button>
      </div>
    </div>
  );
};

export default ShoppingList;
