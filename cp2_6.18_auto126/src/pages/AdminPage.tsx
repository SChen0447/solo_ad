import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useApp } from '../App';
import CourseCard from '../components/CourseCard';
import { Course } from '../types';

const AdminPage: React.FC = () => {
  const { courses, refreshCourses, bookCourse, addCourse, deleteCourse, bookings } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    instructor: '',
    dateTime: '',
    capacity: '',
    type: 'yoga' as 'yoga' | 'strength' | 'cardio'
  });

  useEffect(() => {
    refreshCourses();
  }, [refreshCourses]);

  const bookedCourseIds = useMemo(() => {
    return new Set(bookings.map(b => b.courseId));
  }, [bookings]);

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) =>
      new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );
  }, [courses]);

  const totalPages = Math.ceil(sortedCourses.length / itemsPerPage);
  const showPagination = sortedCourses.length > 20;

  const paginatedCourses = useMemo(() => {
    if (!showPagination) return sortedCourses;
    const start = (currentPage - 1) * itemsPerPage;
    return sortedCourses.slice(start, start + itemsPerPage);
  }, [sortedCourses, currentPage, showPagination, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const courseData: Omit<Course, 'id' | 'bookedCount'> = {
      name: formData.name,
      instructor: formData.instructor,
      dateTime: formData.dateTime,
      capacity: parseInt(formData.capacity, 10),
      type: formData.type
    };
    await addCourse(courseData);
    setFormData({
      name: '',
      instructor: '',
      dateTime: '',
      capacity: '',
      type: 'yoga'
    });
  };

  const handleDeleteClick = useCallback((courseId: string) => {
    setShowDeleteModal(courseId);
  }, []);

  const confirmDelete = async () => {
    if (showDeleteModal) {
      await deleteCourse(showDeleteModal);
      setShowDeleteModal(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(null);
  };

  return (
    <div>
      <h2 className="section-title">管理员面板</h2>

      <div className="admin-form">
        <h3>添加新课程</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">课程名称</label>
            <input
              type="text"
              className="form-input"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="请输入课程名称"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">教练</label>
            <input
              type="text"
              className="form-input"
              name="instructor"
              value={formData.instructor}
              onChange={handleInputChange}
              placeholder="请输入教练姓名"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">日期时间 (格式: YYYY-MM-DD HH:MM)</label>
            <input
              type="text"
              className="form-input"
              name="dateTime"
              value={formData.dateTime}
              onChange={handleInputChange}
              placeholder="例如: 2024-01-15 10:00"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">容量</label>
            <input
              type="number"
              className="form-input"
              name="capacity"
              value={formData.capacity}
              onChange={handleInputChange}
              placeholder="请输入课程容量"
              min="1"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">课程类型</label>
            <select
              className="form-input"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
            >
              <option value="yoga">瑜伽</option>
              <option value="strength">力量训练</option>
              <option value="cardio">有氧运动</option>
            </select>
          </div>
          <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
            添加课程
          </button>
        </form>
      </div>

      <h3 className="section-title" style={{ fontSize: '20px' }}>课程列表</h3>
      {sortedCourses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-text">暂无课程</div>
        </div>
      ) : (
        <>
          <div className="courses-grid">
            {paginatedCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                isBooked={bookedCourseIds.has(course.id)}
                onBook={bookCourse}
                onDelete={handleDeleteClick}
                isAdmin={true}
              />
            ))}
          </div>
          {showPagination && totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`page-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="page-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">确认删除</h3>
            <p>确定要删除这个课程吗？所有相关的预约也将被取消。</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={cancelDelete}>
                取消
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
