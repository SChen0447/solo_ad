import { Router, Request, Response } from 'express';

export function createRouter(
  plants: Map<string, any>,
  careRecords: Map<string, any>,
  posts: Map<string, any>,
  users: Map<string, any>
) {
  const router = Router();

  router.get('/plants', (_req: Request, res: Response) => {
    const list = Array.from(plants.values());
    res.json(list);
  });

  router.get('/plants/:id', (req: Request, res: Response) => {
    const plant = plants.get(req.params.id);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    res.json(plant);
  });

  router.post('/plants', (req: Request, res: Response) => {
    const { name, species, location, lightNeeds, imageUrl } = req.body;
    if (!name || !species) {
      res.status(400).json({ error: 'Name and species are required' });
      return;
    }
    const id = 'p' + Date.now();
    const plant = {
      id,
      name,
      species: species || '',
      location: location || '',
      lightNeeds: lightNeeds || '',
      imageUrl: imageUrl || '',
      lastWatered: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    plants.set(id, plant);
    const recordId = 'c' + Date.now();
    careRecords.set(recordId, { id: recordId, plantId: id, type: 'water', date: plant.lastWatered });
    res.status(201).json(plant);
  });

  router.post('/plants/:id/water', (req: Request, res: Response) => {
    const plant = plants.get(req.params.id);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    plant.lastWatered = new Date().toISOString();
    plants.set(plant.id, plant);
    const recordId = 'c' + Date.now();
    const record = { id: recordId, plantId: plant.id, type: 'water', date: plant.lastWatered };
    careRecords.set(recordId, record);
    res.json(plant);
  });

  router.post('/plants/:id/fertilize', (req: Request, res: Response) => {
    const plant = plants.get(req.params.id);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    const recordId = 'c' + Date.now();
    const record = { id: recordId, plantId: plant.id, type: 'fertilize', date: new Date().toISOString() };
    careRecords.set(recordId, record);
    res.json(record);
  });

  router.post('/plants/:id/repot', (req: Request, res: Response) => {
    const plant = plants.get(req.params.id);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    const recordId = 'c' + Date.now();
    const record = { id: recordId, plantId: plant.id, type: 'repot', date: new Date().toISOString() };
    careRecords.set(recordId, record);
    res.json(record);
  });

  router.get('/plants/:id/care-records', (req: Request, res: Response) => {
    const list = Array.from(careRecords.values())
      .filter((r: any) => r.plantId === req.params.id)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(list);
  });

  router.get('/posts', (_req: Request, res: Response) => {
    const list = Array.from(posts.values()).sort(
      (a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
    res.json(list);
  });

  router.post('/posts', (req: Request, res: Response) => {
    const { author, avatar, content } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    const id = 'post' + Date.now();
    const post = {
      id,
      author: author || '匿名花友',
      avatar: avatar || '',
      time: new Date().toISOString(),
      content,
      likes: 0,
      liked: false,
      saved: false,
      comments: [],
    };
    posts.set(id, post);
    res.status(201).json(post);
  });

  router.post('/posts/:id/like', (req: Request, res: Response) => {
    const post = posts.get(req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    posts.set(post.id, post);
    res.json(post);
  });

  router.post('/posts/:id/save', (req: Request, res: Response) => {
    const post = posts.get(req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    post.saved = !post.saved;
    posts.set(post.id, post);
    res.json(post);
  });

  router.post('/posts/:id/comments', (req: Request, res: Response) => {
    const post = posts.get(req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    const { author, avatar, content } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    const comment = {
      id: 'cm' + Date.now(),
      author: author || '匿名花友',
      avatar: avatar || '',
      content,
      time: new Date().toISOString(),
    };
    post.comments.unshift(comment);
    posts.set(post.id, post);
    res.status(201).json(comment);
  });

  router.get('/user', (_req: Request, res: Response) => {
    const user = users.get('u1');
    res.json(user);
  });

  return router;
}
