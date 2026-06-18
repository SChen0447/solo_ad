import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, '../uploads');
const coversDir = path.join(uploadsDir, 'covers');
const audioDir = path.join(uploadsDir, 'audio');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

interface Track {
  id: string;
  name: string;
  artist: string;
  albumId?: string;
  duration: string;
  lyrics: string;
  coverUrl: string;
  audioUrl: string;
  isPublished: boolean;
  createdAt: string;
}

interface Album {
  id: string;
  name: string;
  releaseDate: string;
  coverUrl: string;
  trackIds: string[];
  isPublished: boolean;
  createdAt: string;
}

const tracksFile = path.join(dataDir, 'tracks.json');
const albumsFile = path.join(dataDir, 'albums.json');

const readData = <T>(filePath: string, defaultValue: T): T => {
  if (!fs.existsSync(filePath)) return defaultValue;
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
};

const writeData = <T>(filePath: string, data: T): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

let tracks: Track[] = readData<Track[]>(tracksFile, []);
let albums: Album[] = readData<Album[]>(albumsFile, []);

const saveTracks = () => writeData(tracksFile, tracks);
const saveAlbums = () => writeData(albumsFile, albums);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'cover') cb(null, coversDir);
    else if (file.fieldname === 'audio') cb(null, audioDir);
    else cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 12 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'cover') {
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) return cb(null, true);
      return cb(new Error('只支持 JPG 和 PNG 格式的图片'));
    }
    if (file.fieldname === 'audio') {
      const allowedTypes = /mp3/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) return cb(null, true);
      return cb(new Error('只支持 MP3 格式的音频'));
    }
    cb(new Error('不支持的文件类型'));
  }
});

const processCoverImage = async (filePath: string): Promise<string> => {
  const processedPath = filePath.replace(path.extname(filePath), '_400x400.jpg');
  await sharp(filePath)
    .resize(400, 400, { fit: 'cover' })
    .jpeg({ quality: 85 })
    .toFile(processedPath);
  fs.unlinkSync(filePath);
  return `/uploads/covers/${path.basename(processedPath)}`;
};

