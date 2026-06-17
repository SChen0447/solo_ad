import axios from 'axios';
import type { ActivityStats, HistoryData, ReportData, EmotionLevel } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export async function createActivity(name: string, topic: string, expectedVoters: number = 100) {
  const res = await api.post('/activities', { name, topic, expected_voters: expectedVoters });
  return res.data as { activity_id: string; invite_code: string; topic: string; name: string };
}

export async function getActivity(activityId: string): Promise<ActivityStats> {
  const res = await api.get(`/activities/${activityId}`);
  return res.data as ActivityStats;
}

export async function getActivityByCode(inviteCode: string): Promise<ActivityStats> {
  const res = await api.get(`/activities/code/${inviteCode}`);
  return res.data as ActivityStats;
}

export async function submitVote(activityId: string, emotion: EmotionLevel): Promise<ActivityStats> {
  const res = await api.post('/vote', { activity_id: activityId, emotion });
  return res.data as ActivityStats;
}

export async function getStats(activityId: string): Promise<ActivityStats> {
  const res = await api.get(`/stats/${activityId}`);
  return res.data as ActivityStats;
}

export async function getHistory(activityId: string): Promise<HistoryData> {
  const res = await api.get(`/history/${activityId}`);
  return res.data as HistoryData;
}

export async function endActivity(activityId: string): Promise<{ status: string }> {
  const res = await api.post(`/activities/${activityId}/end`);
  return res.data;
}

export async function getReport(activityId: string): Promise<ReportData> {
  const res = await api.get(`/report/${activityId}`);
  return res.data as ReportData;
}
