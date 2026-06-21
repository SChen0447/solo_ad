import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  insertRoom,
  getRoomByCode,
  endRoom,
  deleteRoom,
  resetVotes,
  upsertVote,
  insertComment,
  getCommentsByRoom,
  computeResults,
  cleanupExpired,
} from './db';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  SubmitVoteRequest,
  CreateCommentRequest,
  VoteType,
} from '../shared/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateAdminKey(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

app.post('/api/room', (req, res) => {
  try {
    const body = req.body as CreateRoomRequest;
    if (!body.title || !body.options || body.options.length < 2 || body.options.length > 8) {
      return res.status(400).json({ error: 'Invalid room data' });
    }
    if (!body.voteType || !['single', 'multiple', 'ranking'].includes(body.voteType)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    let code = generateRoomCode();
    let attempts = 0;
    while (getRoomByCode(code) && attempts < 10) {
      code = generateRoomCode();
      attempts++;
    }
    if (attempts >= 10) {
      return res.status(500).json({ error: 'Failed to generate unique room code' });
    }

    const adminKey = generateAdminKey();
    const room = insertRoom(
      uuidv4(),
      code,
      adminKey,
      body.title,
      body.description || '',
      body.options,
      body.voteType as VoteType
    );

    const response: CreateRoomResponse = { code, adminKey, room };
    return res.json(response);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/room/:code', (req, res) => {
  const room = getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.json(room);
});

app.post('/api/room/:code/vote', (req, res) => {
  try {
    const room = getRoomByCode(req.params.code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (room.isEnded) {
      return res.status(400).json({ error: 'Voting has ended' });
    }
    const body = req.body as SubmitVoteRequest;
    if (!body.voterId || !body.selections || body.selections.length === 0) {
      return res.status(400).json({ error: 'Invalid vote data' });
    }
    if (room.voteType === 'single' && body.selections.length !== 1) {
      return res.status(400).json({ error: 'Single choice requires exactly one selection' });
    }
    if (room.voteType === 'ranking' && body.selections.length !== room.options.length) {
      return res.status(400).json({ error: 'Ranking requires all options to be ordered' });
    }
    for (const idx of body.selections) {
      if (idx < 0 || idx >= room.options.length) {
        return res.status(400).json({ error: 'Invalid option index' });
      }
    }
    const unique = new Set(body.selections);
    if (unique.size !== body.selections.length) {
      return res.status(400).json({ error: 'Duplicate selections not allowed' });
    }

    upsertVote(
      uuidv4(),
      room.id,
      body.voterId,
      body.voterName || null,
      body.selections
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/room/:code/results', (req, res) => {
  const room = getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  const data = computeResults(room);
  return res.json(data);
});

app.post('/api/room/:code/comment', (req, res) => {
  try {
    const room = getRoomByCode(req.params.code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const body = req.body as CreateCommentRequest;
    if (!body.content || body.content.length === 0 || body.content.length > 200) {
      return res.status(400).json({ error: 'Comment must be 1-200 characters' });
    }
    const comment = insertComment(uuidv4(), room.id, body.content);
    return res.json({ comment });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/room/:code/comments', (req, res) => {
  const room = getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  const comments = getCommentsByRoom(room.id);
  return res.json(comments);
});

app.delete('/api/room/:code/admin', (req, res) => {
  try {
    const { key, action } = req.query as { key?: string; action?: string };
    const room = getRoomByCode(req.params.code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (!key || key !== room.adminKey) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }
    if (action === 'end') {
      endRoom(req.params.code);
      return res.json({ success: true });
    } else if (action === 'reset') {
      resetVotes(room.id);
      return res.json({ success: true });
    } else if (action === 'delete') {
      deleteRoom(req.params.code);
      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/room/:code/export', (req, res) => {
  try {
    const { key } = req.query as { key?: string };
    const room = getRoomByCode(req.params.code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (!key || key !== room.adminKey) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }
    const { results } = computeResults(room);
    const header = '选项名,票数,百分比\n';
    const rows = results.map((r) => `"${r.optionText}",${r.count},${r.percentage}%`).join('\n');
    const csv = header + rows;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="vote-${req.params.code}.csv"`);
    return res.send('\uFEFF' + csv);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

setInterval(() => {
  try {
    const count = cleanupExpired();
    if (count > 0) {
      console.log(`[Cleanup] Removed ${count} expired rooms`);
    }
  } catch (err) {
    console.error('[Cleanup] Error:', err);
  }
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`QuickVote server listening on port ${PORT}`);
});
