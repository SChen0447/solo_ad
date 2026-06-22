import { useState, useEffect, useCallback } from 'react';
import { Activity, ConflictInfo } from '../../types';
import { getActivities } from '../../services/api';
import { useUser } from '../../context/UserContext';
import FilterBar, { FilterValues } from './FilterBar';
import ActivityCard from './ActivityCard';
import ActivityModal from './ActivityModal';
import ConflictModal from './ConflictModal';
import './ScheduleModule.css';

export default function ScheduleModule() {
  const { handleBookActivity, handleUnbookActivity, refreshData } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({
    date: '',
    type: '',
    difficulty: ''
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(12);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [conflictModal, setConflictModal] = useState({
    isOpen: false,
    conflicts: [] as ConflictInfo[],
    newActivity: null as Activity | null
  });

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getActivities({
        date: filters.date || undefined,
        type: filters.type || undefined,
        difficulty: filters.difficulty || undefined,
        page,
        pageSize
      });
      setActivities(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
  }, []);

  const handleCardClick = (activity: Activity) => {
    setSelectedActivity(activity);
  };

  const handleCloseModal = () => {
    setSelectedActivity(null);
  };

  const handleBookWithConflictCheck = async (activity: Activity) => {
    const result = await handleBookActivity(activity.id);
    if (!result.success && result.conflicts && result.conflicts.length > 0) {
      setConflictModal({
        isOpen: true,
        conflicts: result.conflicts,
        newActivity: activity
      });
    }
  };

  const handleCancelConflict = () => {
    setConflictModal({
      isOpen: false,
      conflicts: [],
      newActivity: null
    });
  };

  const handleOverrideConflict = async () => {
    if (!conflictModal.newActivity) return;

    const conflictingIds = conflictModal.conflicts.map(c => c.conflictingActivityId);
    for (const id of conflictingIds) {
      await handleUnbookActivity(id);
    }

    await handleBookActivity(conflictModal.newActivity.id);
    await refreshData();

    setConflictModal({
      isOpen: false,
      conflicts: [],
      newActivity: null
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <h1 className="schedule-title">活动日程</h1>
        <span className="schedule-stats">共 {total} 场活动</span>
      </div>

      <FilterBar onFilterChange={handleFilterChange} />

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-text">暂无符合条件的活动</div>
        </div>
      ) : (
        <>
          <div className="activities-grid">
            {activities.map((activity, index) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                index={index}
                onClick={() => handleCardClick(activity)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`pagination-btn ${p === page ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="pagination-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      <ActivityModal
        activity={selectedActivity}
        onClose={handleCloseModal}
      />

      <ConflictModal
        isOpen={conflictModal.isOpen}
        conflicts={conflictModal.conflicts}
        newActivity={conflictModal.newActivity}
        onCancel={handleCancelConflict}
        onOverride={handleOverrideConflict}
      />
    </div>
  );
}
