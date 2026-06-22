import express from 'express';
import cors from 'cors';
import { mockPodcasts, type Podcast, type Episode } from '../src/data/mockData';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface ProgressData {
  [episodeId: string]: {
    currentTime: number;
    duration: number;
    status: 'not_started' | 'in_progress' | 'completed';
  };
}

let subscribedPodcastIds: string[] = ['podcast-0', 'podcast-2'];
let progressData: ProgressData = {};

app.get('/api/podcasts', (req, res) => {
  const search = (req.query.search as string) || '';
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  let filtered = mockPodcasts;
  if (search) {
    const lowerSearch = search.toLowerCase();
    filtered = mockPodcasts.filter(
      (p) =>
        p.title.toLowerCase().includes(lowerSearch) ||
        p.author.toLowerCase().includes(lowerSearch) ||
        p.description.toLowerCase().includes(lowerSearch)
    );
  }

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  const podcastsWithSubStatus = paginated.map((p) => ({
    ...p,
    isSubscribed: subscribedPodcastIds.includes(p.id),
    episodes: undefined,
  }));

  res.json({
    podcasts: podcastsWithSubStatus,
    total: filtered.length,
    page,
    limit,
  });
});

app.get('/api/podcasts/subscribed', (req, res) => {
  const subscribed = mockPodcasts
    .filter((p) => subscribedPodcastIds.includes(p.id))
    .map((p) => ({
      ...p,
      isSubscribed: true,
    }));

  res.json({ podcasts: subscribed });
});

app.get('/api/podcasts/:id', (req, res) => {
  const podcast = mockPodcasts.find((p) => p.id === req.params.id);
  if (!podcast) {
    res.status(404).json({ error: 'Podcast not found' });
    return;
  }

  res.json({
    ...podcast,
    isSubscribed: subscribedPodcastIds.includes(podcast.id),
  });
});

app.get('/api/podcasts/:id/episodes', (req, res) => {
  const podcast = mockPodcasts.find((p) => p.id === req.params.id);
  if (!podcast) {
    res.status(404).json({ error: 'Podcast not found' });
    return;
  }

  const episodesWithProgress = podcast.episodes.map((ep) => ({
    ...ep,
    progress: progressData[ep.id] || null,
  }));

  res.json({ episodes: episodesWithProgress });
});

app.post('/api/podcasts/subscribe', (req, res) => {
  const { podcastId } = req.body;
  const podcast = mockPodcasts.find((p) => p.id === podcastId);

  if (!podcast) {
    res.status(404).json({ error: 'Podcast not found' });
    return;
  }

  if (!subscribedPodcastIds.includes(podcastId)) {
    subscribedPodcastIds.push(podcastId);
  }

  res.json({
    success: true,
    podcast: {
      ...podcast,
      isSubscribed: true,
    },
  });
});

app.post('/api/podcasts/unsubscribe', (req, res) => {
  const { podcastId } = req.body;

  subscribedPodcastIds = subscribedPodcastIds.filter((id) => id !== podcastId);

  res.json({ success: true });
});

app.post('/api/playlist/generate', (req, res) => {
  const { maxDuration, includeCompleted = false } = req.body;
  const maxDurationSeconds = maxDuration * 60;

  let allEpisodes: (Episode & { podcastTitle: string; podcastId: string })[] = [];

  for (const podcastId of subscribedPodcastIds) {
    const podcast = mockPodcasts.find((p) => p.id === podcastId);
    if (!podcast) continue;

    for (const episode of podcast.episodes) {
      const progress = progressData[episode.id];
      const isCompleted = progress?.status === 'completed';

      if (!includeCompleted && isCompleted) continue;

      allEpisodes.push({
        ...episode,
        podcastTitle: podcast.title,
        podcastId: podcast.id,
      });
    }
  }

  const ratedEpisodes = allEpisodes
    .filter((ep) => ep.rating >= 4.0)
    .sort((a, b) => b.rating - a.rating);

  const otherEpisodes = allEpisodes
    .filter((ep) => ep.rating < 4.0)
    .sort((a, b) => b.rating - a.rating);

  const sortedEpisodes = [...ratedEpisodes, ...otherEpisodes];

  const playlist: Episode[] = [];
  let currentDuration = 0;

  for (const episode of sortedEpisodes) {
    if (currentDuration + episode.duration <= maxDurationSeconds) {
      playlist.push(episode);
      currentDuration += episode.duration;
    }
    if (currentDuration >= maxDurationSeconds * 0.9) break;
  }

  res.json({
    playlist,
    totalDuration: currentDuration,
    episodeCount: playlist.length,
  });
});

app.get('/api/progress', (req, res) => {
  res.json({ progress: progressData });
});

app.put('/api/progress', (req, res) => {
  const { episodeId, currentTime, duration } = req.body;

  if (!episodeId) {
    res.status(400).json({ error: 'episodeId is required' });
    return;
  }

  const totalDuration = duration || 0;
  let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';

  if (currentTime <= 0) {
    status = 'not_started';
  } else if (currentTime >= totalDuration * 0.95) {
    status = 'completed';
  } else {
    status = 'in_progress';
  }

  progressData[episodeId] = {
    currentTime: currentTime || 0,
    duration: totalDuration,
    status,
  };

  res.json({
    success: true,
    progress: progressData[episodeId],
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
