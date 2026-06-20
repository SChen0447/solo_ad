import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { BookOpen, Trophy } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

interface UserAchievement {
  achievementId: string;
  unlockedAt: string;
}

interface ReadingProgress {
  bookId: string;
  progress: number;
  lastRead: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
}

interface ProfilePageProps {
  currentUser: any;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>([]);
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    if (currentUser) {
      fetchAchievements();
      fetchUserAchievements();
      fetchReadingProgress();
      fetchBooks();
    }
  }, [currentUser]);

  const fetchAchievements = async () => {
    try {
      const res = await fetch('/api/achievements');
      const data = await res.json();
      setAchievements(data);
    } catch (err) {
      console.error('Failed to fetch achievements:', err);
    }
  };

  const fetchUserAchievements = async () => {
    try {
      const res = await fetch(`/api/users/${currentUser.id}/achievements`);
      const data = await res.json();
      setUserAchievements(data);
    } catch (err) {
      console.error('Failed to fetch user achievements:', err);
    }
  };

  const fetchReadingProgress = async () => {
    try {
      const res = await fetch(`/api/users/${currentUser.id}/reading-progress`);
      const data = await res.json();
      setReadingProgress(data);
    } catch (err) {
      console.error('Failed to fetch reading progress:', err);
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error('Failed to fetch books:', err);
    }
  };

  const getBookById = (bookId: string) => {
    return books.find(b => b.id === bookId);
  };

  const isUnlocked = (achievementId: string) => {
    return userAchievements.some(ua => ua.achievementId === achievementId);
  };

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">个人中心</h1>

      <div className="profile-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img 
            src={currentUser.avatar} 
            alt={currentUser.username}
            style={{ width: '80px', height: '80px', borderRadius: '50%' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/default/100/100';
            }}
          />
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{currentUser.username}</h2>
            <p style={{ color: '#7A6554', fontSize: '14px' }}>
              角色：{currentUser.role === 'admin' ? '管理员' : '读者'}
            </p>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h2 className="profile-section-title">
          <BookOpen size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          阅读轨迹
        </h2>
        {readingProgress.length > 0 ? (
          <div className="reading-list">
            {readingProgress.map(rp => {
              const book = getBookById(rp.bookId);
              if (!book) return null;
              return (
                <div key={rp.bookId} className="reading-book-card">
                  <img 
                    src={book.coverUrl} 
                    alt={book.title}
                    className="reading-book-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${book.id}/220/300`;
                    }}
                  />
                  <div className="reading-book-info">
                    <div className="reading-book-title">{book.title}</div>
                    <div className="progress-bar">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${rp.progress}%` }}
                      />
                    </div>
                    <div style={{ fontSize: '12px', color: '#7A6554', marginTop: '4px' }}>
                      {rp.progress}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#7A6554' }}>
            暂无阅读记录，去参加读书会吧～
          </div>
        )}
      </div>

      <div className="profile-section">
        <h2 className="profile-section-title">
          <Trophy size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          成就徽章
        </h2>
        <div className="achievement-grid">
          {achievements.map(achievement => {
            const unlocked = isUnlocked(achievement.id);
            const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
            return (
              <div key={achievement.id} className={`achievement-badge ${unlocked ? '' : 'locked'}`}>
                {achievement.icon}
                <div className="achievement-tooltip">
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{achievement.name}</div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>{achievement.description}</div>
                  {unlocked && userAchievement && (
                    <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
                      {new Date(userAchievement.unlockedAt).toLocaleDateString('zh-CN')} 获得
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ marginTop: '16px', fontSize: '13px', color: '#7A6554' }}>
          已获得 {userAchievements.length} / {achievements.length} 个成就
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;
