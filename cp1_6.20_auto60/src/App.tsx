import React, { useState, useEffect, useCallback, useRef } from 'react';
import BrainstormPage from './pages/BrainstormPage';
import VotePage from './pages/VotePage';
import { socketService, DecisionReport } from './services/socketService';
import { Member, Topic, Idea, apiService } from './services/apiService';

type PageType = 'brainstorm' | 'vote';

const ANIMALS = [
  '猫', '狗', '兔子', '狐狸', '熊猫', '老虎', '狮子', '大象', '海豚', '企鹅',
  '猫头鹰', '松鼠', '考拉', '刺猬', '浣熊', '独角兽', '龙', '凤凰', '麒麟', '狼'
];

const COLORS = [
  '#ef5350', '#ec407a', '#ab47bc', '#7e57c2', '#5c6bc0',
  '#42a5f5', '#29b6f6', '#26c6da', '#26a69a', '#66bb6a',
  '#9ccc65', '#ffa726', '#ff7043', '#8d6e63', '#78909c'
];

const COLOR_NAMES: { [key: string]: string } = {
  '#ef5350': '红色', '#ec407a': '粉色', '#ab47bc': '紫色', '#7e57c2': '靛蓝',
  '#5c6bc0': '蓝色', '#42a5f5': '天蓝', '#29b6f6': '浅蓝', '#26c6da': '青色',
  '#26a69a': '蓝绿', '#66bb6a': '绿色', '#9ccc65': '草绿', '#ffa726': '橙色',
  '#ff7043': '珊瑚', '#8d6e63': '棕色', '#78909c': '灰色'
};

