import { v4 as uuidv4 } from 'uuid';
import { Room, Player, RoomInfo, CharacterCustomization, Bullet } from './types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(name: string, host: Player): Room {
    const roomId = uuidv4();
    const room: Room = {
      id: roomId,
      name,
      hostId: host.id,
      players: new Map(),
      bullets: [],
      maxPlayers: 4,
      gameState: 'waiting',
      winnerId: null,
      createdAt: Date.now(),
    };
    host.isHost = true;
    host.roomId = roomId;
    room.players.set(host.id, host);
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, player: Player): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.players.size >= room.maxPlayers) return null;
    if (room.gameState !== 'waiting') return null;

    player.isHost = false;
    player.roomId = roomId;
    room.players.set(player.id, player);
    return room;
  }

  leaveRoom(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players.delete(playerId);

    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    if (room.hostId === playerId) {
      const firstPlayer = Array.from(room.players.values())[0];
      room.hostId = firstPlayer.id;
      firstPlayer.isHost = true;
    }

    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomList(): RoomInfo[] {
    return Array.from(this.rooms.values())
      .filter((room) => room.gameState === 'waiting')
      .map((room) => {
        const host = room.players.get(room.hostId);
        return {
          id: room.id,
          name: room.name,
          hostName: host?.nickname || '未知',
          playerCount: room.players.size,
          maxPlayers: room.maxPlayers,
          gameState: room.gameState,
        };
      });
  }

  updatePlayerPosition(roomId: string, playerId: string, x: number, y: number, angle: number, velocityX: number, velocityY: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.get(playerId);
    if (!player || !player.isAlive) return false;

    player.x = x;
    player.y = y;
    player.angle = angle;
    player.velocityX = velocityX;
    player.velocityY = velocityY;
    return true;
  }

  addBullet(roomId: string, bullet: Bullet): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.gameState !== 'playing') return false;
    room.bullets.push(bullet);
    return true;
  }

  getPlayersArray(roomId: string): Player[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.players.values());
  }

  getPlayer(roomId: string, playerId: string): Player | undefined {
    const room = this.rooms.get(roomId);
    return room?.players.get(playerId);
  }

  playerHit(roomId: string, targetId: string, shooterId: string, damage: number): { target: Player; shooter: Player } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const target = room.players.get(targetId);
    const shooter = room.players.get(shooterId);

    if (!target || !shooter || !target.isAlive) return null;

    target.health -= damage;
    if (target.health <= 0) {
      target.health = 0;
      target.isAlive = false;
      shooter.kills += 1;
    }

    return { target, shooter };
  }

  checkGameEnd(roomId: string): { ended: boolean; winner?: Player } {
    const room = this.rooms.get(roomId);
    if (!room || room.gameState !== 'playing') return { ended: false };

    const alivePlayers = Array.from(room.players.values()).filter((p) => p.isAlive);

    if (alivePlayers.length <= 1) {
      room.gameState = 'ended';
      room.winnerId = alivePlayers[0]?.id || null;
      return { ended: true, winner: alivePlayers[0] };
    }

    return { ended: false };
  }

  startGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.size < 2) return false;

    room.gameState = 'playing';
    room.bullets = [];
    room.winnerId = null;

    const players = Array.from(room.players.values());
    const positions = [
      { x: 150, y: 150 },
      { x: 650, y: 150 },
      { x: 150, y: 450 },
      { x: 650, y: 450 },
    ];

    players.forEach((player, index) => {
      const pos = positions[index % positions.length];
      player.x = pos.x;
      player.y = pos.y;
      player.health = 3;
      player.maxHealth = 3;
      player.isAlive = true;
      player.kills = 0;
      player.angle = 0;
      player.velocityX = 0;
      player.velocityY = 0;
    });

    return true;
  }

  resetRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.gameState = 'waiting';
    room.bullets = [];
    room.winnerId = null;

    const players = Array.from(room.players.values());
    players.forEach((player) => {
      player.health = 3;
      player.maxHealth = 3;
      player.isAlive = true;
      player.kills = 0;
    });

    return true;
  }

  updateBullets(roomId: string, deltaTime: number): Bullet[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const bulletsToRemove: string[] = [];

    room.bullets.forEach((bullet) => {
      bullet.x += bullet.vx * deltaTime;
      bullet.y += bullet.vy * deltaTime;

      if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
        bulletsToRemove.push(bullet.id);
      }
    });

    room.bullets = room.bullets.filter((b) => !bulletsToRemove.includes(b.id));

    return room.bullets;
  }

  getBullets(roomId: string): Bullet[] {
    const room = this.rooms.get(roomId);
    return room?.bullets || [];
  }

  removeBullet(roomId: string, bulletId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.bullets = room.bullets.filter((b) => b.id !== bulletId);
  }
}

declare module './types' {
  interface Player {
    roomId?: string;
  }
}
