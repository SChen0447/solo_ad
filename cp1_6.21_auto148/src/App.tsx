import { useState, useEffect } from 'react';
import MemberCard from './components/MemberCard';
import SkillMatrix from './components/SkillMatrix';
import ProjectForm from './components/ProjectForm';
import MatchResult from './components/MatchResult';
import MemberDetail from './components/MemberDetail';
import { Member, Skill, MatchResult as MatchResultType } from './types';

type Page = 'members' | 'matrix' | 'project' | 'result' | 'detail';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResultType[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [membersRes, skillsRes] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/skills')
      ]);
      const membersData = await membersRes.json();
      const skillsData = await skillsRes.json();
      setMembers(membersData);
      setSkills(skillsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setCurrentPage('detail');
  };

  const handleProjectSubmit = async (requirementId: number, name: string) => {
    try {
      const res = await fetch(`/api/project-requirements/${requirementId}/match`);
      const results = await res.json();
      setMatchResults(results);
      setProjectName(name);
      setCurrentPage('result');
    } catch (error) {
      console.error('Failed to calculate match:', error);
    }
  };

  const handleBarClick = (memberId: number) => {
    const member = members.find(m => m.id === memberId);
    if (member) {
      setSelectedMember(member);
      setCurrentPage('detail');
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '16px', color: '#94a3b8' }}>加载中...</p>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>团队技能匹配分析</h1>
        <nav style={styles.nav}>
          <button
            style={{ ...styles.navBtn, ...(currentPage === 'members' ? styles.navBtnActive : {}) }}
            onClick={() => setCurrentPage('members')}
          >
            成员管理
          </button>
          <button
            style={{ ...styles.navBtn, ...(currentPage === 'matrix' ? styles.navBtnActive : {}) }}
            onClick={() => setCurrentPage('matrix')}
          >
            技能矩阵
          </button>
          <button
            style={{ ...styles.navBtn, ...(currentPage === 'project' ? styles.navBtnActive : {}) }}
            onClick={() => setCurrentPage('project')}
          >
            新项目匹配
          </button>
        </nav>
      </header>

      <main style={styles.main}>
        {currentPage === 'members' && (
          <div>
            <div style={styles.pageHeader}>
              <h2 style={styles.pageTitle}>团队成员</h2>
              <p style={styles.pageSubtitle}>共 {members.length} 名成员</p>
            </div>
            <div style={styles.grid}>
              {members.map(member => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onClick={() => handleMemberClick(member)}
                />
              ))}
            </div>
          </div>
        )}

        {currentPage === 'matrix' && (
          <div>
            <div style={styles.pageHeader}>
              <h2 style={styles.pageTitle}>技能矩阵</h2>
              <p style={styles.pageSubtitle}>团队技能分布热力图</p>
            </div>
            <SkillMatrix members={members} skills={skills} />
          </div>
        )}

        {currentPage === 'project' && (
          <div>
            <div style={styles.pageHeader}>
              <h2 style={styles.pageTitle}>创建项目需求</h2>
              <p style={styles.pageSubtitle}>填写项目所需技能，系统自动匹配最佳人选</p>
            </div>
            <ProjectForm
              skills={skills}
              onSubmit={handleProjectSubmit}
            />
          </div>
        )}

        {currentPage === 'result' && (
          <div>
            <div style={styles.pageHeader}>
              <h2 style={styles.pageTitle}>匹配结果 - {projectName}</h2>
              <p style={styles.pageSubtitle}>以下是最适合该项目的前五名成员</p>
              <button
                style={{ ...styles.btn, ...styles.btnSecondary, marginLeft: 'auto' }}
                onClick={() => setCurrentPage('project')}
              >
                返回创建
              </button>
            </div>
            <MatchResult
              results={matchResults.slice(0, 5)}
              onBarClick={handleBarClick}
            />
          </div>
        )}

        {currentPage === 'detail' && selectedMember && (
          <div>
            <div style={styles.pageHeader}>
              <button
                style={{ ...styles.btn, ...styles.btnSecondary, marginRight: '16px' }}
                onClick={() => setCurrentPage('members')}
              >
                ← 返回列表
              </button>
              <h2 style={styles.pageTitle}>成员详情</h2>
            </div>
            <MemberDetail member={selectedMember} skills={skills} />
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    padding: '0 24px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(59, 130, 246, 0.2)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    padding: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    animation: 'fadeIn 0.5s ease',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  nav: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  navBtn: {
    padding: '10px 24px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  navBtnActive: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3))',
    borderColor: 'rgba(59, 130, 246, 0.5)',
    color: '#e2e8f0',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    paddingBottom: '48px',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
    animation: 'fadeIn 0.5s ease',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#f1f5f9',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  btn: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  btnSecondary: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#e2e8f0',
  },
};

export default App;
