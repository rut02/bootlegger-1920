import { GameEngine } from './engine/gameState.js';
import { ThemeId } from '../shared/themes.js';

export class RoomManager {
  private rooms: Map<string, GameEngine> = new Map();
  // Map socketId -> { roomCode, playerId }
  private socketMap: Map<string, { roomCode: string; playerId: string }> = new Map();

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  public createRoom(themeId: ThemeId = 'mafia_1920'): GameEngine {
    const code = this.generateRoomCode();
    const game = new GameEngine(code, themeId);
    this.rooms.set(code, game);
    return game;
  }

  public getRoom(roomCode: string): GameEngine | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  public registerSocket(socketId: string, roomCode: string, playerId: string): void {
    this.socketMap.set(socketId, { roomCode: roomCode.toUpperCase(), playerId });
  }

  public getSocketMapping(socketId: string) {
    return this.socketMap.get(socketId);
  }

  public reconnectPlayer(socketId: string, roomCode: string, playerId: string): GameEngine | null {
    const game = this.getRoom(roomCode);
    if (!game) return null;

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return null;

    player.isConnected = true;
    player.isAfk = false;
    this.registerSocket(socketId, roomCode, playerId);
    game.addLog(`✅ ${player.name} เชื่อมต่อกลับเข้ามาแล้ว (ปิดระบบบอทแทน)`, 'info');
    return game;
  }

  public removePlayerFromRoom(socketId: string): { roomCode: string; playerId: string } | null {
    const mapping = this.socketMap.get(socketId);
    if (!mapping) return null;

    this.socketMap.delete(socketId);
    const room = this.rooms.get(mapping.roomCode);
    if (room) {
      room.removePlayer(mapping.playerId);
      const anyHuman = room.players.some((p) => p.isConnected && !p.isBot);
      if (!anyHuman) {
        this.rooms.delete(mapping.roomCode);
      }
    }
    return mapping;
  }

  public handleDisconnect(socketId: string): { roomCode: string; playerId: string } | null {
    const mapping = this.socketMap.get(socketId);
    if (!mapping) return null;

    this.socketMap.delete(socketId);
    const room = this.rooms.get(mapping.roomCode);
    if (room) {
      const player = room.players.find((p) => p.id === mapping.playerId);
      if (player) {
        player.isConnected = false;
        player.isAfk = true;
        room.addLog(`⚠️ ${player.name} ตัดการเชื่อมต่อ (AFK) — บอท AI เข้าเล่นแทนชั่วคราว`, 'alert');
        room.scheduleBotAction();
      }

      // If room has no active humans and still in lobby, clean up after delay
      const anyHuman = room.players.some((p) => p.isConnected && !p.isBot);
      if (!anyHuman && room.phase === 'LOBBY') {
        setTimeout(() => {
          const stillAnyHuman = room.players.some((p) => p.isConnected && !p.isBot);
          if (!stillAnyHuman && room.phase === 'LOBBY') {
            this.rooms.delete(mapping.roomCode);
          }
        }, 60000);
      }
    }

    return mapping;
  }
}
