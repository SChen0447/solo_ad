import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

interface Card {
  id: string;
  attack: number;
}

interface Player {
  id: string;
  name: string;
  ws: WebSocket;
  hp: number;
  hand: Card[];
  isTurn: boolean;
}

interface Room {
  id: string;
  name: string;
  code: string;
  players: Player[];
  status: 'waiting' | 'playing';
  currentTurn: number;
  round: number;
}

const rooms: Map<string, Room> = new Map();

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateCard(): Card {
  return {
    id: uuidv4(),
    attack: Math.floor(Math.random() * 5) + 1
  };
}

function generateHand(count: number): Card[] {
  return Array.from({ length: count }, () => generateCard());
}

function getPublicRoomList() {
  return Array.from(rooms.values())
    .filter(room => room.status === 'waiting')
    .slice(0, 4)
    .map(room => ({
      id: room.id,
      name: room.name,
      code: room.code,
      playerCount: room.players.length,
      status: room.status === 'waiting' ? '等待中' : '对战中'
    }));
}

function broadcastToRoom(room: Room, message: object, excludeId?: string) {
  room.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN && player.id !== excludeId) {
      player.ws.send(JSON.stringify(message));
    }
  });
}

function sendToPlayer(player: Player, message: object) {
  if (player.ws.readyState === WebSocket.OPEN) {
    player.ws.send(JSON.stringify(message));
  }
}

function startGame(room: Room) {
  room.status = 'playing';
  room.round = 1;
  room.currentTurn = 0;
  
  room.players.forEach((player, index) => {
    player.hp = 20;
    player.hand = generateHand(5);
    player.isTurn = index === 0;
  });

  const gameState = {
    type: 'game_start',
    round: room.round,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      hp: p.hp,
      hand: p.hand,
      isTurn: p.isTurn
    }))
  };

  broadcastToRoom(room, gameState);
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null;
  let playerId: string | null = null;

  ws.on('message', (data: string) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'create_room': {
          const roomId = uuidv4();
          const roomCode = generateRoomCode();
          const newPlayer: Player = {
            id: uuidv4(),
            name: message.playerName || '玩家1',
            ws,
            hp: 20,
            hand: [],
            isTurn: false
          };
          
          playerId = newPlayer.id;
          
          const room: Room = {
            id: roomId,
            name: message.roomName,
            code: roomCode,
            players: [newPlayer],
            status: 'waiting',
            currentTurn: 0,
            round: 0
          };
          
          rooms.set(roomId, room);
          currentRoomId = roomId;
          
          sendToPlayer(newPlayer, {
            type: 'room_created',
            roomId,
            roomCode,
            roomName: room.name,
            playerId: newPlayer.id,
            playerName: newPlayer.name
          });

          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client !== ws) {
              client.send(JSON.stringify({
                type: 'room_list_update',
                rooms: getPublicRoomList()
              }));
            }
          });
          break;
        }

        case 'join_room': {
          const { roomCode, playerName } = message;
          let targetRoom: Room | undefined;
          
          for (const room of rooms.values()) {
            if (room.code === roomCode && room.status === 'waiting' && room.players.length < 2) {
              targetRoom = room;
              break;
            }
          }
          
          if (!targetRoom) {
            ws.send(JSON.stringify({ type: 'join_failed', reason: '房间不存在或已满' }));
            return;
          }
          
          const newPlayer: Player = {
            id: uuidv4(),
            name: playerName || '玩家2',
            ws,
            hp: 20,
            hand: [],
            isTurn: false
          };
          
          playerId = newPlayer.id;
          targetRoom.players.push(newPlayer);
          currentRoomId = targetRoom.id;
          
          sendToPlayer(newPlayer, {
            type: 'room_joined',
            roomId: targetRoom.id,
            roomCode: targetRoom.code,
            roomName: targetRoom.name,
            playerId: newPlayer.id,
            playerName: newPlayer.name,
            opponentName: targetRoom.players[0].name
          });

          sendToPlayer(targetRoom.players[0], {
            type: 'opponent_joined',
            opponentName: newPlayer.name
          });

          if (targetRoom.players.length === 2) {
            setTimeout(() => startGame(targetRoom!), 500);
          }

          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'room_list_update',
                rooms: getPublicRoomList()
              }));
            }
          });
          break;
        }

        case 'get_room_list': {
          ws.send(JSON.stringify({
            type: 'room_list',
            rooms: getPublicRoomList()
          }));
          break;
        }

        case 'play_cards': {
          if (!currentRoomId || !playerId) return;
          
          const room = rooms.get(currentRoomId);
          if (!room || room.status !== 'playing') return;
          
          const currentPlayer = room.players.find(p => p.id === playerId);
          if (!currentPlayer || !currentPlayer.isTurn) return;
          
          const { cardIds } = message;
          const playedCards = currentPlayer.hand.filter(card => cardIds.includes(card.id));
          
          if (playedCards.length === 0) return;
          
          const totalDamage = playedCards.reduce((sum, card) => sum + card.attack, 0);
          const opponent = room.players.find(p => p.id !== playerId)!;
          
          currentPlayer.hand = currentPlayer.hand.filter(card => !cardIds.includes(card.id));
          opponent.hp = Math.max(0, opponent.hp - totalDamage);
          
          const gameOver = opponent.hp <= 0;
          
          const playResult = {
            type: 'cards_played',
            playerId,
            playedCards,
            totalDamage,
            newOpponentHp: opponent.hp,
            remainingHand: currentPlayer.hand,
            gameOver,
            round: room.round
          };
          
          broadcastToRoom(room, playResult);
          
          if (gameOver) {
            room.status = 'waiting';
            broadcastToRoom(room, {
              type: 'game_over',
              winnerId: playerId,
              winnerName: currentPlayer.name,
              totalRounds: room.round
            });
            
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'room_list_update',
                  rooms: getPublicRoomList()
                }));
              }
            });
          }
          break;
        }

        case 'end_turn': {
          if (!currentRoomId || !playerId) return;
          
          const room = rooms.get(currentRoomId);
          if (!room || room.status !== 'playing') return;
          
          const currentPlayer = room.players.find(p => p.id === playerId);
          if (!currentPlayer || !currentPlayer.isTurn) return;
          
          room.currentTurn = (room.currentTurn + 1) % 2;
          room.round++;
          
          room.players.forEach((player, index) => {
            player.isTurn = index === room.currentTurn;
          });
          
          const nextPlayer = room.players[room.currentTurn];
          const newCard = generateCard();
          nextPlayer.hand.push(newCard);
          
          broadcastToRoom(room, {
            type: 'turn_ended',
            newTurnPlayerId: nextPlayer.id,
            newTurnPlayerName: nextPlayer.name,
            round: room.round,
            drawnCard: newCard,
            newHand: nextPlayer.hand
          });
          break;
        }

        case 'restart_game': {
          if (!currentRoomId || !playerId) return;
          
          const room = rooms.get(currentRoomId);
          if (!room) return;
          
          if (room.players.length === 2) {
            startGame(room);
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && playerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== playerId);
        
        if (room.players.length === 0) {
          rooms.delete(currentRoomId);
        } else {
          room.status = 'waiting';
          broadcastToRoom(room, {
            type: 'opponent_left'
          });
        }
        
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'room_list_update',
              rooms: getPublicRoomList()
            }));
          }
        });
      }
    }
  });
});

app.get('/api/rooms', (_req, res) => {
  res.json(getPublicRoomList());
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
