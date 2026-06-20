import { useState, useCallback } from 'react';
import TeacherPanel from './components/TeacherPanel';
import StudentView from './components/StudentView';

type View = 'home' | 'teacher' | 'student';

export type User = {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  color: 'A' | 'B';
};

export default function App() {
  const [view, setView] = useState<View>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleLogin = useCallback((role: 'teacher' | 'student', userId: string) => {
    if (role === 'teacher') {
      const teachers: Record<string, User> = {
        t1: { id: 't1', name: '张老师', role: 'teacher', color: 'A' },
        t2: { id: 't2', name: '李老师', role: 'teacher', color: 'B' },
      };
      setCurrentUser(teachers[userId]);
      setView('teacher');
    } else {
      setCurrentUser({ id: userId, name: '学生' + userId.slice(1), role: 'student', color: 'A' });
      setView('student');
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setView('home');
  }, []);

  return (
    <div className="app-root">
      {view === 'home' && (
        <HomeScreen onLogin={handleLogin} />
      )}
      {view === 'teacher' && currentUser && (
        <TeacherPanel user={currentUser} onLogout={handleLogout} />
      )}
      {view === 'student' && currentUser && (
        <StudentView user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}

function HomeScreen({ onLogin }: { onLogin: (role: 'teacher' | 'student', userId: string) => void }) {
  const [activeRole, setActiveRole] = useState<'teacher' | 'student'>('teacher');
  const [selectedTeacher, setSelectedTeacher] = useState('t1');
  const [selectedStudent, setSelectedStudent] = useState('s1');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon} />
          <h1 style={styles.title}>智能作业批注与反馈系统</h1>
        </div>
        <p style={styles.subtitle}>高效批改 · 智能反馈 · 永久保存</p>
      </div>

      <div style={styles.cardContainer}>
        <div style={styles.card}>
          <div style={styles.roleTabs}>
            <button
              style={{
                ...styles.roleTab,
                ...(activeRole === 'teacher' ? styles.roleTabActive : {}),
              }}
              onClick={() => setActiveRole('teacher')}
            >
              <div style={styles.tabIconWrap}>
                <div style={{ ...styles.tabIcon, ...styles.teacherIcon }} />
              </div>
              教师登录
            </button>
            <button
              style={{
                ...styles.roleTab,
                ...(activeRole === 'student' ? styles.roleTabActive : {}),
              }}
              onClick={() => setActiveRole('student')}
            >
              <div style={styles.tabIconWrap}>
                <div style={{ ...styles.tabIcon, ...styles.studentIcon }} />
              </div>
              学生登录
            </button>
          </div>

          {activeRole === 'teacher' ? (
            <div style={styles.loginSection}>
              <p style={styles.loginLabel}>选择教师账户</p>
              <div style={styles.userList}>
                <button
                  style={{
                    ...styles.userItem,
                    ...(selectedTeacher === 't1' ? styles.userItemActive : {}),
                  }}
                  onClick={() => setSelectedTeacher('t1')}
                >
                  <div style={{ ...styles.avatar, backgroundColor: '#FFF0B3' }}>张</div>
                  <div style={styles.userInfo}>
                    <span style={styles.userName}>张老师</span>
                    <span style={styles.userDesc}>语文组</span>
                  </div>
                  <div style={{ ...styles.colorDot, backgroundColor: '#ECC94B' }} />
                </button>
                <button
                  style={{
                    ...styles.userItem,
                    ...(selectedTeacher === 't2' ? styles.userItemActive : {}),
                  }}
                  onClick={() => setSelectedTeacher('t2')}
                >
                  <div style={{ ...styles.avatar, backgroundColor: '#FFD6E0' }}>李</div>
                  <div style={styles.userInfo}>
                    <span style={styles.userName}>李老师</span>
                    <span style={styles.userDesc}>数学组</span>
                  </div>
                  <div style={{ ...styles.colorDot, backgroundColor: '#ED64A6' }} />
                </button>
              </div>
              <button
                style={styles.loginBtn}
                onClick={() => onLogin('teacher', selectedTeacher)}
              >
                进入教师面板 →
              </button>
            </div>
          ) : (
            <div style={styles.loginSection}>
              <p style={styles.loginLabel}>选择学生账户</p>
              <div style={styles.userList}>
                {['s1', 's2', 's3'].map((id, i) => (
                  <button
                    key={id}
                    style={{
                      ...styles.userItem,
                      ...(selectedStudent === id ? styles.userItemActive : {}),
                    }}
                    onClick={() => setSelectedStudent(id)}
                  >
                    <div style={{ ...styles.avatar, backgroundColor: '#BEE3F8' }}>
                      {String(i + 1)}
                    </div>
                    <div style={styles.userInfo}>
                      <span style={styles.userName}>学生{i + 1}</span>
                      <span style={styles.userDesc}>班级：三年级一班</span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                style={styles.loginBtn}
                onClick={() => onLogin('student', selectedStudent)}
              >
                查看作业反馈 →
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={styles.footer}>
        <p>© 2026 智能作业批注系统</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '40px 24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    backgroundColor: 'var(--accent)',
    borderRadius: 'var(--radius)',
    position: 'relative',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--accent)',
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
  },
  cardContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-md)',
    padding: '32px',
  },
  roleTabs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '28px',
  },
  roleTab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    borderRadius: 'var(--radius)',
    border: '2px solid var(--border)',
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    transition: 'all 0.2s ease',
  },
  roleTabActive: {
    borderColor: 'var(--accent)',
    backgroundColor: 'rgba(26, 54, 93, 0.05)',
    color: 'var(--accent)',
  },
  tabIconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
  },
  teacherIcon: {
    backgroundColor: '#4299E1',
  },
  studentIcon: {
    backgroundColor: '#48BB78',
  },
  loginSection: {},
  loginLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '24px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: 'var(--radius)',
    border: '2px solid var(--border)',
    transition: 'all 0.2s ease',
    textAlign: 'left',
  },
  userItemActive: {
    borderColor: 'var(--accent)',
    backgroundColor: 'rgba(26, 54, 93, 0.03)',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '16px',
    color: 'var(--text-primary)',
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  userName: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  userDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  colorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  loginBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: 'var(--accent)',
    color: '#fff',
    borderRadius: 'var(--radius)',
    fontSize: '16px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  footer: {
    textAlign: 'center',
    paddingTop: '32px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
};
