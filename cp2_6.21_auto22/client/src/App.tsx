import React, { useState, useEffect, useCallback } from 'react';
import type { GreenEvent, Tree, Volunteer, AppNotification, Stats } from './types';
import { CURRENT_USER_ID } from './types';
import { DataService } from './services/DataService';
import NavigationBar from './components/NavigationBar';
import EventCard from './components/EventCard';
import EventModal from './components/EventModal';
import TreeMap from './components/TreeMap';
import TreeDetail from './components/TreeDetail';
import VolunteerProfile from './components/VolunteerProfile';
import StatisticsDashboard from './components/StatisticsDashboard';

type Page = 'home' | 'trees' | 'profile' | 'stats' | 'treeDetail';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [events, setEvents] = useState<GreenEvent[]>([]);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<GreenEvent | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsData, treesData, volunteersData, notificationsData, statsData] = await Promise.all([
        DataService.getEvents(),
        DataService.getTrees(),
        DataService.getVolunteers(),
        DataService.getNotifications(),
        DataService.getStats(),
      ]);
      setEvents(eventsData);
      setTrees(treesData);
      setVolunteers(volunteersData);
      setNotifications(notificationsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleEventClick = (event: GreenEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  const handleRegister = async () => {
    if (!selectedEvent) return;
    try {
      const updated = await DataService.registerForEvent(selectedEvent.id, CURRENT_USER_ID);
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
      setSelectedEvent(updated);
      const [vData, sData] = await Promise.all([
        DataService.getVolunteers(),
        DataService.getStats(),
      ]);
      setVolunteers(vData);
      setStats(sData);
    } catch (err: any) {
      alert(err.response?.data?.error || '报名失败');
    }
  };

  const handleTreeClick = (treeId: string) => {
    setSelectedTreeId(treeId);
    setCurrentPage('treeDetail');
  };

  const handleClaimTree = async (treeId: string) => {
    const currentUser = volunteers.find(v => v.id === CURRENT_USER_ID);
    if (!currentUser) return;
    try {
      const updated = await DataService.claimTree(treeId, CURRENT_USER_ID, currentUser.name);
      setTrees(prev => prev.map(t => t.id === updated.id ? updated : t));
      const [vData, sData] = await Promise.all([
        DataService.getVolunteers(),
        DataService.getStats(),
      ]);
      setVolunteers(vData);
      setStats(sData);
    } catch (err: any) {
      alert(err.response?.data?.error || '认领失败');
    }
  };

  const handleAddRecord = async (treeId: string, record: { date: string; height: number; description: string; photoUrl: string }) => {
    try {
      await DataService.addGrowthRecord(treeId, record);
      const treesData = await DataService.getTrees();
      setTrees(treesData);
    } catch (err: any) {
      alert(err.response?.data?.error || '添加失败');
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      const updated = await DataService.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? updated : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    if (page !== 'treeDetail') {
      setSelectedTreeId(null);
    }
  };

  const currentUser = volunteers.find(v => v.id === CURRENT_USER_ID);
  const selectedTree = selectedTreeId ? trees.find(t => t.id === selectedTreeId) : null;

  const renderPage = () => {
    if (loading) {
      return <div className="loading">加载中...</div>;
    }

    switch (currentPage) {
      case 'home':
        return (
          <div className="page">
            <h1 className="page-title">绿化活动</h1>
            <div className="events-grid">
              {events.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  delay={index * 0.1}
                  onClick={() => handleEventClick(event)}
                />
              ))}
            </div>
          </div>
        );
      case 'trees':
        return (
          <div className="page">
            <h1 className="page-title">树木认养地图</h1>
            <p style={{ color: '#666', marginBottom: 16 }}>拖拽移动地图，滚轮缩放，点击树木查看详情或认养</p>
            <TreeMap
              trees={trees}
              onTreeClick={handleTreeClick}
              onTreeClaim={handleClaimTree}
              currentUserId={CURRENT_USER_ID}
            />
          </div>
        );
      case 'profile':
        return currentUser ? (
          <VolunteerProfile
            volunteer={currentUser}
            events={events.filter(e => currentUser.eventIds.includes(e.id))}
            trees={trees.filter(t => currentUser.treeIds.includes(t.id))}
            allVolunteers={volunteers}
            onTreeClick={handleTreeClick}
          />
        ) : <div className="loading">加载中...</div>;
      case 'stats':
        return stats ? <StatisticsDashboard stats={stats} volunteers={volunteers} /> : <div className="loading">加载中...</div>;
      case 'treeDetail':
        return selectedTree ? (
          <TreeDetail
            tree={selectedTree}
            onBack={() => navigateTo('trees')}
            onClaim={() => handleClaimTree(selectedTree.id)}
            onAddRecord={(record) => handleAddRecord(selectedTree.id, record)}
            currentUserId={CURRENT_USER_ID}
          />
        ) : <div className="loading">加载中...</div>;
      default:
        return null;
    }
  };

  return (
    <>
      <NavigationBar
        currentPage={currentPage}
        onNavigate={navigateTo}
        notifications={notifications}
        onNotificationClick={handleMarkNotificationRead}
      />
      {renderPage()}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={handleCloseModal}
          onRegister={handleRegister}
          isRegistered={selectedEvent.participantIds.includes(CURRENT_USER_ID)}
          currentUserId={CURRENT_USER_ID}
        />
      )}
    </>
  );
};

export default App;
