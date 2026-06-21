import express from 'express';
import type { Server } from 'socket.io';
import { store } from '../utils/store.js';

const router = express.Router();

export default function createAuctionsRouter(io: Server) {
  router.get('/', (req, res) => {
    try {
      const auctions = store.getAllAuctions();
      res.json(
        auctions.map((a) => ({
          id: a.id,
          name: a.name,
          imageUrl: a.imageUrl,
          startPrice: a.startPrice,
          currentPrice: a.currentPrice,
          minIncrement: a.minIncrement,
          endTime: a.endTime,
          bidCount: a.bidCount,
          status: a.status,
        }))
      );
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const auction = store.getAuctionById(id);
      if (!auction) {
        return res.status(404).json({ error: 'Auction not found' });
      }
      const bids = store.getBidsByAuctionId(id);
      res.json({
        auction,
        bids,
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/:id/bid', (req, res) => {
    try {
      const { id } = req.params;
      const { userId, amount } = req.body;

      if (!userId || typeof amount !== 'number') {
        return res.status(400).json({ error: 'Invalid request body' });
      }

      const bid = store.addBid(id, userId, amount);
      if (!bid) {
        return res.status(400).json({ error: 'Bid amount too low or auction not found' });
      }

      io.to(id).emit('newBid', {
        auctionId: id,
        bid,
        newCurrentPrice: bid.amount,
      });

      res.json({ success: true, bid });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
