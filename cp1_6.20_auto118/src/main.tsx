import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentExam from './pages/StudentExam';

const LayoutSelect = () => (
  <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center mb-12"
    >
      <div
        className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center text-white text-4xl font-bold mb-6 shadow-xl"
        style={{ backgroundColor: '#1a237e' }}
      >
        智考
      </div>
      <h1 className="text-4xl font-bold text-[#1a237e] mb-3">智能考试题库系统</h1>
      <p className="text-gray-500 text-lg">专业题库管理 · 自适应模拟测试 · 数据驱动学习</p>
    </motion.div>

    <div className="grid md:grid-cols-2 gap-8 w-full max-w-3xl">
      <AnimatePresence>
        <motion.div
