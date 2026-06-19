import { Router, type Request, type Response } from 'express';
import * as bookService from '../modules/book/bookService.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    const ownerId = req.query.ownerId as string | undefined;
    const books = await bookService.getAll(search, ownerId);
    res.json({ success: true, data: books });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch books' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const book = await bookService.getById(req.params.id);
    if (!book) {
      res.status(404).json({ success: false, error: 'Book not found' });
      return;
    }
    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch book' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const book = await bookService.create(req.body);
    res.status(201).json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create book' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await bookService.deleteById(req.params.id);
    res.json({ success: true, message: 'Book deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete book' });
  }
});

router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    if (status !== 'available' && status !== 'swapped') {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }
    const book = await bookService.updateStatus(req.params.id, status);
    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update book status' });
  }
});

export default router;
