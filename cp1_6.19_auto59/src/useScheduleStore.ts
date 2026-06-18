import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  addDays,
  startOfDay,
  format,
  isWithinInterval,
  parseISO,
  addMinutes,
} from 'date-fns';

export interface TimeSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface Member {
  id: string;
  name: string;
  timezone: string;
  availability: TimeSlot[];
  order: number;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  attendees: string[];
}

export interface Suggestion {
  startTime: string;
  endTime: string;
  attendeeCount: number;
  attendees: string[];
}

interface ScheduleState {
  members: Member[];
  meetings: Meeting[];
  suggestions: Suggestion[];
  isLoading: boolean;
  addMember: (member: Omit<Member, 'id' | 'order'>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  reorderMembers: (memberIds: string[]) => Promise<void>;
  addMeeting: (meeting: Omit<Meeting, 'id'>) => Promise<void>;
  deleteMeeting: (id: string) => void;
  fetchSuggestions: (days?: number) => Promise<void>;
  fetchData: () => Promise<void>;
  getAvailableMembersForSlot: (date: Date, hour: number, minute: number) => Member[];
  isSlotAllAvailable: (date: Date, hour: number, minute: number, duration?: number) => boolean;
  getMeetingsForSlot: (date: Date, hour: number, minute: number) => Meeting[];
  getCommonFreeSlots: () => { start: Date; end: Date; members: Member[] }[];
  exportToICS: () => string;
}

const API_BASE = '/api/schedule';

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  members: [],
  meetings: [],
  suggestions: [],
  isLoading: false,

