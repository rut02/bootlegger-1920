import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, LegalGoodsType, PublicGameState } from '../shared/types.js';
import { THEMES, ThemeId } from '../shared/themes.js';
import { LobbyView } from './components/LobbyView.js';
import { CardItem } from './components/CardItem.js';
import { CrateView } from './components/CrateView.js';
import { WarehouseView } from './components/WarehouseView.js';
import { BribeModal } from './components/BribeModal.js';
import { InspectionRevealModal } from './components/InspectionRevealModal.js';
import { InspectionSuspenseModal } from './components/InspectionSuspenseModal.js';
import { GameOverModal } from './components/GameOverModal.js';
import { HandDragZone } from './components/HandDragZone.js';
import { MarketDrawPicker } from './components/MarketDrawPicker.js';
import { RulesModal } from './components/RulesModal.js';
import { TabletopBoard } from './components/TabletopBoard.js';
import { sounds } from './utils/audio.js';
import { saveSession, getSession, clearSession } from './utils/session.js';
import { getTranslation, Language } from './utils/i18n.js';

export const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('th');

  // Client Selection State
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [declaredType, setDeclaredType] = useState<LegalGoodsType>('apples');
  const [discardPileChoice, setDiscardPileChoice] = useState<'left' | 'right'>('left');
  const [drawSourceChoice, setDrawSourceChoice] = useState<'deck' | 'left' | 'right'>('deck');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isStealthMode, setIsStealthMode] = useState<boolean>(false);
  const [boardViewMode, setBoardViewMode] = useState<'tabletop' | 'grid'>('tabletop');

  // Universal Bribe prompt state
  const [bribeTargetPlayerId, setBribeTargetPlayerId] = useState<string | null>(null);
  const [showMyWarehouseModal, setShowMyWarehouseModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  useEffect(() => {
    const backendUrl = window.location.port === '5173' ? 'http://localhost:3001' : '/';
    const s = io(backendUrl);

    s.on('connect', () => {
      console.log('Connected to socket server');
      // Auto-reconnect if session exists
      const saved = getSession();
      if (saved) {
        s.emit('reconnect_session', { roomCode: saved.roomCode, playerId: saved.playerId });
      }
    });

    s.on('room_created', ({ roomCode, playerId }) => {
      setMyPlayerId(playerId);
      saveSession({ roomCode, playerId, playerName: '', avatar: '' });
    });

    s.on('room_joined', ({ roomCode, playerId }) => {
      setMyPlayerId(playerId);
      saveSession({ roomCode, playerId, playerName: '', avatar: '' });
    });

    s.on('room_reconnected', ({ roomCode, playerId }) => {
      setMyPlayerId(playerId);
    });

    s.on('session_expired', () => {
      clearSession();
      setGameState(null);
      setMyPlayerId(null);
      setErrorMessage('เซสชันห้องหมดอายุหรือเซิร์ฟเวอร์รีสตาร์ท กรุณาสร้างหรือเข้าร่วมห้องใหม่');
    });

    s.on('game_state', (state: PublicGameState) => {
      setGameState(state);
      setErrorMessage(null);
    });

    s.on('error_message', (msg: string) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
  };

  const handleToggleSelectCard = (cardId: string) => {
    sounds.playCoin();
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // Socket Actions
  const handleCreateRoom = (playerName: string, avatar: string, themeId: ThemeId) => {
    socket?.emit('create_room', { playerName, avatar, themeId });
  };

  const handleJoinRoom = (roomCode: string, playerName: string, avatar: string) => {
    socket?.emit('join_room', { roomCode, playerName, avatar });
  };

  const handleSetTheme = (themeId: ThemeId) => {
    if (gameState) {
      socket?.emit('set_theme', { roomCode: gameState.roomCode, themeId });
    }
  };

  const handleAddBot = () => {
    if (gameState) {
      socket?.emit('add_bot', { roomCode: gameState.roomCode });
    }
  };

  const handleStartGame = (roundsPerPlayer: number) => {
    if (gameState) {
      socket?.emit('start_game', { roomCode: gameState.roomCode, roundsPerPlayer });
    }
  };

  const handleSequentialMarketAction = () => {
    if (gameState && myPlayerId) {
      sounds.playCrate();
      socket?.emit('market_action', {
        roomCode: gameState.roomCode,
        playerId: myPlayerId,
        discardIds: selectedCardIds,
        discardPile: discardPileChoice,
        drawSource: drawSourceChoice,
      });
      setSelectedCardIds([]);
    }
  };

  const handleMarketDiscard = (discardIds: string[], pile: 'left' | 'right') => {
    if (gameState && myPlayerId) {
      sounds.playCrate();
      socket?.emit('market_discard', {
        roomCode: gameState.roomCode,
        playerId: myPlayerId,
        discardIds,
        discardPile: pile,
      });
      setSelectedCardIds([]);
    }
  };

  const handleMarketSplitDiscard = (leftCardIds: string[], rightCardIds: string[]) => {
    if (gameState && myPlayerId) {
      sounds.playCrate();
      socket?.emit('market_split_discard', {
        roomCode: gameState.roomCode,
        playerId: myPlayerId,
        leftCardIds,
        rightCardIds,
      });
      setSelectedCardIds([]);
    }
  };

  const handleMarketDrawSingle = (source: 'deck' | 'left' | 'right') => {
    if (gameState && myPlayerId) {
      sounds.playFlip();
      socket?.emit('market_draw_single', {
        roomCode: gameState.roomCode,
        playerId: myPlayerId,
        source,
      });
    }
  };

  const handleMarketAutoDrawFill = () => {
    if (gameState && myPlayerId) {
      socket?.emit('market_auto_draw_fill', {
        roomCode: gameState.roomCode,
        playerId: myPlayerId,
      });
    }
  };

  const handleMarketSkipDiscard = () => {
    if (gameState && myPlayerId) {
      sounds.playCrate();
      socket?.emit('market_discard', {
        roomCode: gameState.roomCode,
        playerId: myPlayerId,
        discardIds: [],
        discardPile: 'left',
      });
      setSelectedCardIds([]);
    }
  };

  const handleMarketSetAside = (discardIds: string[]) => {
    if (gameState && myPlayerId) {
      sounds.playCrate();
      socket?.emit('market_set_aside', {
        roomCode: gameState.roomCode,
        playerId: myPlayerId,
        discardIds,
      });
      setSelectedCardIds([]);
    }
  };

  const handleMarketFinalizeDiscards = (leftCardIds: string[], rightCardIds: string[]) => {
    if (gameState && myPlayerId) {
      sounds.playCrate();
      socket?.emit('market_finalize_discards', {
        roomCode: gameState.roomCode,
        playerId: myPlayerId,
        leftCardIds,
        rightCardIds,
      });
    }
  };

  const handlePackCrate = (cardIds?: string[], decType?: LegalGoodsType, count?: number) => {
    if (gameState && myPlayerId) {
      sounds.playCrate();
      const idsToPack = cardIds && cardIds.length > 0 ? cardIds : selectedCardIds;
      const countToDeclare = count !== undefined ? count : idsToPack.length;
      socket?.emit('pack_crate', {
        roomCode: gameState.roomCode,
        playerId: myPlayerId,
        cardIds: idsToPack,
        declaredType: decType,
        declaredCount: countToDeclare,
      });
      setSelectedCardIds([]);
    }
  };

  const handleDeclareGoods = (typeToDeclare?: LegalGoodsType) => {
    if (gameState && myPlayerId) {
      sounds.playStamp();
      const finalType = typeToDeclare || declaredType;
      socket?.emit('declare_goods', {
        roomCode: gameState.roomCode,
        playerId: myPlayerId,
        declaredType: finalType,
      });
    }
  };

  const handleOfferUniversalBribe = (
    targetPlayerId: string,
    intent: 'inspect' | 'pass',
    cash: number,
    message: string
  ) => {
    if (gameState && myPlayerId) {
      socket?.emit('universal_bribe', {
        roomCode: gameState.roomCode,
        fromPlayerId: myPlayerId,
        targetPlayerId,
        intent,
        cash,
        message,
      });
    }
  };

  const handleOfferQuickBribe = (targetPlayerId: string, cash: number) => {
    const isTargetingSelf = targetPlayerId === myPlayerId;
    const intent = isTargetingSelf ? 'pass' : 'inspect';
    const message = isTargetingSelf ? 'สินบนขอผ่านทางด่วน' : 'สินบนขอให้ช่วยตรวจค้นคนนี้';
    handleOfferUniversalBribe(targetPlayerId, intent, cash, message);
  };

  const handleSelectInspectTarget = (targetId: string) => {
    if (gameState && me?.isInspector) {
      socket?.emit('set_inspect_target', {
        roomCode: gameState.roomCode,
        targetId,
      });
    }
  };

  const handleResolveInspection = (actionOrTarget: any, maybeAction?: any, acceptedBribeId?: string) => {
    if (gameState) {
      const action = typeof maybeAction === 'string'
        ? (maybeAction === 'inspect' ? 'inspected' : 'passed')
        : (actionOrTarget === 'inspect' ? 'inspected' : actionOrTarget);
      const bribeId = typeof maybeAction === 'string' ? acceptedBribeId : maybeAction;
      socket?.emit('resolve_inspection', {
        roomCode: gameState.roomCode,
        action,
        acceptedBribeId: bribeId,
      });
    }
  };

  const handleResumeNextTarget = () => {
    if (gameState) {
      socket?.emit('resume_next_target', { roomCode: gameState.roomCode });
    }
  };

  const handleNextRound = () => {
    if (gameState) {
      socket?.emit('next_round', { roomCode: gameState.roomCode });
    }
  };

  const handleTogglePlayerAfk = (targetPlayerId: string) => {
    if (gameState && socket) {
      socket.emit('toggle_player_afk', {
        roomCode: gameState.roomCode,
        targetPlayerId,
      });
    }
  };

  const handleLeaveRoom = () => {
    socket?.emit('leave_room');
    clearSession();
    setGameState(null);
    setMyPlayerId(null);
    setSelectedCardIds([]);
  };

  // Find My Player and Inspector
  const me = gameState?.players.find((p) => p.id === myPlayerId);
  const inspector = gameState?.players.find((p) => p.isInspector);
  const targetPlayer = gameState?.players.find(
    (p) => p.id === (bribeTargetPlayerId || gameState.activeInspectTargetId)
  );
  const activeMarketPlayer = gameState?.players.find((p) => p.id === gameState.activeMarketPlayerId);

  const activeTheme = gameState ? THEMES[gameState.themeId] || THEMES.mafia_1920 : THEMES.mafia_1920;

  // If outside or in lobby
  if (!gameState || gameState.phase === 'LOBBY') {
    return (
      <main className="min-h-screen py-10 px-4 flex flex-col justify-center items-center">
        {errorMessage && (
          <div className="mb-4 bg-rose-950 border border-rose-600 text-rose-200 px-4 py-2 rounded-xl text-xs shadow-lg animate-bounce">
            {errorMessage}
          </div>
        )}
        <LobbyView
          roomCode={gameState?.roomCode || null}
          themeId={gameState?.themeId || 'mafia_1920'}
          players={gameState?.players || []}
          myPlayerId={myPlayerId}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onSetTheme={handleSetTheme}
          onAddBot={handleAddBot}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
        />
      </main>
    );
  }

  // Active Game Board
  const isTabletop = boardViewMode === 'tabletop';

  return (
    <div
      className={`text-vintage-paper ${
        isTabletop
          ? 'h-screen max-h-screen min-h-[560px] overflow-hidden flex flex-col justify-between bg-[#080402]'
          : 'min-h-screen flex flex-col justify-between pb-4'
      }`}
    >
      {/* 1. Header Navigation */}
      <header className={`bg-vintage-card/90 border-b border-vintage-gold/30 px-3 flex items-center justify-between shadow-md shrink-0 ${isTabletop ? 'py-1.5' : 'py-2.5'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{gameState.themeId === 'bang_rajan' ? '⚔️' : '🥃'}</span>
          <div>
            <h1 className="font-bold text-sm sm:text-base font-vintage gold-gradient-text leading-tight">
              {activeTheme.name}
            </h1>
            <span className="text-[10px] text-vintage-paper/50">
              ห้อง: <strong className="text-vintage-gold">{gameState.roomCode}</strong> | รอบที่ {gameState.currentRound}/{gameState.totalRounds}
            </span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          {inspector && (
            <div className="flex items-center gap-1.5 bg-blue-950/80 border border-blue-600/60 px-2.5 py-1 rounded-full text-xs">
              <span>👮</span>
              <span className="text-blue-300 font-bold">
                {activeTheme.inspectorTitle.split(' ')[0]}: {inspector.name} {inspector.id === myPlayerId ? '(คุณ)' : ''}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold border border-vintage-gold/60 bg-gradient-to-r from-vintage-gold/20 to-amber-600/20 text-vintage-gold hover:bg-vintage-gold/30 transition-all flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
            title="คลิกเพื่อดูกฎการเล่นและวิธีการนับคะแนน"
          >
            <span>📜</span>
            <span className="hidden sm:inline">กติกา & วิธีคิดคะแนน</span>
            <span className="sm:hidden">กติกา</span>
          </button>

          <button
            type="button"
            onClick={() => setBoardViewMode(boardViewMode === 'tabletop' ? 'grid' : 'tabletop')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 shadow-sm cursor-pointer active:scale-95 ${
              boardViewMode === 'tabletop'
                ? 'bg-amber-950/80 border-vintage-gold text-amber-300 font-["Press_Start_2P",monospace] text-[9px]'
                : 'bg-black/40 border-white/20 text-vintage-paper/80'
            }`}
            title="สลับมุมมองระหว่าง โต๊ะบอร์ดเกม 16-bit กับมุมมองตาราง"
          >
            <span>{boardViewMode === 'tabletop' ? '🎲 โต๊ะ 16-BIT' : '📋 ตาราง'}</span>
          </button>

          <button
            onClick={() => setIsStealthMode(!isStealthMode)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
              isStealthMode
                ? 'bg-amber-950 border-vintage-gold text-amber-300 ring-2 ring-amber-400 shadow-md'
                : 'bg-black/40 border-white/10 text-vintage-paper/70 hover:border-vintage-gold/50'
            }`}
            title={isStealthMode ? 'แสดงการ์ด' : 'ซ่อนการ์ด'}
          >
            <span>{isStealthMode ? '🙈' : '👁️'}</span>
            <span>ซ่อน</span>
          </button>

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-black/40 border border-white/10 text-xs hover:border-vintage-gold/50"
            title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          <button
            onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
            className="text-xs px-2.5 py-1 rounded-lg bg-vintage-gold/20 border border-vintage-gold/60 text-vintage-gold hover:bg-vintage-gold/30 font-bold"
            title="สลับภาษา (Switch Language)"
          >
            {language === 'th' ? '🇹🇭 TH' : '🇬🇧 EN'}
          </button>

          <button
            onClick={handleLeaveRoom}
            className="text-[10px] px-2 py-1 rounded bg-rose-950 border border-rose-700/60 text-rose-200 hover:bg-rose-900"
          >
            {language === 'th' ? 'ออกจากห้อง' : 'Leave'}
          </button>
        </div>
      </header>

      {/* 2. Phase Instruction Banner (Shown in Grid view, omitted in Tabletop view to maximize felt table space) */}
      {!isTabletop && (
        <div className="bg-gradient-to-r from-[#201c18] via-[#322519] to-[#201c18] border-b border-vintage-gold/20 py-2 px-4 text-center text-xs shrink-0">
          {gameState.phase === 'MARKET' && (
            <span className="text-amber-200">
              🛒 <strong>ตลาดสินค้าตามลำดับ:</strong>{' '}
              {gameState.activeMarketPlayerId === myPlayerId ? (
                <strong className="text-vintage-gold underline">ถึงตาของคุณแล้ว! เลือกทิ้งการ์ดและเลือกหยิบการ์ด</strong>
              ) : (
                <span>กำลังรอ {activeMarketPlayer?.name} เลือกเปลี่ยนการ์ดที่ตลาด...</span>
              )}
            </span>
          )}
          {gameState.phase === 'LOADING' && (
            <span className="text-amber-200">
              📦 <strong>เฟสจัดของขึ้นรถ:</strong> แอบเลือกการ์ด 1–5 ใบใส่ {activeTheme.crateTitle} ของคุณ
            </span>
          )}
          {gameState.phase === 'DECLARATION' && (
            <span className="text-amber-200">
              🗣️ <strong>เฟสแจ้งสินค้า:</strong> สบตา {activeTheme.inspectorTitle.split(' ')[0]} แล้วประกาศสินค้าถูกกฎหมาย 1 ชนิด
            </span>
          )}
          {gameState.phase === 'NEGOTIATION' && (
            <span className="text-amber-200">
              🤝 <strong>เฟสเจรจา & สินบนรอบวง:</strong> ทุกคนสามารถยื่นสินบนเชียร์ตรวจคู่แข่ง หรือติดสินบนให้นายอำเภอปล่อยผ่านได้!
            </span>
          )}
          {gameState.phase === 'INSPECTING' && (
            <span className="text-rose-300 font-bold animate-pulse">
              🔍 <strong>กำลังเปิดตรวจค้น:</strong> สารวัตรกำลังปลดล็อกตรวจการ์ดทีละใบ...
            </span>
          )}
          {gameState.phase === 'ROUND_END' && (
            <span className="text-amber-200">
              🏁 <strong>จบรอบที่ {gameState.currentRound}:</strong> ตรวจครบทุกคนแล้ว พร้อมเริ่มรอบถัดไป
            </span>
          )}
        </div>
      )}

      {/* 3. Main Center Area (Expanded widescreen width up to 1920px without side margins) */}
      <main className={`flex-1 w-full max-w-[1920px] mx-auto min-h-0 flex flex-col ${isTabletop ? 'p-1 sm:p-2 overflow-hidden' : 'p-2 sm:p-4 space-y-4'}`}>
        {boardViewMode === 'tabletop' ? (
          /* Tabletop Virtual Board Mode (16-bit Pixel Art) */
          <div className="h-full flex-1 flex flex-col min-h-0">
            <TabletopBoard
              gameState={gameState}
              myPlayerId={myPlayerId || ''}
              selectedCardIds={selectedCardIds}
              onToggleSelect={handleToggleSelectCard}
              onSelectMultiple={setSelectedCardIds}
              onSelectInspectTarget={handleSelectInspectTarget}
              onOpenBribePrompt={(id) => setBribeTargetPlayerId(id)}
              onMarketDiscard={handleMarketDiscard}
              onMarketSplitDiscard={handleMarketSplitDiscard}
              onMarketSetAside={handleMarketSetAside}
              onMarketFinalizeDiscards={handleMarketFinalizeDiscards}
              onMarketDrawSingle={handleMarketDrawSingle}
              onMarketAutoFill={handleMarketAutoDrawFill}
              onMarketSkipDiscard={handleMarketSkipDiscard}
              onPackCrate={handlePackCrate}
              onResolveInspection={handleResolveInspection}
              onNextRound={handleNextRound}
              onOfferBribe={handleOfferQuickBribe}
              onOfferUniversalBribe={handleOfferUniversalBribe}
              declaredType={declaredType}
              setDeclaredType={setDeclaredType}
              onDeclareGoods={handleDeclareGoods}
              isStealthMode={isStealthMode}
              onToggleStealthMode={() => setIsStealthMode(!isStealthMode)}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              onOpenRules={() => setShowRulesModal(true)}
              onOpenWarehouse={() => setShowMyWarehouseModal(true)}
              language={language}
              onToggleLanguage={() => setLanguage(language === 'th' ? 'en' : 'th')}
              onTogglePlayerAfk={handleTogglePlayerAfk}
            />
          </div>
        ) : (
          /* Classic Grid View Mode */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Left Column: Live Logs & Discard Piles */}
            <div className="lg:col-span-1 space-y-4">
              {/* Deck & Discard Piles */}
              <div className="vintage-box rounded-xl p-3 border border-vintage-gold/30">
                <h3 className="text-xs font-bold text-vintage-gold mb-2 flex items-center justify-between">
                  <span>🃏 กองการ์ดส่วนกลาง</span>
                  <span className="text-[10px] text-vintage-paper/50">เหลือ {gameState.drawDeckCount} ใบ</span>
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  {/* Left Discard */}
                  <div
                    onClick={() => {
                      setDiscardPileChoice('left');
                      setDrawSourceChoice('left');
                    }}
                    className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                      discardPileChoice === 'left' ? 'bg-amber-950/40 border-vintage-gold shadow-md' : 'bg-black/30 border-white/10'
                    }`}
                  >
                    <span className="text-[10px] text-vintage-paper/60 block mb-1">
                      กองทิ้งซ้าย (หงายหน้า {gameState.discardPiles.leftCount})
                    </span>
                    {gameState.discardPiles.leftTop ? (
                      <div className="text-xs font-bold text-emerald-300">
                        {gameState.discardPiles.leftTop.icon} {gameState.discardPiles.leftTop.name}
                      </div>
                    ) : (
                      <span className="text-xs text-white/30">ว่างเปล่า</span>
                    )}
                  </div>

                  {/* Right Discard */}
                  <div
                    onClick={() => {
                      setDiscardPileChoice('right');
                      setDrawSourceChoice('right');
                    }}
                    className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                      discardPileChoice === 'right' ? 'bg-amber-950/40 border-vintage-gold shadow-md' : 'bg-black/30 border-white/10'
                    }`}
                  >
                    <span className="text-[10px] text-vintage-paper/60 block mb-1">
                      กองทิ้งขวา (หงายหน้า {gameState.discardPiles.rightCount})
                    </span>
                    {gameState.discardPiles.rightTop ? (
                      <div className="text-xs font-bold text-emerald-300">
                        {gameState.discardPiles.rightTop.icon} {gameState.discardPiles.rightTop.name}
                      </div>
                    ) : (
                      <span className="text-xs text-white/30">ว่างเปล่า</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Logs */}
              <div className="vintage-box rounded-xl p-3 border border-vintage-gold/30">
                <h3 className="text-xs font-bold text-vintage-gold mb-2">📜 ข่าวกรอง & บันทึกเหตุการณ์</h3>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-[11px]">
                  {gameState.logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-1.5 rounded ${
                        log.type === 'bribe'
                          ? 'bg-amber-950/50 text-amber-200 border-l-2 border-amber-500'
                          : log.type === 'fine'
                          ? 'bg-rose-950/50 text-rose-200 border-l-2 border-rose-500'
                          : log.type === 'pass'
                          ? 'bg-emerald-950/50 text-emerald-200 border-l-2 border-emerald-500'
                          : 'bg-black/20 text-vintage-paper/80'
                      }`}
                    >
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center/Right Column: Other Players, Crates, and Active Interaction */}
            <div className="lg:col-span-3 space-y-4">
              {/* All Players & Their Crates / Warehouses (My Player First with Golden Aura) */}
              {(() => {
                const allPlayersOrdered = [
                  ...(me ? [me] : []),
                  ...gameState.players.filter((p) => p.id !== myPlayerId),
                ];

                return (
                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 ${
                      allPlayersOrdered.length >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
                    } gap-3`}
                  >
                    {allPlayersOrdered.map((p) => {
                      const isMe = p.id === myPlayerId;
                      return (
                        <div
                          key={p.id}
                          className={`space-y-2 rounded-2xl transition-all ${
                            isMe
                              ? 'p-2 bg-gradient-to-b from-vintage-gold/15 via-amber-950/20 to-black/40 border-2 border-vintage-gold ring-2 ring-vintage-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                              : ''
                          }`}
                        >
                          {/* Highlight Header Banner for Current Player */}
                          {isMe && (
                            <div className="flex items-center justify-between px-2.5 py-1 bg-gradient-to-r from-vintage-gold/30 via-amber-700/20 to-transparent rounded-lg border border-vintage-gold/40 mb-1">
                              <span className="text-xs font-bold text-vintage-gold flex items-center gap-1.5">
                                <span>👑</span>
                                <span>แผงค้าและโกดังของคุณ ({p.name})</span>
                              </span>
                              <span className="text-[10px] text-amber-300 font-bold bg-black/60 px-2 py-0.5 rounded-full border border-vintage-gold/40">
                                หน้าจอของคุณ
                              </span>
                            </div>
                          )}

                          <CrateView
                            crate={p.crate}
                            player={p}
                            themeId={gameState.themeId}
                            bribeOffers={gameState.bribeOffers}
                            isInspector={Boolean(me?.isInspector)}
                            isTarget={p.id === gameState.activeInspectTargetId}
                            onSelectTarget={
                              isMe || !me?.isInspector ? undefined : () => handleSelectInspectTarget(p.id)
                            }
                            onOpenBribePrompt={isMe ? undefined : (id) => setBribeTargetPlayerId(id)}
                          />
                          <WarehouseView
                            warehouse={p.warehouse}
                            isOwner={isMe}
                            playerName={isMe ? `${p.name} (ของคุณ)` : p.name}
                            themeId={gameState.themeId}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Interactive Step-by-Step Market Draw Picker */}
              {gameState.phase === 'MARKET' && myPlayerId === gameState.activeMarketPlayerId && me?.hand && me.hand.length < 6 && (
                <MarketDrawPicker
                  cardsNeeded={6 - me.hand.length}
                  drawDeckCount={gameState.drawDeckCount}
                  leftTop={gameState.discardPiles.leftTop}
                  rightTop={gameState.discardPiles.rightTop}
                  leftCount={gameState.discardPiles.leftCount}
                  rightCount={gameState.discardPiles.rightCount}
                  onDrawSingle={handleMarketDrawSingle}
                  onAutoFill={handleMarketAutoDrawFill}
                />
              )}

              {/* Universal Negotiation & Bribe Action Box */}
              {gameState.phase === 'NEGOTIATION' && targetPlayer && inspector && (
                <BribeModal
                  bribeOffers={gameState.bribeOffers}
                  targetPlayer={targetPlayer}
                  inspector={inspector}
                  players={gameState.players}
                  myPlayerId={myPlayerId || ''}
                  onOfferBribe={handleOfferUniversalBribe}
                  onResolveInspection={handleResolveInspection}
                />
              )}

              {/* Round End Next Round Button */}
              {gameState.phase === 'ROUND_END' && me?.isInspector && (
                <div className="vintage-box rounded-xl p-4 text-center border-2 border-vintage-gold">
                  <h3 className="font-bold text-vintage-gold mb-2">
                    ตรวจค้นครบทุกคนแล้วในรอบนี้
                  </h3>
                  <button
                    onClick={() => {
                      sounds.playCrate();
                      handleNextRound();
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-vintage-gold to-amber-600 font-bold text-vintage-dark rounded-xl shadow-lg hover:scale-105 transition-all"
                  >
                    เริ่มรอบถัดไป ➔
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 4. Bottom Dock: My Hand, Actions & Warehouse (For Classic Grid View) */}
      {me && boardViewMode === 'grid' && (
        <footer className="bg-black/95 border-t-2 border-vintage-gold/50 p-4 shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            {/* My Info & Stats */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{me.avatar}</span>
                <div>
                  <div className="font-bold text-sm text-vintage-gold flex items-center gap-1">
                    <span>{me.name}</span>
                    {me.isInspector && (
                      <span className="text-[10px] bg-blue-900 px-1.5 py-0.5 rounded text-blue-200 font-bold">
                        {activeTheme.inspectorTitle.split(' ')[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-emerald-400 font-bold">
                      💵 เงินสด: \${me.cash}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMyWarehouseModal(true)}
                      className="text-[11px] font-bold px-2 py-0.5 rounded bg-vintage-gold/20 hover:bg-vintage-gold/30 border border-vintage-gold/50 text-vintage-gold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="คลิกเพื่อเปิดดูรายละเอียดสินค้าในคลังของคุณ"
                    >
                      <span>🏛️ ในโกดัง: {Object.values(me.warehouse.legal).reduce((sum, arr) => sum + arr.length, 0) + me.warehouse.contrabandCount} ชิ้น</span>
                      {me.warehouse.contrabandCount > 0 && (
                        <span className="text-[10px] bg-rose-950 px-1 rounded text-rose-300 border border-rose-800 font-mono">
                          ☠️{me.warehouse.contrabandCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Controls depending on Phase */}
              <div className="flex items-center gap-2">
                {/* Market Phase: Only for active market player */}
                {gameState.phase === 'MARKET' && !me.isInspector && (
                  myPlayerId === gameState.activeMarketPlayerId ? (
                    me.hand && me.hand.length === 6 ? (
                      <div className="flex items-center gap-2 bg-amber-950/60 p-2 rounded-xl border border-amber-600/50">
                        <button
                          disabled={selectedCardIds.length === 0}
                          onClick={() => handleMarketDiscard(selectedCardIds, 'left')}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs shadow transition-all ${
                            selectedCardIds.length > 0
                              ? 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100 cursor-pointer active:scale-95'
                              : 'bg-white/10 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          ทิ้งลงกองซ้าย ({selectedCardIds.length} ใบ)
                        </button>
                        <button
                          disabled={selectedCardIds.length === 0}
                          onClick={() => handleMarketDiscard(selectedCardIds, 'right')}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs shadow transition-all ${
                            selectedCardIds.length > 0
                              ? 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100 cursor-pointer active:scale-95'
                              : 'bg-white/10 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          ทิ้งลงกองขวา ({selectedCardIds.length} ใบ)
                        </button>
                        <button
                          onClick={() => handleMarketDiscard([], 'left')}
                          className="px-2.5 py-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-vintage-paper/80 font-bold text-xs border border-white/20 active:scale-95"
                        >
                          ไม่ทิ้ง (ผ่านตา)
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-300 font-bold bg-amber-950/80 px-3 py-1.5 rounded-xl border border-amber-500 animate-pulse">
                        🃏 เลือกหยิบการ์ดด้านบนอีก {6 - (me.hand?.length || 0)} ใบ
                      </div>
                    )
                  ) : (
                    <div className="text-xs text-vintage-paper/50 italic px-2">
                      (รอถึงตาของคุณในตลาด: {activeMarketPlayer?.name})
                    </div>
                  )
                )}

                {gameState.phase === 'LOADING' && !me.isInspector && !me.hasPackedCrate && (
                  <button
                    disabled={selectedCardIds.length < 1 || selectedCardIds.length > 5}
                    onClick={handlePackCrate}
                    className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all ${
                      selectedCardIds.length >= 1 && selectedCardIds.length <= 5
                        ? 'bg-gradient-to-r from-vintage-gold to-amber-600 text-vintage-dark cursor-pointer active:scale-95'
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    ล็อกของใส่เกวียน ({selectedCardIds.length}/5 ชิ้น)
                  </button>
                )}

                {gameState.phase === 'DECLARATION' && !me.isInspector && !me.hasDeclared && me.crate && (
                  <div className="flex items-center gap-2">
                    <select
                      value={declaredType}
                      onChange={(e) => setDeclaredType(e.target.value as LegalGoodsType)}
                      className="bg-black/60 border border-vintage-gold/50 rounded-lg px-2.5 py-1.5 text-xs text-vintage-gold"
                    >
                      {Object.entries(activeTheme.legalGoods).map(([key, item]) => (
                        <option key={key} value={key}>
                          {item.icon} {item.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleDeclareGoods}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-xs shadow-md active:scale-95"
                    >
                      ประกาศแจ้งยอด
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* My Hand of Cards with LoR-style Multi-Card Drag & Stealth Mode */}
            <div className="w-full md:w-auto overflow-x-auto pb-1 flex justify-center">
              {me.hand && me.hand.length > 0 ? (
                <HandDragZone
                  cards={me.hand}
                  selectedCardIds={selectedCardIds}
                  isLocked={Boolean(me.isInspector || me.hasPackedCrate)}
                  themeCrateTitle={activeTheme.crateTitle}
                  isStealthMode={isStealthMode}
                  onToggleSelect={handleToggleSelectCard}
                  onSelectMultiple={(ids) => setSelectedCardIds(ids)}
                  onDropIntoCrate={
                    gameState.phase === 'LOADING' && !me.isInspector && !me.hasPackedCrate
                      ? (cardIds) => {
                          sounds.playCrate();
                          socket?.emit('pack_crate', {
                            roomCode: gameState.roomCode,
                            playerId: myPlayerId,
                            cardIds,
                          });
                          setSelectedCardIds([]);
                        }
                      : undefined
                  }
                  onDropIntoDiscard={
                    gameState.phase === 'MARKET' && myPlayerId === gameState.activeMarketPlayerId && me.hand.length === 6
                      ? (cardIds, pile) => handleMarketDiscard(cardIds, pile)
                      : undefined
                  }
                />
              ) : (
                <div className="text-xs text-vintage-paper/40 py-6 text-center">
                  {me.isInspector ? 'คุณเป็นผู้คุมด่านในรอบนี้ ไม่ต้องจัดของขึ้นรถ' : 'ไม่มีการ์ดบนมือ'}
                </div>
              )}
            </div>
          </div>
        </footer>
      )}

      {/* 5. Suspenseful Inspection Reveal Animation Modal */}
      {gameState.phase === 'INSPECTING' && gameState.inspectionAnimation && (
        <InspectionSuspenseModal animation={gameState.inspectionAnimation} />
      )}

      {/* 6. Verdict Reveal Modal */}
      {gameState.lastInspectionResult && gameState.phase === 'INSPECTION_REVEAL' && (
        <InspectionRevealModal
          result={gameState.lastInspectionResult}
          isInspector={Boolean(me?.isInspector)}
          myPlayerId={myPlayerId || ''}
          onContinue={handleResumeNextTarget}
        />
      )}

      {/* 7. Game Over Modal */}
      {gameState.phase === 'GAME_OVER' && gameState.scores && (
        <GameOverModal
          scores={gameState.scores}
          onRestart={() => {
            clearSession();
            window.location.reload();
          }}
        />
      )}

      {/* 8. Quick My Warehouse Modal */}
      {showMyWarehouseModal && me && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="vintage-box rounded-2xl max-w-md w-full p-4 border-2 border-vintage-gold shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-vintage-gold/30">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏛️</span>
                <div>
                  <h3 className="font-bold text-vintage-gold text-base">
                    {activeTheme.warehouseTitle}: {me.name}
                  </h3>
                  <span className="text-xs text-vintage-paper/60">สินค้าสะสมของคุณทั้งหมดที่รอดเข้าเมือง</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMyWarehouseModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <WarehouseView
              warehouse={me.warehouse}
              isOwner={true}
              playerName={`${me.name} (ของคุณ)`}
              themeId={gameState.themeId}
            />

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMyWarehouseModal(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-vintage-gold to-amber-600 text-vintage-dark font-bold text-xs hover:scale-105 transition-all shadow-md cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Rules & Scoring Guide Modal */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        currentThemeId={gameState.themeId}
      />
    </div>
  );
};
