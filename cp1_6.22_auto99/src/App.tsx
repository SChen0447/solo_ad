import { useEffect, useState } from 'react';
import EmployeeList from './components/EmployeeList';
import ProgressRadar from './components/ProgressRadar';
import RecommendPanel from './components/RecommendPanel';
import type { Employee, Course, Milestone, Progress as ProgressType } from './types';

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showRadar, setShowRadar] = useState(false);
  const [progress, setProgress] = useState<ProgressType | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data: Employee[]) => setEmployees(data))
      .catch((err) => console.error('获取员工列表失败:', err));
  }, []);

  const handleEmployeeClick = async (employee: Employee) => {
    setSelectedEmployee(employee);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employee.id }),
      });
      const data = await res.json();
      setRecommendedCourses(data.courses || []);
      setMilestones(data.milestones || []);
    } catch (err) {
      console.error('获取推荐路径失败:', err);
    }
    if (isMobile) {
      setDrawerOpen(true);
    }
  };

  const handleViewProgress = async (employeeId: string) => {
    try {
      const res = await fetch(`/api/progress/${employeeId}`);
      const data: ProgressType = await res.json();
      setProgress(data);
      setShowRadar(true);
    } catch (err) {
      console.error('获取进度数据失败:', err);
    }
  };

  const handleSavePlan = async () => {
    if (!selectedEmployee) return;
    try {
      await fetch('/api/save-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          courses: recommendedCourses,
          milestones,
        }),
      });
      alert('学习计划已保存!');
    } catch (err) {
      console.error('保存计划失败:', err);
    }
  };

  const handleMilestoneDateChange = (milestoneId: string, date: string) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === milestoneId ? { ...m, dueDate: date } : m))
    );
  };

  const handleMilestoneComplete = async (milestoneId: string) => {
    if (!selectedEmployee) return;
    try {
      await fetch('/api/milestone/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          milestoneId,
        }),
      });
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestoneId ? { ...m, completed: true } : m))
      );
    } catch (err) {
      console.error('完成里程碑失败:', err);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>智能培训路径规划系统</h1>
        <p className="header-subtitle">基于员工技能数据的个性化学习推荐</p>
      </header>
      <div className="main-layout">
        <div className="left-panel">
          <EmployeeList
            employees={employees}
            onEmployeeClick={handleEmployeeClick}
            onViewProgress={handleViewProgress}
          />
        </div>
        {!isMobile && (
          <div className="right-panel">
            <RecommendPanel
              employee={selectedEmployee}
              courses={recommendedCourses}
              milestones={milestones}
              onCoursesReorder={setRecommendedCourses}
              onMilestoneDateChange={handleMilestoneDateChange}
              onMilestoneComplete={handleMilestoneComplete}
              onSavePlan={handleSavePlan}
            />
          </div>
        )}
      </div>
      {isMobile && drawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>学习路径推荐</h3>
              <button className="close-btn" onClick={() => setDrawerOpen(false)}>
                ×
              </button>
            </div>
            <RecommendPanel
              employee={selectedEmployee}
              courses={recommendedCourses}
              milestones={milestones}
              onCoursesReorder={setRecommendedCourses}
              onMilestoneDateChange={handleMilestoneDateChange}
              onMilestoneComplete={handleMilestoneComplete}
              onSavePlan={handleSavePlan}
            />
          </div>
        </div>
      )}
      {showRadar && progress && (
        <ProgressRadar progress={progress} onClose={() => setShowRadar(false)} />
      )}
    </div>
  );
}
