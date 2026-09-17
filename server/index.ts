import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './roomManager.js';
import { GameEngine } from './engine/gameState.js';
import { LegalGoodsType } from '../shared/types.js';
import { ThemeId } from '../shared/themes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();

// Serve static frontend in production if built
const clientDist = path.join(__dirname, '../dist');
app.use(express.static(clientDist));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

function broadcastState(game: GameEngine) {
  for (const player of game.players) {
    const sanitized = game.getSanitizedState(player.id);
    io.to(`player_${player.id}`).emit('game_state', sanitized);
  }
}

function setupGameHooks(game: GameEngine) {
  game.onStateChanged = () => {
    broadcastState(game);
  };
}

io.on('connection', (socket: Socket) => {
  // 1. Reconnect Session (When user refreshes page)
  socket.on('reconnect_session', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
    const game = roomManager.reconnectPlayer(socket.id, roomCode, playerId);
    if (game) {
      socket.join(`room_${game.roomCode}`);
      socket.join(`player_${playerId}`);
      setupGameHooks(game);
      socket.emit('room_reconnected', { roomCode: game.roomCode, playerId });
      broadcastState(game);
    } else {
      socket.emit('session_expired');
    }
  });

  // 2. Create Room with Theme
  socket.on(
    'create_room',
    ({ playerName, avatar, themeId }: { playerName: string; avatar: string; themeId?: ThemeId }) => {
      const selectedTheme: ThemeId = themeId === 'bang_rajan' ? 'bang_rajan' : 'mafia_1920';
      const game = roomManager.createRoom(selectedTheme);
      setupGameHooks(game);

      const player = game.addPlayer(
        playerName || (selectedTheme === 'bang_rajan' ? 'นายทองเหม็น' : 'Don Capone'),
        avatar || (selectedTheme === 'bang_rajan' ? '🗡️' : '🎩')
      );

      socket.join(`room_${game.roomCode}`);
      socket.join(`player_${player.id}`);
      roomManager.registerSocket(socket.id, game.roomCode, player.id);

      socket.emit('room_created', { roomCode: game.roomCode, playerId: player.id });
      broadcastState(game);
    }
  );

  // 3. Join Room
  socket.on(
    'join_room',
    ({ roomCode, playerName, avatar }: { roomCode: string; playerName: string; avatar: string }) => {
      const code = roomCode.trim().toUpperCase();
      const game = roomManager.getRoom(code);

      if (!game) {
        socket.emit('error_message', 'ไม่พบห้องรหัสนี้ กรุณาตรวจสอบรหัสห้องอีกครั้ง');
        return;
      }

      setupGameHooks(game);

      // Check for reconnect by name if disconnected
      let player = game.players.find((p) => p.name === playerName && !p.isConnected);
      if (player) {
        player.isConnected = true;
        game.addLog(`${player.name} เชื่อมต่อกลับเข้ามาแล้ว`, 'info');
      } else {
        if (game.phase !== 'LOBBY') {
          socket.emit('error_message', 'เกมในห้องนี้เริ่มต้นไปแล้ว ไม่สามารถเข้าร่วมใหม่ได้');
          return;
        }
        if (game.players.length >= 6) {
          socket.emit('error_message', 'ห้องนี้มีผู้เล่นเต็มแล้ว (สูงสุด 6 คน)');
          return;
        }
        player = game.addPlayer(playerName || 'คนขับเกวียน', avatar || '🚗');
      }

      socket.join(`room_${game.roomCode}`);
      socket.join(`player_${player.id}`);
      roomManager.registerSocket(socket.id, game.roomCode, player.id);

      socket.emit('room_joined', { roomCode: game.roomCode, playerId: player.id });
      broadcastState(game);
    }
  );

  // 4. Change Theme in Lobby
  socket.on('set_theme', ({ roomCode, themeId }: { roomCode: string; themeId: ThemeId }) => {
    const game = roomManager.getRoom(roomCode);
    if (!game || game.phase !== 'LOBBY') return;

    game.setTheme(themeId);
    broadcastState(game);
  });

  // 5. Add Bot
  socket.on('add_bot', ({ roomCode }: { roomCode: string }) => {
    const game = roomManager.getRoom(roomCode);
    if (!game || game.phase !== 'LOBBY' || game.players.length >= 6) return;

    const botSets =
      game.themeId === 'bang_rajan'
        ? [
            { name: 'นายจันหนวดเขี้ยว', avatar: '⚔️' },
            { name: 'นายแท่น', avatar: '🛡️' },
            { name: 'นายโชติ', avatar: '🏹' },
            { name: 'พันเรือง', avatar: '🐎' },
          ]
        : [
            { name: 'Lucky Luciano', avatar: '🕶️' },
            { name: 'Bugsy Siegel', avatar: '💼' },
            { name: 'Meyer Lansky', avatar: '🚬' },
            { name: 'Frank Costello', avatar: '🎲' },
          ];

    const usedNames = game.players.map((p) => p.name);
    const available = botSets.filter((b) => !usedNames.includes(b.name));
    const bot = available[0] || { name: `นักรบ AI ${game.players.length + 1}`, avatar: '🤖' };

    game.addPlayer(bot.name, bot.avatar, true);
    broadcastState(game);
  });

  // 6. Start Game
  socket.on('start_game', ({ roomCode, roundsPerPlayer }: { roomCode: string; roundsPerPlayer?: number }) => {
    const game = roomManager.getRoom(roomCode);
    if (!game) return;

    setupGameHooks(game);
    const success = game.startGame(roundsPerPlayer || 1);
    if (success) {
      broadcastState(game);
    } else {
      socket.emit('error_message', 'ต้องมีผู้เล่นอย่างน้อย 2 คนจึงจะเริ่มเกมได้');
    }
  });

  // 7. Sequential Market Action
  socket.on(
    'market_action',
    ({
      roomCode,
      playerId,
      discardIds,
      discardPile,
      drawSource,
    }: {
      roomCode: string;
      playerId: string;
      discardIds: string[];
      discardPile: 'left' | 'right';
      drawSource: 'deck' | 'left' | 'right';
    }) => {
      const game = roomManager.getRoom(roomCode);
      if (!game) return;

      const success = game.marketAction(playerId, discardIds, discardPile, drawSource);
      if (success) {
        broadcastState(game);
      }
    }
  );

  // 7.1 Granular Market Discard
  socket.on(
    'market_discard',
    ({
      roomCode,
      playerId,
      discardIds,
      discardPile,
    }: {
      roomCode: string;
      playerId: string;
      discardIds: string[];
      discardPile: 'left' | 'right';
    }) => {
      const game = roomManager.getRoom(roomCode);
      if (!game) return;

      const success = game.marketDiscard(playerId, discardIds, discardPile);
      if (success) {
        broadcastState(game);
      }
    }
  );

  // 7.1b Split Market Discard (selective cards to left vs right)
  socket.on(
    'market_split_discard',
    ({
      roomCode,
      playerId,
      leftCardIds,
      rightCardIds,
    }: {
      roomCode: string;
      playerId: string;
      leftCardIds: string[];
      rightCardIds: string[];
    }) => {
      const game = roomManager.getRoom(roomCode);
      if (!game) return;

      const success = game.marketSplitDiscard(playerId, leftCardIds || [], rightCardIds || []);
      if (success) {
        broadcastState(game);
      }
    }
  );

  // 7.1c Market Step 1: Set Aside Discards
  socket.on(
    'market_set_aside',
    ({
      roomCode,
      playerId,
      discardIds,
    }: {
      roomCode: string;
      playerId: string;
      discardIds: string[];
    }) => {
      const game = roomManager.getRoom(roomCode);
      if (!game) return;

      const success = game.marketSetAsideDiscards(playerId, discardIds || []);
      if (success) {
        broadcastState(game);
      }
    }
  );

  // 7.1d Market Step 3: Finalize and Distribute Set-Aside Discards
  socket.on(
    'market_finalize_discards',
    ({
      roomCode,
      playerId,
      leftCardIds,
      rightCardIds,
    }: {
      roomCode: string;
      playerId: string;
      leftCardIds: string[];
      rightCardIds: string[];
    }) => {
      const game = roomManager.getRoom(roomCode);
      if (!game) return;

      const success = game.marketFinalizeDiscards(playerId, leftCardIds || [], rightCardIds || []);
      if (success) {
        broadcastState(game);
      }
    }
  );

  // 7.2 Granular Market Draw Single Card
  socket.on(
    'market_draw_single',
    ({
      roomCode,
      playerId,
      source,
    }: {
      roomCode: string;
      playerId: string;
      source: 'deck' | 'left' | 'right';
    }) => {
      const game = roomManager.getRoom(roomCode);
      if (!game) return;

      const drawn = game.marketDrawSingle(playerId, source);
      if (drawn) {
        broadcastState(game);
      }
    }
  );

  // 7.3 Market Auto Draw Fill
  const handleAutoDrawFill = ({
    roomCode,
    playerId,
  }: {
    roomCode: string;
    playerId: string;
  }) => {
    const game = roomManager.getRoom(roomCode);
    if (!game) return;

    const success = game.marketAutoDrawFill(playerId);
    if (success) {
      broadcastState(game);
    }
  };
  socket.on('market_auto_draw_fill', handleAutoDrawFill);
  socket.on('market_auto_fill', handleAutoDrawFill);

  // 8. Pack Crate
  socket.on(
    'pack_crate',
    ({
      roomCode,
      playerId,
      cardIds,
      declaredType,
    }: {
      roomCode: string;
      playerId: string;
      cardIds: string[];
      declaredType?: LegalGoodsType;
    }) => {
      const game = roomManager.getRoom(roomCode);
      if (!game) return;

      const success = game.packCrate(playerId, cardIds, declaredType);
      if (success) {
        broadcastState(game);
      }
    }
  );

  // 9. Declare Goods
  socket.on(
    'declare_goods',
    ({ roomCode, playerId, declaredType }: { roomCode: string; playerId: string; declaredType: LegalGoodsType }) => {
      const game = roomManager.getRoom(roomCode);
      if (!game) return;

      const success = game.declareGoods(playerId, declaredType);
      if (success) {
        broadcastState(game);
      }
    }
  );

  // 10. Change Inspect Target
  socket.on('set_inspect_target', ({ roomCode, targetId }: { roomCode: string; targetId: string }) => {
    const game = roomManager.getRoom(roomCode);
    if (!game) return;

    const success = game.setActiveInspectTarget(targetId);
    if (success) {
      broadcastState(game);
    }
  });

  // 11. Universal Bribe (Anyone can bribe regarding any target)
  socket.on(
    'universal_bribe',
    ({
      roomCode,
      fromPlayerId,
      targetPlayerId,
      intent,
      cash,
      message,
    }: {
      roomCode: string;
      fromPlayerId: string;
      targetPlayerId: string;
      intent: 'inspect' | 'pass';
      cash: number;
      message: string;
    }) => {
      const game = roomManager.getRoom(roomCode);
      if (!game) return;

      const success = game.offerUniversalBribe(fromPlayerId, targetPlayerId, intent, cash, message);
      if (success) {
        broadcastState(game);
      }
    }
  );

  // 12. Resolve Inspection (Pass or Inspect with accepted bribe id)
  socket.on(
    'resolve_inspection',
    ({
      roomCode,
      action,
      acceptedBribeId,
    }: {
      roomCode: string;
      action: 'passed' | 'inspected';
      acceptedBribeId?: string;
    }) => {
      const game = roomManager.getRoom(roomCode);
      if (!game) return;

      const success = game.resolveInspection(action, acceptedBribeId);
      if (success) {
        broadcastState(game);
      }
    }
  );

  // 13. Resume Next Target
  socket.on('resume_next_target', ({ roomCode }: { roomCode: string }) => {
    const game = roomManager.getRoom(roomCode);
    if (!game) return;

    game.resumeNegotiationNextTarget();
    broadcastState(game);
  });

  // 14. Next Round
  socket.on('next_round', ({ roomCode }: { roomCode: string }) => {
    const game = roomManager.getRoom(roomCode);
    if (!game) return;

    game.endRoundAndAdvance();
    broadcastState(game);
  });

  // 15. Disconnect
  socket.on('disconnect', () => {
    const mapping = roomManager.handleDisconnect(socket.id);
    if (mapping) {
      const game = roomManager.getRoom(mapping.roomCode);
      if (game) {
        broadcastState(game);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🥃 Bootlegger & Bang Rajan Server listening on port ${PORT}`);
});