app.get('/api/tracks', (_req, res) => {
  res.json(tracks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

app.get('/api/tracks/published', (_req, res) => {
  res.json(tracks.filter(t => t.isPublished).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

app.get('/api/tracks/:id', (req, res) => {
  const track = tracks.find(t => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: '曲目不存在' });
  res.json(track);
});

app.post('/api/tracks', upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, artist, albumId, duration, lyrics } = req.body;
    if (!name || !artist || !duration) {
      return res.status(400).json({ error: '曲名、艺人、时长为必填项' });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let coverUrl = '';
    let audioUrl = '';

    if (files.cover && files.cover[0]) {
      coverUrl = await processCoverImage(files.cover[0].path);
    }
    if (files.audio && files.audio[0]) {
      audioUrl = `/uploads/audio/${files.audio[0].filename}`;
    }

    const newTrack: Track = {
      id: uuidv4(),
      name,
      artist,
      albumId: albumId || undefined,
      duration,
      lyrics: lyrics || '',
      coverUrl,
      audioUrl,
      isPublished: false,
      createdAt: new Date().toISOString()
    };

    tracks.unshift(newTrack);
    saveTracks();
    res.json(newTrack);
  } catch (error) {
    console.error('Error creating track:', error);
    res.status(500).json({ error: '创建曲目失败' });
  }
});

app.put('/api/tracks/:id', upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), async (req, res) => {
  try {
    const trackIndex = tracks.findIndex(t => t.id === req.params.id);
    if (trackIndex === -1) return res.status(404).json({ error: '曲目不存在' });

    const { name, artist, albumId, duration, lyrics, isPublished } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    let coverUrl = tracks[trackIndex].coverUrl;
    let audioUrl = tracks[trackIndex].audioUrl;

    if (files.cover && files.cover[0]) {
      coverUrl = await processCoverImage(files.cover[0].path);
    }
    if (files.audio && files.audio[0]) {
      audioUrl = `/uploads/audio/${files.audio[0].filename}`;
    }

    tracks[trackIndex] = {
      ...tracks[trackIndex],
      name: name || tracks[trackIndex].name,
      artist: artist || tracks[trackIndex].artist,
      albumId: albumId || undefined,
      duration: duration || tracks[trackIndex].duration,
      lyrics: lyrics !== undefined ? lyrics : tracks[trackIndex].lyrics,
      coverUrl,
      audioUrl,
      isPublished: isPublished !== undefined ? isPublished === 'true' : tracks[trackIndex].isPublished
    };

    saveTracks();
    res.json(tracks[trackIndex]);
  } catch (error) {
    console.error('Error updating track:', error);
    res.status(500).json({ error: '更新曲目失败' });
  }
});

app.patch('/api/tracks/:id/publish', (req, res) => {
  const trackIndex = tracks.findIndex(t => t.id === req.params.id);
  if (trackIndex === -1) return res.status(404).json({ error: '曲目不存在' });

  tracks[trackIndex].isPublished = req.body.isPublished;
  saveTracks();
  res.json(tracks[trackIndex]);
});

app.delete('/api/tracks/:id', (req, res) => {
  const trackIndex = tracks.findIndex(t => t.id === req.params.id);
  if (trackIndex === -1) return res.status(404).json({ error: '曲目不存在' });

  tracks.splice(trackIndex, 1);
  saveTracks();
  res.json({ success: true });
});

app.get('/api/albums', (_req, res) => {
  res.json(albums.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

app.get('/api/albums/published', (_req, res) => {
  res.json(albums.filter(a => a.isPublished).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

app.get('/api/albums/:id', (req, res) => {
  const album = albums.find(a => a.id === req.params.id);
  if (!album) return res.status(404).json({ error: '专辑不存在' });
  
  const albumTracks = album.trackIds
    .map(id => tracks.find(t => t.id === id))
    .filter(Boolean) as Track[];
  
  res.json({ ...album, tracks: albumTracks });
});

app.post('/api/albums', upload.fields([{ name: 'cover', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, releaseDate, trackIds } = req.body;
    if (!name) return res.status(400).json({ error: '专辑名称为必填项' });

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let coverUrl = '';

    if (files.cover && files.cover[0]) {
      coverUrl = await processCoverImage(files.cover[0].path);
    }

    const parsedTrackIds = Array.isArray(trackIds) ? trackIds : JSON.parse(trackIds || '[]');

    const newAlbum: Album = {
      id: uuidv4(),
      name,
      releaseDate: releaseDate || new Date().toISOString().split('T')[0],
      coverUrl,
      trackIds: parsedTrackIds,
      isPublished: false,
      createdAt: new Date().toISOString()
    };

    albums.unshift(newAlbum);
    saveAlbums();
    res.json(newAlbum);
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ error: '创建专辑失败' });
  }
});

app.put('/api/albums/:id', upload.fields([{ name: 'cover', maxCount: 1 }]), async (req, res) => {
  try {
    const albumIndex = albums.findIndex(a => a.id === req.params.id);
    if (albumIndex === -1) return res.status(404).json({ error: '专辑不存在' });

    const { name, releaseDate, trackIds, isPublished } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    let coverUrl = albums[albumIndex].coverUrl;
    if (files.cover && files.cover[0]) {
      coverUrl = await processCoverImage(files.cover[0].path);
    }

    const parsedTrackIds = Array.isArray(trackIds) ? trackIds : JSON.parse(trackIds || albums[albumIndex].trackIds);

    albums[albumIndex] = {
      ...albums[albumIndex],
      name: name || albums[albumIndex].name,
      releaseDate: releaseDate || albums[albumIndex].releaseDate,
      coverUrl,
      trackIds: parsedTrackIds,
      isPublished: isPublished !== undefined ? isPublished === 'true' : albums[albumIndex].isPublished
    };

    saveAlbums();
    res.json(albums[albumIndex]);
  } catch (error) {
    console.error('Error updating album:', error);
    res.status(500).json({ error: '更新专辑失败' });
  }
});

app.patch('/api/albums/:id/publish', (req, res) => {
  const albumIndex = albums.findIndex(a => a.id === req.params.id);
  if (albumIndex === -1) return res.status(404).json({ error: '专辑不存在' });

  albums[albumIndex].isPublished = req.body.isPublished;
  saveAlbums();
  res.json(albums[albumIndex]);
});

app.delete('/api/albums/:id', (req, res) => {
  const albumIndex = albums.findIndex(a => a.id === req.params.id);
  if (albumIndex === -1) return res.status(404).json({ error: '专辑不存在' });

  albums.splice(albumIndex, 1);
  saveAlbums();
  res.json({ success: true });
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ error: error.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
