import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import useAppStore, { Notification } from '@/store/useAppStore';

const iconMap: Record<Notification['type'], React.ReactNode> = {
  info: <Info size={24} color="#2196f3" />,
  success: <CheckCircle size={24} color="#4caf50" />,
  warning: <AlertTriangle size={24} color="#ff9800" />,
  error: <XCircle size={24} color="#f44336" />,
};

const bgColorMap: Record<Notification['type'], string> = {
  info: '#e3f2fd',
  success: '#e8f5e9',
  warning: '#fff3e0',
  error: '#ffebee',
};

const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useAppStore();

  useEffect(() => {
    notifications.forEach((notification) => {
      const timer = setTimeout(() => {
        removeNotification(notification.id);
      }, 3000);
      return () => clearTimeout(timer);
    });
  }, [notifications, removeNotification]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg cursor-pointer"
            style={{
              width: '320px',
              minHeight: '60px',
              backgroundColor: bgColorMap[notification.type],
            }}
            onClick={() => removeNotification(notification.id)}
          >
            <div className="flex-shrink-0" style={{ width: '48px', height: '48px' }}>
              {notification.type === 'success' ? <Bell size={48} color="#4caf50" /> : iconMap[notification.type]}
            </div>
            <div className="flex-1 overflow-hidden">
              <h4 className="font-semibold text-gray-800 text-sm">{notification.title}</h4>
              <p className="text-xs text-gray-600 truncate">{notification.message}</p>
            </div>
            <button className="flex-shrink-0 p-1 hover:bg-black/10 rounded-full transition-colors">
              <X size={16} className="text-gray-500" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToast;
