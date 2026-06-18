import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Check, Loader2 } from 'lucide-react';
import {
  fetchProjects,
  fetchMembers,
  fetchTimeRecords,
  submitTimeRecord,
  type Project,
  type Member,
  type TimeRecord,
} from '@/api';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function ProjectGroup({
  project,
  members,
  todayRecords,
  isExpanded,
  onToggle,
}: {
  project: Project;
  members: Member[];
  todayRecords: TimeRecord[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const projectRecords = todayRecords.filter((r) => r.projectId === project.id);
  const getMemberHours = (memberId: string) => {
    return projectRecords
      .filter((r) => r.memberId === memberId)
      .reduce((sum, r) => sum + r.hours, 0);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <button
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <span className="font-semibold text-gray-800">{project.name}</span>
          <span className="text-sm text-gray-500">({members.length}人)</span>
        </div>
      </button>
      {isExpanded && (
        <div
          className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: '500px' }}
        >
          <div className="p-2 space-y-1">
            {members.map((member) => {
              const hours = getMemberHours(member.id);
              const initial = member.name.charAt(0);
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {initial}
                    </div>
                    <span className="text-gray-700">{member.name}</span>
                  </div>
                  <div className="text-sm">
                    {hours > 0 ? (
                      <span className="text-green-600 font-medium">
                        已录入 {hours}h
                      </span>
                    ) : (
                      <span className="text-gray-400">未录入</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimeEntry() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [todayRecords, setTodayRecords] = useState<TimeRecord[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [hours, setHours] = useState<number>(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [projectsData, membersData] = await Promise.all([
        fetchProjects(),
        fetchMembers(),
      ]);
      setProjects(projectsData);
      setMembers(membersData);
      if (projectsData.length > 0) {
        setExpandedProjects(new Set([projectsData[0].id]));
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, []);

  const loadTodayRecords = useCallback(async () => {
    try {
      const records = await fetchTimeRecords(
        undefined,
        `${selectedDate},${selectedDate}`
      );
      setTodayRecords(records);
    } catch (error) {
      console.error('加载今日记录失败:', error);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadTodayRecords();
  }, [loadTodayRecords]);

  const filteredMembers = selectedProject
    ? members.filter((m) => m.projectIds.includes(selectedProject))
    : members;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedMember || !selectedDate || hours <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitTimeRecord({
        projectId: selectedProject,
        memberId: selectedMember,
        date: selectedDate,
        hours,
      });

      await loadTodayRecords();

      setTimeout(() => {
        setIsSubmitting(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1500);
      }, 800);
    } catch (error) {
      console.error('提交失败:', error);
      setIsSubmitting(false);
    }
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const getProjectMembers = (projectId: string) => {
    return members.filter((m) => m.projectIds.includes(projectId));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">工时录入</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 lg:max-w-xl">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              项目成员列表
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {projects.map((project) => (
                <ProjectGroup
                  key={project.id}
                  project={project}
                  members={getProjectMembers(project.id)}
                  todayRecords={todayRecords}
                  isExpanded={expandedProjects.has(project.id)}
                  onToggle={() => toggleProject(project.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:w-96">
          <div className="bg-white rounded-xl shadow-md p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">
              快速录入
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目名称
                </label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    setSelectedMember('');
                  }}
                  required
                >
                  <option value="">请选择项目</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  成员姓名
                </label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  required
                  disabled={!selectedProject}
                >
                  <option value="">请选择成员</option>
                  {filteredMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日期
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  工时（小时）
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={hours}
                  onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !selectedProject ||
                  !selectedMember ||
                  !selectedDate ||
                  hours <= 0
                }
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>提交中...</span>
                  </>
                ) : showSuccess ? (
                  <>
                    <Check className="w-5 h-5 text-green-300" />
                    <span>提交成功</span>
                  </>
                ) : (
                  <span>提交</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
