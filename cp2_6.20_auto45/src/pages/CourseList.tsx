import { useState, useMemo } from 'react';
import CourseCard from '../components/CourseCard';
import type { Course } from '../api';

interface CourseListProps {
  courses: Course[];
}

const ALL_TYPES = ['全部', '陶艺', '编织', '木工', '刺绣', '皮具', '烘焙'];
const ALL_DIFFICULTIES = ['全部难度', '入门', '初级', '中级', '高级'];

export default function CourseList({ courses }: CourseListProps) {
  const [selectedType, setSelectedType] = useState('全部');
  const [selectedDifficulty, setSelectedDifficulty] = useState('全部难度');
  const [searchText, setSearchText] = useState('');

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchType = selectedType === '全部' || course.type === selectedType;
      const matchDifficulty = selectedDifficulty === '全部难度' || course.difficulty === selectedDifficulty;
      const matchSearch = !searchText ||
        course.title.toLowerCase().includes(searchText.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchText.toLowerCase());
      return matchType && matchDifficulty && matchSearch;
    });
  }, [courses, selectedType, selectedDifficulty, searchText]);

  return (
    <div className="course-list-page fade-in">
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#3E2723',
            marginBottom: '8px'
          }}
        >
          🎨 探索手工艺课程
        </h1>
        <p style={{ color: '#6D4C41', fontSize: '15px' }}>
          共 <span style={{ color: '#D2691E', fontWeight: 600 }}>{courses.length}</span> 门精选课程，开启你的创作之旅
        </p>
      </div>

      <div
        className="card"
        style={{
          padding: '20px',
          marginBottom: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="搜索课程名称或讲师..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '42px' }}
          />
          <span
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '16px'
            }}
          >
            🔍
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '12px', color: '#8D6E63', marginBottom: '8px', fontWeight: 600 }}>
              课程类型
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ALL_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: selectedType === type ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: selectedType === type
                      ? 'linear-gradient(135deg, #D2691E, #E07A2F)'
                      : 'rgba(139,69,19,0.06)',
                    color: selectedType === type ? 'white' : '#5D4037'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div style={{ minWidth: '180px' }}>
            <div style={{ fontSize: '12px', color: '#8D6E63', marginBottom: '8px', fontWeight: 600 }}>
              难度等级
            </div>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="input-field"
              style={{ cursor: 'pointer' }}
            >
              {ALL_DIFFICULTIES.map(diff => (
                <option key={diff} value={diff}>{diff}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', color: '#6D4C41' }}>
          找到 <span style={{ color: '#D2691E', fontWeight: 700 }}>{filteredCourses.length}</span> 门课程
        </div>
      </div>

      {filteredCourses.length > 0 ? (
        <div
          className="course-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 300px)',
            gap: '24px',
            justifyContent: 'center',
            animation: 'fadeIn 0.4s ease'
          }}
        >
          {filteredCourses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            color: '#8D6E63'
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#5D4037', marginBottom: '8px' }}>
            未找到符合条件的课程
          </div>
          <div style={{ fontSize: '14px' }}>
            试试调整筛选条件或搜索其他关键词
          </div>
        </div>
      )}
    </div>
  );
}
