import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { eventApi, showToast } from '../api/apiClient';
import type { Event } from '../types';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const ProgressNumber: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const springValue = useSpring(0, {
    stiffness: 100,
    damping: 30,
  });

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  return (
    <motion.span>
      {Math.round(springValue.get())}/{max}
    </motion.span>
  );
};

const EventCard: React.FC<{ event: Event; onClick: () => void; index: number }> = ({ event, onClick, index }) => {
  const progressPercent = event.targetVolunteers > 0
    ? Math.min((event.currentVolunteers / event.targetVolunteers) * 100, 100)
    : 0;

  return (
    <motion.div
      layout
      variants={item}
      initial="hidden"
      animate="show"
      transition={{ delay: index * 0.1 }}
      className={`card event-card ${event.isExpired ? 'expired' : ''}`}
      onClick={onClick}
    >
      <div className="event-card-header">
        <h3 className="event-title">{event.name}</h3>
        {event.isExpired && <span className="badge badge-expired">已结束</span>}
      </div>
      <div className="event-meta">
        <div className="meta-item">
          <span className="meta-icon">📅</span>
          <span>{event.date}</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">📍</span>
          <span>{event.location}</span>
        </div>
      </div>
      <p className="event-desc">{event.description}</p>
      
      <div className="progress-section">
        <div className="progress-header">
          <span className="progress-label">志愿者报名进度</span>
          <span className="progress-count">
            <ProgressNumber value={event.currentVolunteers} max={event.targetVolunteers} />
          </span>
        </div>
        <div className="progress-bar">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
          />
        </div>
      </div>

      <div className="milestones">
        {event.milestones.slice(0, 3).map((milestone) => (
          <div key={milestone.id} className="milestone-item">
            <span
              className="milestone-dot"
              style={{
                backgroundColor: milestone.completed ? '#00b894' : '#dfe6e9',
              }}
            />
            <span className="milestone-name">{milestone.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const CreateEventModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    description: '',
    targetVolunteers: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date || !formData.targetVolunteers) {
      showToast('请填写完整信息', 'error');
      return;
    }
    onSubmit({
      ...formData,
      targetVolunteers: parseInt(formData.targetVolunteers),
    });
    setFormData({
      name: '',
      date: '',
      location: '',
      description: '',
      targetVolunteers: '',
    });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">创建新活动</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">活动名称</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入活动名称"
            />
          </div>
          <div className="form-group">
            <label className="form-label">活动日期</label>
            <input
              type="date"
              className="form-input"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">活动地点</label>
            <input
              type="text"
              className="form-input"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="请输入活动地点"
            />
          </div>
          <div className="form-group">
            <label className="form-label">需要志愿者人数</label>
            <input
              type="number"
              className="form-input"
              value={formData.targetVolunteers}
              onChange={(e) => setFormData({ ...formData, targetVolunteers: e.target.value })}
              placeholder="请输入目标人数"
              min="1"
            />
          </div>
          <div className="form-group">
            <label className="form-label">活动描述</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请描述活动内容"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              创建
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await eventApi.getEvents();
      setEvents(data);
    } catch (error) {
      console.error('加载活动失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreateEvent = async (data: any) => {
    try {
      await eventApi.createEvent(data);
      showToast('活动创建成功', 'success');
      setShowCreateModal(false);
      loadEvents();
    } catch (error) {
      console.error('创建活动失败:', error);
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">活动看板</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + 创建活动
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <motion.div
          className="events-grid"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence mode="popLayout">
            {sortedEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                onClick={() => navigate(`/event/${event.id}`)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && sortedEvents.length === 0 && (
        <div className="empty-state">
          <p>暂无活动，点击上方按钮创建第一个公益活动吧！</p>
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateEventModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateEvent}
          />
        )}
      </AnimatePresence>

      <style>{`
        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .event-card {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .event-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .event-title {
          font-size: 18px;
          font-weight: 600;
          color: #2d3436;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .badge-expired {
          background-color: #dfe6e9;
          color: #636e72;
        }

        .event-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 14px;
          color: #636e72;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .meta-icon {
          font-size: 16px;
        }

        .event-desc {
          font-size: 14px;
          color: #636e72;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .progress-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .progress-label {
          font-size: 13px;
          color: #636e72;
        }

        .progress-count {
          font-size: 13px;
          font-weight: 600;
          color: #667eea;
        }

        .milestones {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .milestone-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .milestone-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          transition: background-color 0.3s ease;
        }

        .milestone-name {
          font-size: 12px;
          color: #636e72;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          color: #636e72;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
