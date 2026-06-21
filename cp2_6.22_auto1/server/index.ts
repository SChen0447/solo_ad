import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Podcast, Episode, ListeningProgress, GeneratePlaylistRequest, GeneratePlaylistResponse } from '../src/types';
import { generateMockPodcasts, generateMockEpisodes } from '../src/data/mockData';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const podcasts = generateMockPodcasts();
const episodesMap = generateMockEpisodes(podcasts);
const progressMap = new Map<string, ListeningProgress>();

app.get('/api/podcasts', (req, res) => {
  const search = req.query.search as string | undefined;
  let result = [...podcasts];
  if (search && search.trim()) {
    const keyword = search.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(keyword) ||
        p.author.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword)
    );
  }
  res.json(result);
});

app.get('/api/podcasts/:id/episodes', (req, res) => {
  const { id } = req.params;
  const episodes = episodesMap.get(id) || [];
  res.json(episodes);
});

app.post('/api/podcasts/subscribe', (req, res) => {
  const { podcastId, subscribe } = req.body as { podcastId: string; subscribe: boolean };
  const podcast = podcasts.find((p) => p.id === podcastId);
  if (!podcast) {
    res.status(404).json({ error: 'Podcast not found' });
    return;
  }
  podcast.subscribed = subscribe;
  if (subscribe) {
    podcast.subscribedAt = new Date().toISOString();
  } else {
    podcast.subscribedAt = undefined;
  }
  res.json(podcast);
});

app.post('/api/playlist/generate', (req, res) => {
  const { maxDuration, subscribedPodcastIds } = req.body as GeneratePlaylistRequest;
  const maxDurationSeconds = maxDuration * 60;
  
  let allUnfinished: Episode[] = [];
  
  for (const podcastId of subscribedPodcastIds) {
    const eps = episodesMap.get(podcastId) || [];
    const unfinished = eps.filter((ep) => {
      const prog = progressMap.get(ep.id);
      return !prog || prog.status !== 'completed';
    });
    allUnfinished = allUnfinished.concat(unfinished);
  }

  allUnfinished.sort((a, b) => {
    const ratingDiff = b.rating - a.rating;
    if (Math.abs(ratingDiff) >= 0.5) return ratingDiff;
    return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
  });

  const highRated = allUnfinished.filter((ep) => ep.rating >= 4);
  const normalRated = allUnfinished.filter((ep) => ep.rating < 4);

  const sortedEpisodes = [...highRated, ...normalRated];

  const selected: Episode[] = [];
  let totalDuration = 0;

  for (const ep of sortedEpisodes) {
    if (totalDuration + ep.duration <= maxDurationSeconds) {
      selected.push(ep);
      totalDuration += ep.duration;
    }
    if (totalDuration >= maxDurationSeconds * 0.9) break;
  }

  const response: GeneratePlaylistResponse = {
    episodes: selected,
    totalDuration
  };
  res.json(response);
});

app.put('/api/progress', (req, res) => {
  const { episodeId, position, status } = req.body as {
    episodeId: string;
    position: number;
    status: ListeningProgress['status'];
  };

  const progress: ListeningProgress = {
    episodeId,
    position,
    status,
    updatedAt: new Date().toISOString()
  };
  progressMap.set(episodeId, progress);
  res.json(progress);
});

app.get('/api/progress', (req, res) => {
  const allProgress = Array.from(progressMap.values());
  res.json(allProgress);
});

app.listen(PORT, () => {
  console.log(`Podcast API server running at http://localhost:${PORT}`);
});
