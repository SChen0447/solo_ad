import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../data');

export interface Song {
  _id?: string;
  title: string;
  key: string;
  bpm: number;
  difficulty: number;
  parts: SongPart[];
  createdAt: number;
  updatedAt: number;
}

export interface SongPart {
  id: string;
  instrument: string;
  type: 'pdf' | 'tab';
  content: string;
  annotations: Annotation[];
}

export interface Annotation {
  id: string;
  partId: string;
  measure: number;
  text: string;
  author: string;
  color: string;
  createdAt: number;
}

export interface Rehearsal {
  _id?: string;
  title: string;
  date: number;
  duration: number;
  songs: RehearsalSong[];
  goals: string[];
  status: 'scheduled' | 'in_progress' | 'completed';
  currentSongIndex?: number;
  startTime?: number;
  songTimes?: { songId: string; duration: number }[];
  ratings?: { songId: string; score: number; feedback: string }[];
  createdAt: number;
}

export interface RehearsalSong {
  songId: string;
  targetProgress: number;
  actualProgress?: number;
}

export interface Member {
  _id?: string;
  name: string;
  instrument: string;
  avatar: string;
  attendance: { rehearsalId: string; present: boolean }[];
  practiceProgress: { songId: string; partId: string; status: 'green' | 'yellow' | 'red' }[];
}

class DataStore {
  private songs: Datastore;
  private rehearsals: Datastore;
  private members: Datastore;

  constructor() {
    this.songs = Datastore.create(path.join(dbPath, 'songs.db'));
    this.rehearsals = Datastore.create(path.join(dbPath, 'rehearsals.db'));
    this.members = Datastore.create(path.join(dbPath, 'members.db'));
  }

