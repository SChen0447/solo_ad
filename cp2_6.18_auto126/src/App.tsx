import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { Course, Booking, User } from './types';
import CoursesPage from './pages/CoursesPage';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminPage from './pages/AdminPage';

interface AuthContextType {
  user: User | null;
  login: (name: string, phone: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AppContextType {
  courses: Course[];
  bookings: Booking[];
  refreshCourses: () => Promise<void>;
  refreshBookings: () => Promise<void>;
  bookCourse: (courseId: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  addCourse: (course: Omit<Course, 'id' | 'bookedCount'>) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

const LoginForm: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(name, phone);
    navigate('/');
  };

  return (
    <div className="login-form">
      <h2 className="login-title">会员登录 / 注册</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">姓名</label>
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入您的姓名"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">手机号</label>
          <input
            type="tel"
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="请输入您的手机号"
            required
          />
        </div>
        <button type="submit" className="form-btn">
          登录 / 注册
        </button>
      </form>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const { bookings, refreshBookings } = useApp();

  useEffect(() => {
    if (user) {
      refreshBookings();
    }
  }, [user, refreshBookings]);

  const upcomingBookings = bookings.filter(b => b.course).length;

  if (!user) {
    return (
      <div className="container">
        <header className="header">
          <h1 className="title">健身房会员管理系统</h1>
        </header>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">健身房会员管理系统</h1>
        <nav className="nav">
          <NavLink to="/" className="nav-link">课程列表</NavLink>
          <NavLink to="/my-bookings" className="nav-link">我的预约</NavLink>
          <NavLink to="/admin" className="nav-link">管理员</NavLink>
        </nav>
        <div className="user-info">
          <span className="user-name">欢迎，{user.name}</span>
          <button className="logout-btn" onClick={logout}>退出登录</button>
        </div>
      </header>

      <div className="welcome-banner">
        <div className="welcome-text">欢迎回来，{user.name}！</div>
        <div className="booking-summary">
          您有 {upcomingBookings} 个即将到来的课程
        </div>
      </div>

      <Routes>
        <Route path="/" element={<CoursesPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('gym_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = useCallback(async (name: string, phone: string) => {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    });
    const userData = await response.json();
    setUser(userData);
    localStorage.setItem('gym_user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('gym_user');
    setBookings([]);
  }, []);

  const refreshCourses = useCallback(async () => {
    const response = await fetch('/api/courses');
    const data = await response.json();
    setCourses(data);
  }, []);

  const refreshBookings = useCallback(async () => {
    if (!user) return;
    const response = await fetch(`/api/bookings?userId=${user.id}`);
    const data = await response.json();
    setBookings(data);
  }, [user]);

  const bookCourse = useCallback(async (courseId: string) => {
    if (!user) return;
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        courseId,
        userName: user.name
      })
    });
    if (response.ok) {
      await refreshCourses();
      await refreshBookings();
    } else {
      const error = await response.json();
      alert(error.error);
    }
  }, [user, refreshCourses, refreshBookings]);

  const cancelBooking = useCallback(async (bookingId: string) => {
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      await refreshCourses();
      await refreshBookings();
    }
  }, [refreshCourses, refreshBookings]);

  const addCourse = useCallback(async (courseData: Omit<Course, 'id' | 'bookedCount'>) => {
    const response = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courseData)
    });
    if (response.ok) {
      await refreshCourses();
    } else {
      const error = await response.json();
      alert(error.error);
    }
  }, [refreshCourses]);

  const deleteCourse = useCallback(async (courseId: string) => {
    const response = await fetch(`/api/courses/${courseId}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      await refreshCourses();
      await refreshBookings();
    }
  }, [refreshCourses, refreshBookings]);

  const authValue: AuthContextType = { user, login, logout };
  const appValue: AppContextType = {
    courses,
    bookings,
    refreshCourses,
    refreshBookings,
    bookCourse,
    cancelBooking,
    addCourse,
    deleteCourse
  };

  return (
    <AuthContext.Provider value={authValue}>
      <AppContext.Provider value={appValue}>
        <AppContent />
      </AppContext.Provider>
    </AuthContext.Provider>
  );
};

export default App;