function generateMember(): Member {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const colorName = COLOR_NAMES[color] || '彩色';
  const id = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    name: `${colorName}的${animal}`,
    color,
  };
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('brainstorm');
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [report, setReport] = useState<DecisionReport | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);

  const initMember = useCallback(() => {
    const stored = localStorage.getItem('brainstorm_member');
    let member: Member;
    if (stored) {
      try {
        member = JSON.parse(stored);
      } catch {
        member = generateMember();
      }
    } else {
      member = generateMember();
      localStorage.setItem('brainstorm_member', JSON.stringify(member));
    }
    setCurrentMember(member);
    return member;
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const member = initMember();

    const loadInitialData = async () => {
      try {
        const [topicsData, ideasData] = await Promise.all([
          apiService.getTopics(),
          apiService.getIdeas(),
        ]);
        setTopics(topicsData);
        setIdeas(ideasData);
        if (topicsData.length > 0) {
          setSelectedTopicId(topicsData[0].id);
        }
      } catch (err) {
        console.error('加载初始数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    socketService.connect(member);

    const cleanups = [
      socketService.on('connect', () => setIsConnected(true)),
      socketService.on('disconnect', () => setIsConnected(false)),
      socketService.on('member_joined', (newMember: Member) => {
        setMembers((prev) => {
          if (prev.find((m) => m.id === newMember.id)) return prev;
          return [...prev, newMember];
        });
      }),
      socketService.on('member_left', (memberId: string) => {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      }),
      socketService.on('members_list', (membersList: Member[]) => {
        setMembers(membersList);
      }),
      socketService.on('new_idea', (idea: Idea) => {
        setIdeas((prev) => {
          if (prev.find((i) => i.id === idea.id)) return prev;
          return [...prev, idea];
        });
        setTopics((prev) =>
          prev.map((t) =>
            t.id === idea.topicId ? { ...t, ideaCount: t.ideaCount + 1 } : t
          )
        );
      }),
      socketService.on('new_vote', (idea: Idea) => {
        setIdeas((prev) => prev.map((i) => (i.id === idea.id ? idea : i)));
      }),
      socketService.on('vote_ended', (reportData: DecisionReport) => {
        setReport(reportData);
        setShowReport(true);
      }),
    ];

    const timeout = setTimeout(() => {
      socketService.requestSync();
    }, 500);

    return () => {
      clearTimeout(timeout);
      cleanups.forEach((fn) => fn());
      socketService.disconnect();
    };
  }, [initMember]);

  const handleCreateTopic = (topic: Topic) => {
    setTopics((prev) => [...prev, topic]);
    setSelectedTopicId(topic.id);
  };

  const handleCreateIdea = (idea: Idea) => {
    setIdeas((prev) => [...prev, idea]);
    setTopics((prev) =>
      prev.map((t) =>
        t.id === idea.topicId ? { ...t, ideaCount: t.ideaCount + 1 } : t
      )
    );
    socketService.sendNewIdea(idea);
  };

  const handleUpdateIdea = (idea: Idea) => {
    setIdeas((prev) => prev.map((i) => (i.id === idea.id ? idea : i)));
    socketService.sendNewVote(idea);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <div style={{ marginTop: 20, color: '#bb86fc', fontSize: 16 }}>
          正在连接...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <div
        className={`sidebar-desktop`}
        style={{
          ...styles.sidebar,
          ...(sidebarOpen ? styles.sidebarOpen : {}),
        }}
      >
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>💡</div>
          <div style={styles.logoText}>创意风暴</div>
        </div>

        <div style={styles.userSection}>
          {currentMember && (
            <div style={styles.userCard}>
              <div
                style={{
                  ...styles.avatar,
                  backgroundColor: currentMember.color,
                }}
              >
                {currentMember.name.charAt(currentMember.name.length - 1)}
              </div>
              <div style={styles.userInfo}>
                <div style={styles.userName}>{currentMember.name}</div>
                <div style={styles.userStatus}>
                  <span
                    style={{
                      ...styles.statusDot,
                      backgroundColor: isConnected ? '#66bb6a' : '#ef5350',
                    }}
                  />
                  {isConnected ? '在线' : '离线'}
                </div>
              </div>
            </div>
          )}
        </div>

        <nav style={styles.navSection}>
          <div
            style={{
              ...styles.navItem,
              ...(currentPage === 'brainstorm' ? styles.navItemActive : {}),
            }}
            onClick={() => {
              setCurrentPage('brainstorm');
              setSidebarOpen(false);
            }}
          >
            <span style={styles.navIcon}>🧠</span>
            <span>头脑风暴</span>
            {currentPage === 'brainstorm' && <div style={styles.navIndicator} />}
          </div>
          <div
            style={{
              ...styles.navItem,
              ...(currentPage === 'vote' ? styles.navItemActive : {}),
            }}
            onClick={() => {
              setCurrentPage('vote');
              setSidebarOpen(false);
            }}
          >
            <span style={styles.navIcon}>🗳️</span>
            <span>投票决策</span>
            {currentPage === 'vote' && <div style={styles.navIndicator} />}
          </div>
        </nav>

        <div style={styles.membersSection}>
          <div style={styles.membersTitle}>在线成员 ({members.length})</div>
          <div style={styles.membersList}>
            {members.map((member, index) => (
              <div
                key={member.id}
                style={{
                  ...styles.memberItem,
                  animation: `slideInRight 0.3s ease-out ${index * 0.05}s both`,
                }}
                title={member.name}
              >
                <div
                  style={{
                    ...styles.memberAvatar,
                    backgroundColor: member.color,
                  }}
                >
                  {member.name.charAt(member.name.length - 1)}
                </div>
                <div style={styles.memberName}>{member.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className={sidebarOpen ? 'overlay-mobile' : ''}
        style={{
          ...styles.overlay,
          ...(sidebarOpen ? styles.overlayVisible : {}),
        }}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="main-content-desktop" style={styles.mainContent}>
        <div className="mobile-header-desktop" style={styles.mobileHeader}>
          <button style={styles.hamburger} onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          <div style={styles.mobileTitle}>创意风暴</div>
          <div style={{ width: 40 }} />
        </div>

        {currentPage === 'brainstorm' ? (
          <BrainstormPage
            topics={topics}
            ideas={ideas}
            members={members}
            selectedTopicId={selectedTopicId}
            setSelectedTopicId={setSelectedTopicId}
            currentMember={currentMember!}
            onCreateTopic={handleCreateTopic}
            onCreateIdea={handleCreateIdea}
          />
        ) : (
          <VotePage
            ideas={ideas}
            topics={topics}
            members={members}
            currentMember={currentMember!}
            onUpdateIdea={handleUpdateIdea}
            report={report}
            showReport={showReport}
            setShowReport={setShowReport}
          />
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  appContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#121212',
    color: '#e0e0e0',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#121212',
  },
  spinner: {
    width: 50,
    height: 50,
    border: '3px solid transparent',
    borderTop: '3px solid #bb86fc',
    borderRight: '3px solid #3700b3',
    borderRadius: '50%',
    animation: 'spin 2s linear infinite',
  },
  sidebar: {
    width: 240,
    minWidth: 240,
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    transform: 'translateX(-100%)',
    transition: 'transform 0.3s ease',
  },
  sidebarOpen: {
    transform: 'translateX(0)',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 99,
    opacity: 0,
    visibility: 'hidden',
    transition: 'all 0.3s ease',
  },
  overlayVisible: {
    opacity: 1,
    visibility: 'visible',
  },
  mainContent: {
    flex: 1,
    marginLeft: 0,
    minHeight: '100vh',
    padding: 0,
    overflowX: 'hidden',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    padding: '24px 20px',
    gap: 12,
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  logoIcon: {
    fontSize: 28,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e0e0e0',
  },
  userSection: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 600,
    fontSize: 16,
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  userName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#e0e0e0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userStatus: {
    fontSize: 12,
    color: '#888',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  navSection: {
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    position: 'relative',
    overflow: 'hidden',
    color: '#888',
    gap: 12,
    fontSize: 14,
  },
  navItemActive: {
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    color: '#bb86fc',
    fontWeight: 500,
  },
  navIcon: {
    fontSize: 18,
  },
  navIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#bb86fc',
    borderRadius: '0 2px 2px 0',
    animation: 'navFill 0.2s ease-out',
  },
  membersSection: {
    flex: 1,
    padding: '16px 20px',
    overflowY: 'auto',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  membersTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  membersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  memberItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px',
    borderRadius: 8,
    transition: 'background-color 0.2s',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 600,
    fontSize: 14,
    flexShrink: 0,
  },
  memberName: {
    fontSize: 13,
    color: '#ccc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  mobileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  hamburger: {
    background: 'none',
    border: 'none',
    color: '#e0e0e0',
    fontSize: 24,
    cursor: 'pointer',
    padding: 4,
  },
  mobileTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e0e0e0',
  },
};

export default App;
