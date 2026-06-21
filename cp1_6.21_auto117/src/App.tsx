import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import {
  BookOpen,
  FileText,
  GraduationCap,
  Plus,
  Upload,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  BarChart3,
  Download,
  RefreshCw,
  AlertTriangle,
  LogIn,
  Home,
  ArrowLeft,
  Trophy,
  Clock,
  Award,
  Target,
} from 'lucide-react';
import { api } from './api';
import type {
  WordBank,
  Test,
  TestConfig,
  QuestionType,
  PartOfSpeech,
  DiagnosisReport,
  ScoreRank,
} from './types';
import TestView from './components/TestView';

type Page = 'home' | 'teacher' | 'student-entry' | 'student-test' | 'report';
type TeacherTab = 'wordbanks' | 'tests';

const POS_LABELS = {
  noun: '名词',
  verb: '动词',
  adjective: '形容词',
  adverb: '副词',
  preposition: '介词',
  conjunction: '连词',
  pronoun: '代词',
  interjection: '感叹词',
};
const POS_COLORS = {
  noun: '#E3F2FD',
  verb: '#FCE4EC',
  adjective: '#E8F5E9',
  adverb: '#FFF3E0',
  preposition: '#F3E5F5',
  conjunction: '#E0F7FA',
  pronoun: '#FFF8E1',
  interjection: '#FFEBEE',
};
const POS_TEXT_COLORS = {
  noun: '#1976D2',
  verb: '#C2185B',
  adjective: '#388E3C',
  adverb: '#F57C00',
  preposition: '#7B1FA2',
  conjunction: '#0097A7',
  pronoun: '#FBC02D',
  interjection: '#D32F2F',
};

const POS_OPTIONS: PartOfSpeech[] = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'conjunction',
  'pronoun',
  'interjection',
];

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 16,
};

const cardGradient: React.CSSProperties = {
  background: 'linear-gradient(135deg, #DEEBF8 0%, #E8DAEF 100%)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
};

const cardShadow = '0 4px 16px rgba(0,0,0,0.06)';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#555',
  marginBottom: 6,
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 14,
  background: '#fff',
  transition: 'all 0.2s',
  color: '#333',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 22px',
  background: '#2196F3',
  color: '#fff',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 22px',
  background: '#fff',
  color: '#2196F3',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  border: '1px solid #BBDEFB',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '10px 22px',
  background: '#f0f0f0',
  color: '#555',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
};

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 28,
          maxWidth: 560,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'fadeInUp 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{title}</h3>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: '#f0f0f0', color: '#666' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function HalfModal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          width: '50%',
          minWidth: 480,
          height: '100vh',
          padding: 28,
          overflowY: 'auto',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.2)',
          animation: 'slideInRight 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{title}</h3>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: '#f0f0f0', color: '#666' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}

function statStyle(color: string): React.CSSProperties {
  return {
    padding: '14px 20px',
    borderRadius: 12,
    background: `linear-gradient(135deg, ${color}15, ${color}08)`,
    color,
    borderLeft: `4px solid ${color}`,
    minWidth: 140,
  };
}

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('wordbanks');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reportData, setReportData] = useState<DiagnosisReport | null>(null);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5' }}>
      {page === 'home' && <HomePage onEnter={(p) => setPage(p)} />}
      {page === 'teacher' && (
        <TeacherLayout
          teacherTab={teacherTab}
          setTeacherTab={setTeacherTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setPage={setPage}
        />
      )}
      {page === 'student-entry' && <StudentEntryPage setPage={setPage} setReport={setReportData} />}
      {page === 'report' && reportData && (
        <ReportPage report={reportData} setPage={setPage} />
      )}
    </div>
  );
}

function HomePage({ onEnter }: { onEnter: (p: Page) => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <GraduationCap size={56} color="#2196F3" />
          <h1 style={{ fontSize: 48, fontWeight: 800, background: 'linear-gradient(135deg, #2196F3, #FF5722)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            VocabTest
          </h1>
        </div>
        <p style={{ fontSize: 18, color: '#666', maxWidth: 560 }}>
          帮助小型英语学习机构管理学生词汇测试与进度跟踪的专业工具
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, width: '100%', maxWidth: 720 }}>
        <button
          onClick={() => onEnter('teacher')}
          className="card-enter"
          style={{
            padding: 32,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
            color: '#fff',
            textAlign: 'left',
            boxShadow: '0 8px 30px rgba(33,150,243,0.35)',
            animationDelay: '0ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03) translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(33,150,243,0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(33,150,243,0.35)';
          }}
        >
          <FileText size={48} style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>教师管理端</h2>
          <p style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.5 }}>创建词汇库、出卷测试、查看学生成绩与诊断报告</p>
        </button>
        <button
          onClick={() => onEnter('student-entry')}
          className="card-enter"
          style={{
            padding: 32,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #FF5722 0%, #E64A19 100%)',
            color: '#fff',
            textAlign: 'left',
            boxShadow: '0 8px 30px rgba(255,87,34,0.35)',
            animationDelay: '100ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03) translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,87,34,0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(255,87,34,0.35)';
          }}
        >
          <Target size={48} style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>学生考试端</h2>
          <p style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.5 }}>输入邀请码参加测试，获取个性化诊断报告</p>
        </button>
      </div>
    </div>
  );
}
