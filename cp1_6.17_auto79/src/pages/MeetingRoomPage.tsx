import React, { useState, useEffect, useCallback } from 'react';
import { Card, Modal, Form, Input, InputNumber, Button, DatePicker, Select, message, Tooltip } from 'antd';
import { VideoCameraOutlined, AudioOutlined, FormOutlined, TeamOutlined, ClockCircleOutlined, BookOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { getRooms, createBooking, cancelBooking, Room, BookingForm } from '../services/api';

const { RangePicker } = DatePicker;

const facilityIcons: Record<string, React.ReactNode> = {
  projector: <Tooltip title="投影仪"><VideoCameraOutlined style={{ fontSize: 16 }} /></Tooltip>,
  whiteboard: <Tooltip title="白板"><FormOutlined style={{ fontSize: 16 }} /></Tooltip>,
  phone: <Tooltip title="电话"><AudioOutlined style={{ fontSize: 16 }} /></Tooltip>,
};

const statusColors: Record<string, { border: string; bg: string; label: string }> = {
  free: { border: '#4caf50', bg: '#e8f5e9', label: '空闲' },
  partial: { border: '#ff9800', bg: '#fff3e0', label: '部分繁忙' },
  busy: { border: '#f44336', bg: '#ffebee', label: '繁忙' },
};

const cardFadeInKeyframes = `
  @keyframes cardFadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ripple {
    0% { transform: scale(0); opacity: 0.6; }
    100% { transform: scale(4); opacity: 0; }
  }
`;

const MeetingRoomPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});

  const fetchRooms = useCallback(async () => {
    try {
      const res = await getRooms();
      setRooms(res.data);
    } catch {
      message.error('获取会议室列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    const timer = setInterval(() => {
      const newCountdowns: Record<string, string> = {};
      const now = dayjs();
      rooms.forEach((room) => {
        if (room.currentBooking?.endTime) {
          const end = dayjs(room.currentBooking.endTime);
          const diff = end.diff(now);
          if (diff > 0) {
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            newCountdowns[room.id] = `${hours}时${minutes}分${seconds}秒`;
          }
        }
      });
      setCountdowns(newCountdowns);
    }, 1000);
    return () => clearInterval(timer);
  }, [rooms]);

  const handleBookClick = (room: Room) => {
    if (room.status === 'busy') return;
    setSelectedRoom(room);
    form.resetFields();
    setModalOpen(true);
  };

  const handleCancelBooking = async (roomId: string, bookingId: string) => {
    try {
      await cancelBooking(bookingId);
      message.success('取消预订成功');
      fetchRooms();
    } catch {
      message.error('取消预订失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [start, end] = values.timeRange;

      if (start.isBefore(dayjs(), 'minute')) {
        message.error('开始时间不能早于当前时间');
        return;
      }
      if (end.isBefore(start) || end.isSame(start)) {
        message.error('结束时间必须晚于开始时间');
        return;
      }

      const data: BookingForm = {
        room_id: selectedRoom!.id,
        title: values.title,
        start_time: start.format('YYYY-MM-DD HH:mm'),
        end_time: end.format('YYYY-MM-DD HH:mm'),
        attendees: values.attendees,
        notes: values.notes || '',
      };

      setSubmitting(true);
      const res = await createBooking(data);
      if (res.status === 201) {
        message.success('预订成功！');
        setModalOpen(false);
        fetchRooms();
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        message.error('该时间段已被预订');
      } else if (!err?.errorFields) {
        message.error('预订失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const disabledStartTime = (current: Dayjs | null) => {
    if (!current) return false;
    return current.isBefore(dayjs(), 'day');
  };

  const generateTimeSlots = () => {
    const slots: { label: string; value: string }[] = [];
    for (let h = 8; h <= 20; h++) {
      for (let m = 0; m < 60; m += 15) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        slots.push({ label: time, value: time });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <>
      <style>{cardFadeInKeyframes}</style>
      <div style={{ padding: 24 }}>
        <h2 style={{ color: '#ffffff', marginBottom: 24, fontSize: 22, fontWeight: 600 }}>
          会议室预订
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          {rooms.map((room, idx) => {
            const sc = statusColors[room.status];
            return (
              <Card
                key={room.id}
                style={{
                  borderLeft: `4px solid ${sc.border}`,
                  backgroundColor: '#ffffff',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease-in-out',
                  animation: `cardFadeIn 0.4s ease-out ${idx * 0.06}s both`,
                  cursor: room.status === 'busy' ? 'default' : 'pointer',
                }}
                hoverable={room.status !== 'busy'}
                onClick={() => handleBookClick(room)}
                styles={{ body: { padding: 20 } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
                      {room.name}
                    </div>
                    <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>
                      {room.floor}楼 · 容纳{room.capacity}人
                    </div>
                  </div>
                  <span
                    style={{
                      background: sc.bg,
                      color: sc.border,
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                      transition: 'all 0.3s ease-in-out',
                    }}
                  >
                    {sc.label}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 12, color: '#666' }}>
                  {room.facilities.map((f) => (
                    <span key={f}>{facilityIcons[f] || f}</span>
                  ))}
                </div>

                {room.currentBooking && (
                  <div
                    style={{
                      background: '#f5f5f5',
                      borderRadius: 6,
                      padding: '8px 12px',
                      marginTop: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>
                      <BookOutlined style={{ marginRight: 6 }} />
                      {room.currentBooking.title}
                    </div>
                    {countdowns[room.id] && (
                      <div style={{ fontSize: 12, color: '#f44336', marginTop: 4 }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        剩余 {countdowns[room.id]}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <Button
                    type="primary"
                    size="small"
                    disabled={room.status === 'busy'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookClick(room);
                    }}
                    style={{
                      background: room.status === 'busy' ? '#d9d9d9' : '#1a1a2e',
                      borderColor: room.status === 'busy' ? '#d9d9d9' : '#1a1a2e',
                      transition: 'all 0.3s ease-in-out',
                    }}
                  >
                    预订
                  </Button>
                  {room.currentBooking && (
                    <Button
                      size="small"
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelBooking(room.id, (room.currentBooking as any)?.booking_id || '');
                      }}
                    >
                      取消预订
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Modal
        title={`预订 - ${selectedRoom?.name || ''}`}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="确认预订"
        cancelText="取消"
        width={520}
        styles={{ body: { padding: '20px 24px' } }}
      >
        <Form form={form} layout="vertical" size="middle">
          <Form.Item
            name="title"
            label="会议名称"
            rules={[{ required: true, message: '请输入会议名称' }]}
          >
            <Input placeholder="请输入会议名称" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="startTime"
              label="开始时间"
              rules={[{ required: true, message: '请选择开始时间' }]}
              style={{ flex: 1 }}
            >
              <DatePicker
                showTime={{ format: 'HH:mm', minuteStep: 15 }}
                format="YYYY-MM-DD HH:mm"
                disabledDate={disabledStartTime}
                placeholder="选择开始时间"
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              name="endTime"
              label="结束时间"
              rules={[{ required: true, message: '请选择结束时间' }]}
              style={{ flex: 1 }}
            >
              <DatePicker
                showTime={{ format: 'HH:mm', minuteStep: 15 }}
                format="YYYY-MM-DD HH:mm"
                disabledDate={disabledStartTime}
                placeholder="选择结束时间"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="attendees"
            label="参会人数"
            rules={[{ required: true, message: '请输入参会人数' }]}
          >
            <InputNumber
              min={1}
              max={selectedRoom?.capacity || 50}
              placeholder="请输入人数"
              style={{ width: '100%' }}
              prefix={<TeamOutlined />}
            />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default MeetingRoomPage;
