import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  createRoom,
  getRoomByCode,
  getRoomById,
  getAllRooms,
  addParticipant,
  getParticipantsByRoom,
  getParticipantById,
  getWishlistByParticipant,
  addAssignments,
  getAssignmentByGiver,
  getAssignmentsByRoom,
  markGiftSent,
  markGiftReceived,
  getRoomStats,
  updateRoomStatus,
  Participant,
  WishlistItem,
} from './database';
import { performMatching } from './matching';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function sendEmail(to: string, subject: string, body: string): void {
  console.log('\n========== 📧 模拟邮件发送 ==========');
  console.log(`收件人: ${to}`);
  console.log(`主题: ${subject}`);
  console.log('内容:');
  console.log(body);
  console.log('=====================================\n');
}

app.post('/api/room/create', (req, res) => {
  try {
    const { name, eventDate, minPrice, maxPrice, exchangeDeadline, exclusionPairs } = req.body;

    if (!name || !eventDate || !exchangeDeadline) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    let roomCode = generateRoomCode();
    while (getRoomByCode(roomCode)) {
      roomCode = generateRoomCode();
    }

    const id = uuidv4();
    const room = createRoom(
      id,
      roomCode,
      name,
      eventDate,
      minPrice || 0,
      maxPrice || 0,
      exchangeDeadline,
      exclusionPairs || []
    );

    res.json({ room });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: '创建活动失败' });
  }
});

app.post('/api/room/join', (req, res) => {
  try {
    const { roomCode, nickname, address, email, wishlist } = req.body;

    if (!roomCode || !nickname) {
      return res.status(400).json({ error: '房间码和昵称为必填' });
    }

    const room = getRoomByCode(roomCode);
    if (!room) {
      return res.status(404).json({ error: '活动不存在' });
    }

    if (room.status === 'completed') {
      return res.status(400).json({ error: '活动已结束' });
    }

    const participantId = uuidv4();
    const participant = addParticipant(
      participantId,
      room.id,
      nickname,
      address || null,
      email || null,
      wishlist || []
    );

    const participants = getParticipantsByRoom(room.id);
    const wishlistItems = getWishlistByParticipant(participantId);

    res.json({ participant, room, participants, wishlist: wishlistItems });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: '加入活动失败' });
  }
});

app.post('/api/matching', (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: '缺少房间ID' });
    }

    const room = getRoomById(roomId);
    if (!room) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const existingAssignments = getAssignmentsByRoom(roomId);
    if (existingAssignments.length > 0) {
      return res.status(400).json({ error: '该活动已完成匹配' });
    }

    const participants = getParticipantsByRoom(roomId);
    if (participants.length < 2) {
      return res.status(400).json({ error: '至少需要2名参与者才能匹配' });
    }

    const exclusionPairs: [string, string][] = JSON.parse(room.exclusionPairs || '[]');

    const results = performMatching({
      participantIds: participants.map((p) => p.id),
      exclusionPairs,
    });

    const assignments = results.map((r) => ({
      id: uuidv4(),
      roomId,
      giverId: r.giverId,
      receiverId: r.receiverId,
    }));

    addAssignments(assignments);
    updateRoomStatus(roomId, 'active');

    participants.forEach((p) => {
      if (p.email) {
        const assignment = assignments.find((a) => a.giverId === p.id);
        if (assignment) {
          const receiver = participants.find((pp) => pp.id === assignment.receiverId);
          if (receiver) {
            sendEmail(
              p.email,
              `[${room.name}] 您的 Secret Santa 配对结果`,
              `亲爱的 ${p.nickname}：\n\n您抽到的礼物接收人是：${receiver.nickname}\n\n请登录系统查看对方的心愿清单，并在 ${room.exchangeDeadline} 前寄出礼物。\n\n祝您节日愉快！`
            );
          }
        }
      }
    });

    res.json({ success: true, assignments: results });
  } catch (error) {
    console.error('Matching error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : '匹配失败' });
  }
});

app.get('/api/assignment/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const assignment = getAssignmentByGiver(userId);
    if (!assignment) {
      return res.status(404).json({ error: '未找到匹配信息' });
    }

    const participant = getParticipantById(userId);
    if (!participant) {
      return res.status(404).json({ error: '参与者不存在' });
    }

    const room = getRoomById(assignment.roomId);

    res.json({
      receiver: {
        id: assignment.receiver.id,
        nickname: assignment.receiver.nickname,
        address: assignment.receiver.address,
      },
      wishlist: assignment.receiverWishlist,
      room,
      giftSent: participant.giftSent === 1,
    });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ error: '获取匹配信息失败' });
  }
});

app.patch('/api/gift/sent/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const participant = getParticipantById(userId);
    if (!participant) {
      return res.status(404).json({ error: '参与者不存在' });
    }

    markGiftSent(userId);

    const room = getRoomById(participant.roomId);
    if (room && participant.email) {
      sendEmail(
        participant.email,
        `[${room.name}] 礼物已送出确认`,
        `亲爱的 ${participant.nickname}：\n\n您已确认送出礼物，感谢您的参与！\n\n当对方收到礼物后，您会收到匿名感谢信息。`
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark sent error:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

app.patch('/api/gift/received/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const participant = getParticipantById(userId);
    if (!participant) {
      return res.status(404).json({ error: '参与者不存在' });
    }

    const result = markGiftReceived(userId);
    if (!result) {
      return res.status(400).json({ error: '未找到对应的送礼人' });
    }

    const room = getRoomById(participant.roomId);
    const giver = getParticipantById(result.giverId);

    if (room && giver && giver.email) {
      sendEmail(
        giver.email,
        `[${room.name}] 🎉 您的礼物已被收到！`,
        `亲爱的送礼人：\n\n好消息！您送出的礼物已被 ${participant.nickname} 收到，对方非常感谢您！🎁\n\n感谢您参与本次 Secret Santa 活动！`
      );
    }

    const stats = room ? getRoomStats(room.id) : null;
    if (stats && stats.total > 0 && stats.received === stats.total) {
      updateRoomStatus(participant.roomId, 'completed');
    }

    res.json({ success: true, anonymousThanked: true, stats });
  } catch (error) {
    console.error('Mark received error:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

app.get('/api/rooms', (_req, res) => {
  try {
    const rooms = getAllRooms();
    const roomsWithStats = rooms.map((room) => ({
      ...room,
      stats: getRoomStats(room.id),
      participants: getParticipantsByRoom(room.id),
    }));
    res.json({ rooms: roomsWithStats });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: '获取活动列表失败' });
  }
});

app.get('/api/room/:roomId/participants', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = getRoomById(roomId);
    if (!room) {
      return res.status(404).json({ error: '活动不存在' });
    }
    const participants = getParticipantsByRoom(roomId);
    const stats = getRoomStats(roomId);
    res.json({ room, participants, stats });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: '获取参与者列表失败' });
  }
});

app.get('/api/participant/:id', (req, res) => {
  try {
    const { id } = req.params;
    const participant = getParticipantById(id);
    if (!participant) {
      return res.status(404).json({ error: '参与者不存在' });
    }
    const room = getRoomById(participant.roomId);
    const wishlist = getWishlistByParticipant(id);
    const stats = room ? getRoomStats(room.id) : null;
    res.json({ participant, room, wishlist, stats });
  } catch (error) {
    console.error('Get participant error:', error);
    res.status(500).json({ error: '获取参与者信息失败' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Secret Santa 后端服务已启动: http://localhost:${PORT}`);
});
