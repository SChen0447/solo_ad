import React, { lazy, Suspense, useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import AddBookModal from './components/AddBookModal';
import LoadingSpinner from './components/LoadingSpinner';
import { Book } from './types';

const Home = lazy(() => import('./pages/Home'));
const BookList = lazy(() => import('./pages/BookList'));
const BookDetail = lazy(() => import('./pages/BookDetail'));

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  const handleAddBook = async (bookData: {
    title: string;
    author: string;
    coverUrl: string;
    totalPages: number;
    currentPage: number;
  }) => {
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookData)
      });
      if (!response.ok) {
        throw new Error('Failed to add book');
      }
      await response.json();
    } catch (error) {
      console.error('Error adding book:', error);
    }
  };

  const navItems = [
    { path: '/', label: '首页', icon: 'home' },
    { path: '/books', label: '书架', icon: 'book' }
  ];

  const renderIcon = (icon: string) => {
    const icons: { [key: string]: JSX.Element } = {
      home: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
      book: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
        </svg>
      )
    };
    return icons[icon] || null;
  };

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="sidebar-logo">墨迹书阁</div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {renderIcon(item.icon)}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="bottom-tab-bar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
          >
            {renderIcon(item.icon)}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <main className="main-content">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route
              path="/"
              element={<Home onAddBook={() => setIsModalOpen(true)} />}
            />
            <Route
              path="/books"
              element={<BookList onAddBook={() => setIsModalOpen(true)} />}
            />
            <Route path="/book/:id" element={<BookDetail />} />
          </Routes>
        </Suspense>
      </main>

      <AddBookModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddBook}
      />
    </div>
  );
};

export default App;
