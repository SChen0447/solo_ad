import { create } from 'zustand';
import type { Course, Enrollment, Feedback } from '../types';
import * as api from '../api';
import { CURRENT_USER_ID } from '../types';

interface StoreState {
  courses: Course[];
  enrollments: Enrollment[];
  loading: boolean;
  error: string | null;
  
  fetchCourses: () => Promise<void>;
  fetchEnrollments: () => Promise<void>;
  signUpForCourse: (courseId: string) => Promise<boolean>;
  cancelCourseEnrollment: (courseId: string) => Promise<boolean>;
  submitCourseFeedback: (courseId: string, rating: number, comment: string) => Promise<Feedback | null>;
  updateCourseLocally: (courseId: string, updates: Partial<Course>) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  courses: [],
  enrollments: [],
  loading: false,
  error: null,

  fetchCourses: async () => {
    set({ loading: true, error: null });
    try {
      const courses = await api.fetchCourses();
      set({ courses, loading: false });
    } catch (error) {
      set({ error: '加载课程失败', loading: false });
    }
  },

  fetchEnrollments: async () => {
    try {
      const enrollments = await api.fetchEnrollments(CURRENT_USER_ID);
      set({ enrollments });
    } catch (error) {
      console.error('加载报名记录失败', error);
    }
  },

  signUpForCourse: async (courseId: string) => {
    try {
      const enrollment = await api.signUp(courseId, CURRENT_USER_ID);
      set(state => ({
        enrollments: [...state.enrollments, enrollment],
        courses: state.courses.map(c =>
          c.id === courseId
            ? { ...c, currentEnrollment: c.currentEnrollment + 1 }
            : c
        ),
      }));
      return true;
    } catch (error) {
      console.error('报名失败', error);
      return false;
    }
  },

  cancelCourseEnrollment: async (courseId: string) => {
    try {
      await api.cancelSignUp(courseId, CURRENT_USER_ID);
      set(state => ({
        enrollments: state.enrollments.filter(e => e.courseId !== courseId),
        courses: state.courses.map(c =>
          c.id === courseId
            ? { ...c, currentEnrollment: Math.max(0, c.currentEnrollment - 1) }
            : c
        ),
      }));
      return true;
    } catch (error) {
      console.error('取消报名失败', error);
      return false;
    }
  },

  submitCourseFeedback: async (courseId: string, rating: number, comment: string) => {
    try {
      const feedback = await api.submitFeedback(courseId, CURRENT_USER_ID, rating, comment);
      
      set(state => ({
        enrollments: state.enrollments.map(e =>
          e.courseId === courseId ? { ...e, feedbackSubmitted: true } : e
        ),
      }));
      
      const { courses } = get();
      const course = courses.find(c => c.id === courseId);
      if (course) {
        const newFeedbackCount = course.feedbackCount + 1;
        const newTotalRating = (course.averageRating * course.feedbackCount) + rating;
        const newAverageRating = Math.round((newTotalRating / newFeedbackCount) * 10) / 10;
        
        set(state => ({
          courses: state.courses.map(c =>
            c.id === courseId
              ? { ...c, averageRating: newAverageRating, feedbackCount: newFeedbackCount }
              : c
          ),
        }));
      }
      
      return feedback;
    } catch (error) {
      console.error('提交反馈失败', error);
      return null;
    }
  },

  updateCourseLocally: (courseId: string, updates: Partial<Course>) => {
    set(state => ({
      courses: state.courses.map(c =>
        c.id === courseId ? { ...c, ...updates } : c
      ),
    }));
  },
}));