  async initMockData() {
    const songCount = await this.songs.count({});
    if (songCount === 0) {
      const mockSongs: Song[] = [
        {
          title: '夏日摇滚',
          key: 'G大调',
          bpm: 128,
          difficulty: 3,
          parts: [
            {
              id: 'part-1',
              instrument: '吉他',
              type: 'tab',
              content: `e|-----------------|-----------------|-----------------|-----------------|
B|-----------------|-----------------|-----------------|-----------------|
G|---4---4---4---4-|---5---5---5---5-|---6---6---6---6-|---5---5---5---5-|
D|-----------------|-----------------|-----------------|-----------------|
A|-----------------|-----------------|-----------------|-----------------|
E|-----------------|-----------------|-----------------|-----------------|`,
              annotations: [],
            },
            {
              id: 'part-2',
              instrument: '贝斯',
              type: 'tab',
              content: `G|-----------------|-----------------|-----------------|-----------------|
D|-----------------|-----------------|-----------------|-----------------|
A|---2---2---2---2-|---3---3---3---3-|---4---4---4---4-|---3---3---3---3-|
E|-----------------|-----------------|-----------------|-----------------|`,
              annotations: [],
            },
            {
              id: 'part-3',
              instrument: '鼓',
              type: 'tab',
              content: `C|x---x---x---x---|x---x---x---x---|x---x---x---x---|x---x---x---x---|
S|----o-------o---|----o-------o---|----o-------o---|----o-------o---|
K|o-------o-------|o-------o-------|o-------o-------|o-------o-------|`,
              annotations: [],
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          title: '午夜蓝调',
          key: 'E小调',
          bpm: 72,
          difficulty: 4,
          parts: [
            {
              id: 'part-1',
              instrument: '吉他',
              type: 'tab',
              content: `e|-----------------|-----------------|-----------------|-----------------|
B|---5---5---5---5-|---7---7---7---7-|---8---8---8---8-|---7---7---7---7-|
G|-----------------|-----------------|-----------------|-----------------|
D|-----------------|-----------------|-----------------|-----------------|
A|-----------------|-----------------|-----------------|-----------------|
E|-----------------|-----------------|-----------------|-----------------|`,
              annotations: [],
            },
            {
              id: 'part-2',
              instrument: '键盘',
              type: 'tab',
              content: `C|-----------------|-----------------|-----------------|-----------------|
E|--0---0---0---0--|--2---2---2---2--|--3---3---3---3--|--2---2---2---2--|
G|--0---0---0---0--|--0---0---0---0--|--0---0---0---0--|--0---0---0---0--|`,
              annotations: [],
            },
            {
              id: 'part-3',
              instrument: '主唱',
              type: 'tab',
              content: `♪ 在午夜的街头
♪ 我独自漫步
♪ 回忆如潮水
♪ 涌上心头`,
              annotations: [],
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          title: '疾风奔跑',
          key: 'A大调',
          bpm: 160,
          difficulty: 5,
          parts: [
            {
              id: 'part-1',
              instrument: '吉他',
              type: 'tab',
              content: `e|-----------------|-----------------|-----------------|-----------------|
B|-----------------|-----------------|-----------------|-----------------|
G|---6---6---6---6-|---7---7---7---7-|---9---9---9---9-|---7---7---7---7-|
D|-----------------|-----------------|-----------------|-----------------|
A|-----------------|-----------------|-----------------|-----------------|
E|-----------------|-----------------|-----------------|-----------------|`,
              annotations: [],
            },
            {
              id: 'part-2',
              instrument: '鼓',
              type: 'tab',
              content: `C|x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x-x-|
S|----o-------o---|----o-------o---|----o-------o---|----o-------o---|
K|o-o-o-o-o-o-o-o-|o-o-o-o-o-o-o-o-|o-o-o-o-o-o-o-o-|o-o-o-o-o-o-o-o-|`,
              annotations: [],
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      for (const song of mockSongs) {
        await this.songs.insert(song);
      }
    }

    const rehearsalCount = await this.rehearsals.count({});
    if (rehearsalCount === 0) {
      const songs = await this.songs.find({});
      const songIds = songs.map((s) => s._id);

      const mockRehearsals: Rehearsal[] = [
        {
          title: '周末排练 - 新歌准备',
          date: Date.now() + 86400000 * 2,
          duration: 120,
          songs: [
            { songId: songIds[0] || '', targetProgress: 80 },
            { songId: songIds[1] || '', targetProgress: 60 },
          ],
          goals: ['完成夏日摇滚的吉他solo', '统一午夜蓝调的节奏'],
          status: 'scheduled',
          createdAt: Date.now(),
        },
        {
          title: '演出前排练',
          date: Date.now() + 86400000 * 5,
          duration: 180,
          songs: [
            { songId: songIds[0] || '', targetProgress: 100 },
            { songId: songIds[1] || '', targetProgress: 100 },
            { songId: songIds[2] || '', targetProgress: 70 },
          ],
          goals: ['全曲合练', '检查整体音效平衡'],
          status: 'scheduled',
          createdAt: Date.now(),
        },
        {
          title: '上周排练回顾',
          date: Date.now() - 86400000 * 3,
          duration: 90,
          songs: [{ songId: songIds[0] || '', targetProgress: 70, actualProgress: 65 }],
          goals: ['熟悉基础旋律'],
          status: 'completed',
          songTimes: [{ songId: songIds[0] || '', duration: 45 }],
          ratings: [{ songId: songIds[0] || '', score: 75, feedback: '节奏还需加强' }],
          createdAt: Date.now() - 86400000 * 3,
        },
      ];

      for (const rehearsal of mockRehearsals) {
        await this.rehearsals.insert(rehearsal);
      }
    }

    const memberCount = await this.members.count({});
    if (memberCount === 0) {
      const mockMembers: Member[] = [
        {
          name: '小明',
          instrument: '吉他',
          avatar: '🎸',
          attendance: [],
          practiceProgress: [],
        },
      ];
      for (const member of mockMembers) {
        await this.members.insert(member);
      }
    }
  }

  async getAllSongs(): Promise<Song[]> {
    return this.songs.find({}).sort({ createdAt: -1 });
  }

  async getSongById(id: string): Promise<Song | null> {
    return this.songs.findOne({ _id: id });
  }

  async createSong(song: Omit<Song, '_id' | 'createdAt' | 'updatedAt'>): Promise<Song> {
    const now = Date.now();
    return this.songs.insert({ ...song, createdAt: now, updatedAt: now });
  }

  async updateSong(id: string, updates: Partial<Song>): Promise<Song | null> {
    await this.songs.update({ _id: id }, { $set: { ...updates, updatedAt: Date.now() } });
    return this.getSongById(id);
  }

  async deleteSong(id: string): Promise<boolean> {
    const numRemoved = await this.songs.remove({ _id: id });
    return numRemoved > 0;
  }

  async addAnnotation(songId: string, partId: string, annotation: Omit<Annotation, 'id' | 'createdAt'>): Promise<Annotation | null> {
    const song = await this.getSongById(songId);
    if (!song) return null;

    const newAnnotation: Annotation = {
      ...annotation,
      id: 'ann-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
    };

    const parts = song.parts.map((part) => {
      if (part.id === partId) {
        return { ...part, annotations: [...part.annotations, newAnnotation] };
      }
      return part;
    });

    await this.updateSong(songId, { parts, updatedAt: Date.now() });
    return newAnnotation;
  }

  async deleteAnnotation(songId: string, partId: string, annotationId: string): Promise<boolean> {
    const song = await this.getSongById(songId);
    if (!song) return false;

    const parts = song.parts.map((part) => {
      if (part.id === partId) {
        return { ...part, annotations: part.annotations.filter((a) => a.id !== annotationId) };
      }
      return part;
    });

    await this.updateSong(songId, { parts });
    return true;
  }

  async getAllRehearsals(): Promise<Rehearsal[]> {
    return this.rehearsals.find({}).sort({ date: 1 });
  }

  async getRehearsalById(id: string): Promise<Rehearsal | null> {
    return this.rehearsals.findOne({ _id: id });
  }

  async createRehearsal(rehearsal: Omit<Rehearsal, '_id' | 'createdAt'>): Promise<Rehearsal> {
    return this.rehearsals.insert({ ...rehearsal, createdAt: Date.now() });
  }

  async updateRehearsal(id: string, updates: Partial<Rehearsal>): Promise<Rehearsal | null> {
    await this.rehearsals.update({ _id: id }, { $set: updates });
    return this.getRehearsalById(id);
  }

  async deleteRehearsal(id: string): Promise<boolean> {
    const numRemoved = await this.rehearsals.remove({ _id: id });
    return numRemoved > 0;
  }

  async getMembers(): Promise<Member[]> {
    return this.members.find({});
  }

  async getMemberById(id: string): Promise<Member | null> {
    return this.members.findOne({ _id: id });
  }

  async updateMember(id: string, updates: Partial<Member>): Promise<Member | null> {
    await this.members.update({ _id: id }, { $set: updates });
    return this.getMemberById(id);
  }
}

export const dataStore = new DataStore();
