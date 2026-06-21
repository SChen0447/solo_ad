import { v4 as uuidv4 } from 'uuid';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre: '流行' | '摇滚' | '古典';
  ratings: number[];
  coverColor: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  songIds: string[];
  coverColor: string;
}

export interface Comment {
  id: string;
  songId: string;
  username: string;
  content: string;
  timestamp: number;
  avatarColor: string;
}

const randomColor = (): string => {
  const colors = ['#667eea', '#764ba2', '#f6ad55', '#48bb78', '#ed64a6', '#4299e1', '#9f7aea', '#38b2ac', '#e53e3e', '#dd6b20'];
  return colors[Math.floor(Math.random() * colors.length)];
};

let songs: Song[] = [
  { id: 's1', title: '夜曲', artist: '周杰伦', album: '十一月的萧邦', duration: 234, genre: '流行', ratings: [5, 4, 5, 4, 5], coverColor: '#667eea' },
  { id: 's2', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', duration: 354, genre: '摇滚', ratings: [5, 5, 5, 4, 5], coverColor: '#764ba2' },
  { id: 's3', title: '月光奏鸣曲', artist: '贝多芬', album: '钢琴奏鸣曲集', duration: 420, genre: '古典', ratings: [5, 5, 4, 5], coverColor: '#4299e1' },
  { id: 's4', title: '稻香', artist: '周杰伦', album: '魔杰座', duration: 223, genre: '流行', ratings: [4, 3, 4, 5], coverColor: '#48bb78' },
  { id: 's5', title: 'Hotel California', artist: 'Eagles', album: 'Hotel California', duration: 391, genre: '摇滚', ratings: [5, 5, 5, 5, 4], coverColor: '#dd6b20' },
  { id: 's6', title: '四季·春', artist: '维瓦尔第', album: '四季', duration: 310, genre: '古典', ratings: [4, 5, 4], coverColor: '#38b2ac' },
  { id: 's7', title: '光年之外', artist: '邓紫棋', album: '光年之外', duration: 258, genre: '流行', ratings: [4, 4, 3, 5], coverColor: '#ed64a6' },
  { id: 's8', title: 'Stairway to Heaven', artist: 'Led Zeppelin', album: 'Led Zeppelin IV', duration: 482, genre: '摇滚', ratings: [5, 5, 4, 5, 5], coverColor: '#9f7aea' },
  { id: 's9', title: '卡农', artist: '帕赫贝尔', album: '卡农与吉格', duration: 336, genre: '古典', ratings: [5, 4, 5, 4, 5], coverColor: '#e53e3e' },
  { id: 's10', title: '晴天', artist: '周杰伦', album: '叶惠美', duration: 269, genre: '流行', ratings: [5, 5, 5, 4, 5], coverColor: '#f6ad55' },
  { id: 's11', title: 'Smells Like Teen Spirit', artist: 'Nirvana', album: 'Nevermind', duration: 301, genre: '摇滚', ratings: [4, 5, 5, 4], coverColor: '#667eea' },
  { id: 's12', title: '蓝色多瑙河', artist: '施特劳斯', album: '圆舞曲集', duration: 630, genre: '古典', ratings: [4, 4, 5, 3], coverColor: '#4299e1' },
];

let playlists: Playlist[] = [
  { id: 'p1', name: '深夜摇滚', description: '最适合深夜聆听的经典摇滚', songIds: ['s2', 's5', 's8', 's11'], coverColor: '#764ba2' },
  { id: 'p2', name: '古典精选', description: '跨越时空的古典乐章', songIds: ['s3', 's6', 's9', 's12'], coverColor: '#4299e1' },
  { id: 'p3', name: '华语流行', description: '经典华语流行歌曲', songIds: ['s1', 's4', 's7', 's10'], coverColor: '#667eea' },
];

let comments: Comment[] = [
  { id: 'c1', songId: 's1', username: '乐迷小明', content: '这首歌真的百听不厌，每次听都有新的感受！', timestamp: Date.now() - 3600000, avatarColor: '#667eea' },
  { id: 'c2', songId: 's1', username: '音乐达人', content: '编曲太棒了，尤其是前奏部分。', timestamp: Date.now() - 7200000, avatarColor: '#f6ad55' },
  { id: 'c3', songId: 's2', username: '摇滚老炮', content: 'Queen永远的神！这首曲子完美诠释了什么是摇滚。', timestamp: Date.now() - 1800000, avatarColor: '#764ba2' },
  { id: 'c4', songId: 's3', username: '古典爱好者', content: '月光下的旋律，让人沉醉。', timestamp: Date.now() - 86400000, avatarColor: '#4299e1' },
  { id: 'c5', songId: 's5', username: '旅行者', content: '每次开车长途必听的一首！', timestamp: Date.now() - 43200000, avatarColor: '#48bb78' },
  { id: 'c6', songId: 's10', username: '晴天粉丝', content: '青春的回忆啊，听到就想起学生时代。', timestamp: Date.now() - 600000, avatarColor: '#ed64a6' },
];

export function getAllSongs(): Song[] {
  return songs;
}

export function getSongById(id: string): Song | undefined {
  return songs.find(s => s.id === id);
}

export function createSong(data: Omit<Song, 'id' | 'ratings' | 'coverColor'>): Song {
  const song: Song = {
    ...data,
    id: uuidv4(),
    ratings: [],
    coverColor: randomColor(),
  };
  songs.push(song);
  return song;
}

export function rateSong(songId: string, rating: number): Song | null {
  const song = songs.find(s => s.id === songId);
  if (!song) return null;
  song.ratings.push(rating);
  return song;
}

export function getAverageRating(songId: string): number {
  const song = songs.find(s => s.id === songId);
  if (!song || song.ratings.length === 0) return 0;
  return song.ratings.reduce((a, b) => a + b, 0) / song.ratings.length;
}

export function getAllPlaylists(): Playlist[] {
  return playlists;
}

export function getPlaylistById(id: string): Playlist | undefined {
  return playlists.find(p => p.id === id);
}

export function createPlaylist(data: { name: string; description: string; songIds: string[] }): Playlist {
  const playlist: Playlist = {
    id: uuidv4(),
    name: data.name,
    description: data.description,
    songIds: data.songIds,
    coverColor: randomColor(),
  };
  playlists.push(playlist);
  return playlist;
}

export function updatePlaylistSongOrder(playlistId: string, songIds: string[]): Playlist | null {
  const playlist = playlists.find(p => p.id === playlistId);
  if (!playlist) return null;
  playlist.songIds = songIds;
  return playlist;
}

export function deletePlaylist(id: string): boolean {
  const index = playlists.findIndex(p => p.id === id);
  if (index === -1) return false;
  playlists.splice(index, 1);
  return true;
}

export function getCommentsBySongId(songId: string): Comment[] {
  return comments.filter(c => c.songId === songId).sort((a, b) => b.timestamp - a.timestamp);
}

export function addComment(data: { songId: string; username: string; content: string }): Comment {
  const comment: Comment = {
    id: uuidv4(),
    songId: data.songId,
    username: data.username,
    content: data.content,
    timestamp: Date.now(),
    avatarColor: randomColor(),
  };
  comments.push(comment);
  return comment;
}

export function searchSongs(query: string): Song[] {
  const q = query.toLowerCase();
  return songs.filter(
    s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.album.toLowerCase().includes(q)
  );
}
