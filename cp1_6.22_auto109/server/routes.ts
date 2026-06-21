import { Router, Request, Response } from 'express';
import {
  getAllSongs,
  getSongById,
  createSong,
  rateSong,
  getAverageRating,
  getAllPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylistSongOrder,
  deletePlaylist,
  getCommentsBySongId,
  addComment,
  searchSongs,
} from './db.js';

const router = Router();

router.get('/songs', (_req: Request, res: Response) => {
  const songs = getAllSongs();
  const result = songs.map(s => ({
    ...s,
    averageRating: getAverageRating(s.id),
  }));
  res.json(result);
});

router.get('/songs/:id', (req: Request, res: Response) => {
  const song = getSongById(req.params.id);
  if (!song) {
    res.status(404).json({ error: 'Song not found' });
    return;
  }
  res.json({ ...song, averageRating: getAverageRating(song.id) });
});

router.post('/songs', (req: Request, res: Response) => {
  const song = createSong(req.body);
  res.status(201).json(song);
});

router.post('/songs/:id/rate', (req: Request, res: Response) => {
  const { rating } = req.body;
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Rating must be between 1 and 5' });
    return;
  }
  const song = rateSong(req.params.id, rating);
  if (!song) {
    res.status(404).json({ error: 'Song not found' });
    return;
  }
  res.json({ ...song, averageRating: getAverageRating(song.id) });
});

router.get('/songs/search', (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q) {
    res.json([]);
    return;
  }
  const results = searchSongs(q).map(s => ({
    ...s,
    averageRating: getAverageRating(s.id),
  }));
  res.json(results);
});

router.get('/playlists', (_req: Request, res: Response) => {
  const playlists = getAllPlaylists();
  const result = playlists.map(p => {
    const pSongs = p.songIds.map(id => getSongById(id)).filter(Boolean);
    const totalDuration = pSongs.reduce((sum, s) => sum + (s?.duration || 0), 0);
    return { ...p, songCount: p.songIds.length, totalDuration };
  });
  res.json(result);
});

router.get('/playlists/:id', (req: Request, res: Response) => {
  const playlist = getPlaylistById(req.params.id);
  if (!playlist) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }
  const pSongs = playlist.songIds.map(id => {
    const s = getSongById(id);
    return s ? { ...s, averageRating: getAverageRating(s.id) } : null;
  }).filter(Boolean);
  const totalDuration = pSongs.reduce((sum: number, s: any) => sum + (s?.duration || 0), 0);
  const avgRating = pSongs.length > 0
    ? pSongs.reduce((sum: number, s: any) => sum + (s?.averageRating || 0), 0) / pSongs.length
    : 0;
  res.json({ ...playlist, songs: pSongs, totalDuration, averageRating: avgRating });
});

router.post('/playlists', (req: Request, res: Response) => {
  const { name, description, songIds } = req.body;
  if (!name || name.length > 20) {
    res.status(400).json({ error: 'Playlist name is required and must be ≤20 characters' });
    return;
  }
  const playlist = createPlaylist({ name, description: description || '', songIds: songIds || [] });
  res.status(201).json(playlist);
});

router.put('/playlists/:id/reorder', (req: Request, res: Response) => {
  const { songIds } = req.body;
  if (!Array.isArray(songIds)) {
    res.status(400).json({ error: 'songIds must be an array' });
    return;
  }
  const playlist = updatePlaylistSongOrder(req.params.id, songIds);
  if (!playlist) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }
  res.json(playlist);
});

router.delete('/playlists/:id', (req: Request, res: Response) => {
  const success = deletePlaylist(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Playlist not found' });
    return;
  }
  res.json({ success: true });
});

router.get('/comments/:songId', (req: Request, res: Response) => {
  const songComments = getCommentsBySongId(req.params.songId);
  res.json(songComments);
});

router.post('/comments', (req: Request, res: Response) => {
  const { songId, username, content } = req.body;
  if (!songId || !username || !content) {
    res.status(400).json({ error: 'songId, username, and content are required' });
    return;
  }
  const comment = addComment({ songId, username, content });
  res.status(201).json(comment);
});

export default router;
