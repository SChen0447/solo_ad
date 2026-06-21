import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import ServiceCard from './components/ServiceCard';
import PetCard from './components/PetCard';
import type {
  Service,
  Customer,
  Appointment,
} from './types';
import { api, getServiceColor, getTimeSlots } from './utils/storage';
import './styles/App.css';

type Page = 'dashboard' | 'calendar' | 'services' | 'customers';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [conflictError, setConflictError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [servicesData, customersData, appointmentsData] = await Promise.all([
        api.getServices(),
        api.getCustomers(),
        api.getAppointments(),
      ]);
      setServices(servicesData);
      setCustomers(customersData);
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('加载数据失败:', error);
      showToast('error', '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getPendingCount = (serviceId: string): number => {
    return appointments.filter(
      (a) => a.serviceId === serviceId && a.status === 'pending'
    ).length;
  };

  const getFutureDates = (days: number): string[] => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      dates.push(format(addDays(today, i), 'yyyy-MM-dd'));
    }
    return dates;
  };

  const getAvailableTimes = (): string[] => {
    const timeSlots = getTimeSlots(9, 19, 30);
    const dayAppointments = appointments.filter(
      (a) => a.date === selectedDate && a.status !== 'cancelled'
    );

    return timeSlots.filter((slot) => {
      const service = services.find((s) => s.id === selectedService);
      if (!service) return true;

      const [slotHour, slotMin] = slot.split(':').map(Number);
      const slotStart = slotHour * 60 + slotMin;
      const slotEnd = slotStart + service.duration;

      for (const apt of dayAppointments) {
        if (apt.id === '') continue;
        const aptService = services.find((s) => s.id === apt.serviceId);
        if (!aptService) continue;
        const [aptHour, aptMin] = apt.startTime.split(':').map(Number);
        const aptStart = aptHour * 60 + aptMin;
        const aptEnd = aptStart + aptService.duration;

        if (slotStart < aptEnd && slotEnd > aptStart) {
          return false;
        }
      }
      return true;
    });
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCustomer(e.target.value);
    setSelectedPet('');
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedService(e.target.value);
    setConflictError('');
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTime(e.target.value);
    setConflictError('');
  };

  const handleSubmitAppointment = async () => {
    if (!selectedCustomer || !selectedPet || !selectedService || !selectedTime) {
      showToast('error', '请填写完整信息');
      return;
    }

    setSubmitting(true);
    try {
      const newAppointment = await api.createAppointment({
        customerId: selectedCustomer,
        petId: selectedPet,
        serviceId: selectedService,
        date: selectedDate,
        startTime: selectedTime,
      });
      setAppointments((prev) => [...prev, newAppointment]);
      setShowAppointmentModal(false);
      showToast('success', '预约创建成功！');
      resetForm();
    } catch (error: any) {
      if (error.message === '时间冲突') {
        setConflictError('所选时间与已有预约冲突，请选择其他时间');
      } else {
        showToast('error', error.message || '创建预约失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setSelectedPet('');
    setSelectedService('');
    setSelectedTime('');
    setConflictError('');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const openAppointmentModal = () => {
    resetForm();
    setShowAppointmentModal(true);
  };

  const selectedCustomerData = customers.find((c) => c.id === selectedCustomer);
  const selectedServiceData = services.find((s) => s.id === selectedService);
  const futureDates = getFutureDates(7);
  const availableTimes = getAvailableTimes();

  const navItems = [
    { key: 'dashboard', label: '首页', icon: '🏠' },
    { key: 'calendar', label: '排班日历', icon: '📅' },
    { key: 'services', label: '服务项目', icon: '✂️' },
    { key: 'customers', label: '客户档案', icon: '👥' },
  ];

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="app-logo">
            <span className="logo-icon">🐾</span>
            <h1 className="app-title">宠物美容店管理系统</h1>
          </div>
          <nav className="app-nav">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${currentPage === item.key ? 'active' : ''}`}
                onClick={() => setCurrentPage(item.key as Page)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main container">
        {currentPage === 'dashboard' && (
          <div className="page-content">
            <Dashboard />
            <div className="dashboard-calendar-section">
              <h2 className="section-title">今日预约</h2>
              <Calendar
                appointments={appointments}
                services={services}
                customers={customers}
                onAddAppointment={openAppointmentModal}
              />
            </div>
          </div>
        )}

        {currentPage === 'calendar' && (
          <div className="page-content">
            <Calendar
              appointments={appointments}
              services={services}
              customers={customers}
              onAddAppointment={openAppointmentModal}
            />
          </div>
        )}

        {currentPage === 'services' && (
          <div className="page-content">
            <div className="page-header">
              <h2 className="page-title">服务项目管理</h2>
              <button className="btn-primary" onClick={openAppointmentModal}>
                + 新增服务
              </button>
            </div>
            <div className="services-grid">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  pendingCount={getPendingCount(service.id)}
                />
              ))}
            </div>
          </div>
        )}

        {currentPage === 'customers' && (
          <div className="page-content">
            <div className="page-header">
              <h2 className="page-title">客户档案</h2>
              <button className="btn-primary">+ 新增客户</button>
            </div>
            <div className="customers-list">
              {customers.map((customer) => (
                <div key={customer.id} className="customer-card card">
                  <div className="customer-header">
                    <div className="customer-info">
                      <h3 className="customer-name">{customer.name}</h3>
                      <p className="customer-phone">📞 {customer.phone}</p>
                    </div>
                    <div className="customer-pet-count">
                      <span className="pet-count-badge">{customer.pets.length}</span>
                      <span className="pet-count-label">只宠物</span>
                    </div>
                  </div>
                  <div className="pets-scroll-container">
                    <div className="pets-scroll">
                      {customer.pets.map((pet) => (
                        <PetCard key={pet.id} pet={pet} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showAppointmentModal && (
        <div className="modal-overlay" onClick={() => setShowAppointmentModal(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新增预约</h3>
              <button
                className="modal-close"
                onClick={() => setShowAppointmentModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>选择日期</label>
                <select
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                    setConflictError('');
                  }}
                >
                  {futureDates.map((date) => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>选择时间</label>
                <select
                  value={selectedTime}
                  onChange={handleTimeChange}
                  className={conflictError ? 'error' : ''}
                >
                  <option value="">请选择时间</option>
                  {availableTimes.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                {availableTimes.length === 0 && (
                  <p className="form-hint">该日期暂无可用时段</p>
                )}
              </div>

              <div className="form-group">
                <label>选择客户</label>
                <select value={selectedCustomer} onChange={handleCustomerChange}>
                  <option value="">请选择客户</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomerData && (
                <div className="form-group">
                  <label>选择宠物</label>
                  <select
                    value={selectedPet}
                    onChange={(e) => setSelectedPet(e.target.value)}
                  >
                    <option value="">请选择宠物</option>
                    {selectedCustomerData.pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.breed})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>选择服务</label>
                <select value={selectedService} onChange={handleServiceChange}>
                  <option value="">请选择服务</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - ¥{service.price} ({service.duration}分钟)
                    </option>
                  ))}
                </select>
              </div>

              {conflictError && (
                <div className="alert alert-error">
                  <span className="alert-icon">⚠️</span>
                  {conflictError}
                </div>
              )}

              {selectedServiceData && selectedTime && (
                <div className="appointment-preview">
                  <div className="preview-label">预约预览</div>
                  <div
                    className="preview-bar"
                    style={{
                      backgroundColor: getServiceColor(selectedServiceData.category),
                    }}
                  >
                    <span>{selectedTime}</span>
                    <span>{selectedServiceData.name}</span>
                    <span>{selectedServiceData.duration}分钟</span>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-outline"
                onClick={() => setShowAppointmentModal(false)}
              >
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmitAppointment}
                disabled={submitting}
              >
                {submitting ? '提交中...' : '确认预约'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
