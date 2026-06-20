import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../utils/api';
import { Reminder } from '../types';

const ReminderBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socketRef.current = io('/', {
        query: { token }
      });

      socketRef.current.on('reminder', (data: any) => {
        fetchReminders();
        fetchUnreadCount();
        showNotification();
      });
    }

    fetchReminders();
    fetchUnreadCount();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('LearnFlow 复习提醒', {
        body: '你有新的复习任务需要完成！',
        icon: '/vite.svg'
      });
    }
  };

  const fetchReminders = async () => {
    try {
      const response = await api.get('/reminders');
      setReminders(response.data);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/reminders/unread-count');
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleReminderClick = async (reminder: Reminder) => {
    try {
      await api.put(`/reminders/${reminder.id}/read`);
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark reminder as read:', error);
    }
    
    const planId = reminder.task_id;
    navigate(`/plan/${planId}?taskId=${reminder.task_id}`);
    setIsOpen(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  return (
    <div className="reminder-container" ref={dropdownRef}>
      <button className="reminder-bell-btn" onClick={handleBellClick}>
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="reminder-badge">{unreadCount}</span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="reminder-dropdown"
          >
            <div className="reminder-header">
              <h4>复习提醒</h4>
              <button className="reminder-close-btn" onClick={handleClose}>
                <X size={16} />
              </button>
            </div>
            <div className="reminder-list">
              {reminders.length === 0 ? (
                <div className="reminder-empty">暂无提醒</div>
              ) : (
                reminders.map((reminder) => (
                  <motion.div
                    key={reminder.id}
                    whileHover={{ backgroundColor: 'rgba(79, 70, 229, 0.05)' }}
                    onClick={() => handleReminderClick(reminder)}
                    className="reminder-item"
                  >
                    {!reminder.is_read && (
                      <span className="reminder-dot" />
                    )}
                    <div className="reminder-content">
                      <div className="reminder-task-name">{reminder.task_name}</div>
                      <div className="reminder-date">
                        到期时间: {formatDate(reminder.due_date)}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReminderBell;
