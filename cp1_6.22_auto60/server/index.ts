import express from 'express';
import cors from 'cors';
import { initDatabase, getAllArtists, getArtistById, createAppointment, searchArtists } from './database';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/artists', async (req, res) => {
  try {
    const { keyword, style } = req.query;
    let artists = await getAllArtists();

    if (keyword && keyword !== '') {
      artists = await searchArtists(keyword as string);
    }

    if (style && style !== 'all') {
      artists = artists.filter(a => a.style === style);
    }

    res.json(artists);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/artists/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const artist = await getArtistById(id);
    if (!artist) {
      res.status(404).json({ error: '手作人不存在' });
      return;
    }
    res.json(artist);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { artistId, date, time, visitorName, phone } = req.body;

    if (!artistId || !date || !time || !visitorName || !phone) {
      res.status(400).json({ error: '缺少必要字段' });
      return;
    }

    const appointment = await createAppointment(
      parseInt(artistId),
      date,
      time,
      visitorName,
      phone
    );

    res.status(201).json({
      message: '预约成功',
      appointment
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  })
  .catch((err: Error) => {
    console.error('数据库初始化失败:', err);
  });