  fetchData: async () => {
    try {
      set({ isLoading: true });
      const res = await fetch(API_BASE);
      const data = await res.json();
      set({
        members: data.members || [],
        meetings: data.meetings || [],
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      set({ isLoading: false });
    }
  },

  addMember: async (memberData) => {
    try {
      const res = await fetch(`${API_BASE}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
      });
      const newMember = await res.json();
      set((state) => ({ members: [...state.members, newMember] }));
    } catch (error) {
      const localMember: Member = {
        ...memberData,
        id: uuidv4(),
        order: get().members.length,
      };
      set((state) => ({ members: [...state.members, localMember] }));
    }
  },

  deleteMember: async (id) => {
    try {
      await fetch(`${API_BASE}/members/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete member:', error);
    }
    set((state) => ({
      members: state.members.filter((m) => m.id !== id),
    }));
  },

  reorderMembers: async (memberIds) => {
    try {
      await fetch(`${API_BASE}/members/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: memberIds }),
      });
    } catch (error) {
      console.error('Failed to reorder members:', error);
    }
    set((state) => {
      const reordered = memberIds
        .map((id) => state.members.find((m) => m.id === id))
        .filter((m): m is Member => !!m)
        .map((m, idx) => ({ ...m, order: idx }));
      return { members: reordered };
    });
  },

  addMeeting: async (meetingData) => {
    try {
      const res = await fetch(`${API_BASE}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData),
      });
      const newMeeting = await res.json();
      set((state) => ({ meetings: [...state.meetings, newMeeting] }));
    } catch (error) {
      const localMeeting: Meeting = {
        ...meetingData,
        id: uuidv4(),
      };
      set((state) => ({ meetings: [...state.meetings, localMeeting] }));
    }
  },

  deleteMeeting: (id) => {
    set((state) => ({
      meetings: state.meetings.filter((m) => m.id !== id),
    }));
  },

  fetchSuggestions: async (days = 7) => {
    try {
      set({ isLoading: true });
      const res = await fetch(`${API_BASE}/suggestions?days=${days}`);
      const suggestions = await res.json();
      set({ suggestions, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      set({ isLoading: false });
    }
  },

  getAvailableMembersForSlot: (date, hour, minute) => {
    const { members, meetings } = get();
    const dayOfWeek = date.getDay();
    const currentMinutes = hour * 60 + minute;
    const slotStart = new Date(date);
    slotStart.setHours(hour, minute, 0, 0);
    const slotEnd = addMinutes(slotStart, 30);

    return members.filter((member) => {
      const isAvailable = member.availability.some((slot) => {
        if (slot.dayOfWeek !== dayOfWeek) return false;
        const [startH, startM] = slot.startTime.split(':').map(Number);
        const [endH, endM] = slot.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        return currentMinutes >= startMinutes && currentMinutes < endMinutes - 29;
      });

      const hasConflict = meetings.some((meeting) => {
        if (!meeting.attendees.includes(member.id)) return false;
        const mStart = parseISO(meeting.startTime);
        const mEnd = parseISO(meeting.endTime);
        return (
          isWithinInterval(slotStart, { start: mStart, end: mEnd }) ||
          isWithinInterval(slotEnd, { start: mStart, end: mEnd }) ||
          isWithinInterval(mStart, { start: slotStart, end: slotEnd })
        );
      });

      return isAvailable && !hasConflict;
    });
  },

  isSlotAllAvailable: (date, hour, minute, duration = 30) => {
    const { members, meetings } = get();
    if (members.length === 0) return false;

    const slotStart = new Date(date);
    slotStart.setHours(hour, minute, 0, 0);
    const slotEnd = addMinutes(slotStart, duration);
    const dayOfWeek = date.getDay();

    for (const member of members) {
      const startMinutes = hour * 60 + minute;
      const endMinutes = startMinutes + duration;

      const isAvailable = member.availability.some((slot) => {
        if (slot.dayOfWeek !== dayOfWeek) return false;
        const [sH, sM] = slot.startTime.split(':').map(Number);
        const [eH, eM] = slot.endTime.split(':').map(Number);
        const sMin = sH * 60 + sM;
        const eMin = eH * 60 + eM;
        return startMinutes >= sMin && endMinutes <= eMin;
      });

      if (!isAvailable) return false;

      const hasConflict = meetings.some((meeting) => {
        if (!meeting.attendees.includes(member.id)) return false;
        const mStart = parseISO(meeting.startTime);
        const mEnd = parseISO(meeting.endTime);
        return (
          isWithinInterval(slotStart, { start: mStart, end: mEnd }) ||
          isWithinInterval(slotEnd, { start: mStart, end: mEnd }) ||
          (slotStart <= mStart && slotEnd >= mEnd)
        );
      });

      if (hasConflict) return false;
    }

    return true;
  },

  getMeetingsForSlot: (date, hour, minute) => {
    const { meetings } = get();
    const slotStart = new Date(date);
    slotStart.setHours(hour, minute, 0, 0);
    const slotEnd = addMinutes(slotStart, 30);

    return meetings.filter((meeting) => {
      const mStart = parseISO(meeting.startTime);
      const mEnd = parseISO(meeting.endTime);
      return (
        isWithinInterval(slotStart, { start: mStart, end: mEnd }) ||
        isWithinInterval(slotEnd, { start: mStart, end: mEnd }) ||
        isWithinInterval(mStart, { start: slotStart, end: slotEnd })
      );
    });
  },

  getCommonFreeSlots: () => {
    const { members } = get();
    if (members.length === 0) return [];

    const results: { start: Date; end: Date; members: Member[] }[] = [];
    const today = startOfDay(new Date());

    for (let day = 0; day < 7; day++) {
      const currentDate = addDays(today, day);

      for (let hour = 8; hour < 20; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const availableMembers = get().getAvailableMembersForSlot(
            currentDate,
            hour,
            minute
          );
          if (availableMembers.length === members.length && members.length > 0) {
            const start = new Date(currentDate);
            start.setHours(hour, minute, 0, 0);
            results.push({
              start,
              end: addMinutes(start, 30),
              members: availableMembers,
            });
          }
        }
      }
    }

    return results;
  },

  exportToICS: () => {
    const { meetings, members } = get();
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Meeting Scheduler//EN\n';

    meetings.forEach((meeting) => {
      const formatDate = (dateStr: string) => {
        const d = parseISO(dateStr);
        return format(d, "yyyyMMdd'T'HHmmss'Z'");
      };
      const attendeeNames = meeting.attendees
        .map((id) => members.find((m) => m.id === id)?.name || '')
        .filter(Boolean)
        .join(', ');

      ics += 'BEGIN:VEVENT\n';
      ics += `UID:${meeting.id}@meetingscheduler\n`;
      ics += `DTSTAMP:${formatDate(new Date().toISOString())}\n`;
      ics += `DTSTART:${formatDate(meeting.startTime)}\n`;
      ics += `DTEND:${formatDate(meeting.endTime)}\n`;
      ics += `SUMMARY:${meeting.title}\n`;
      if (meeting.description) {
        ics += `DESCRIPTION:${meeting.description}\\n与会人员: ${attendeeNames}\n`;
      }
      ics += 'END:VEVENT\n';
    });

    ics += 'END:VCALENDAR';
    return ics;
  },
}));
