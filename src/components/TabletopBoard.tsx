import React, { useState, useRef, useEffect } from 'react';
import { PublicGameState, Player, LegalGoodsType, Card, BribeOffer } from '../../shared/types.js';
import { THEMES } from '../../shared/themes.js';
import { ModularCard } from './ModularCard.js';
import { HandDragZone } from './HandDragZone.js';
import { sounds } from '../utils/audio.js';

interface TabletopBoardProps {
  gameState: PublicGameState;
  myPlayerId: string;
  selectedCardIds?: string[];
  onToggleSelect?: (cardId: string) => void;
  onSelectMultiple?: (cardIds: string[]) => void;
  onSelectInspectTarget?: (targetId: string) => void;
  onOpenBribePrompt?: (targetId: string) => void;
  onMarketDiscard?: (cardIds: string[], pile: 'left' | 'right') => void;
  onMarketSplitDiscard?: (leftCardIds: string[], rightCardIds: string[]) => void;
  onMarketSetAside?: (discardIds: string[]) => void;
  onMarketFinalizeDiscards?: (leftCardIds: string[], rightCardIds: string[]) => void;
  onMarketDrawSingle?: (source: 'deck' | 'left' | 'right') => void;
  onMarketAutoFill?: () => void;
  onMarketSkipDiscard?: () => void;
  onPackCrate?: (cardIds: string[], declaredType: LegalGoodsType, declaredCount: number) => void;
  onDeclareGoods?: (declaredType: LegalGoodsType) => void;
  onResolveInspection?: (targetPlayerId: string, action: 'pass' | 'inspect', acceptedBribeId?: string) => void;
  onNextRound?: () => void;
  onOfferBribe?: (targetId: string, amount: number) => void;
  onOfferUniversalBribe?: (targetPlayerId: string, intent: 'inspect' | 'pass', cash: number, message: string) => void;
  declaredType?: LegalGoodsType;
  setDeclaredType?: (type: LegalGoodsType) => void;
  isStealthMode?: boolean;
  onToggleStealthMode?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onOpenRules?: () => void;
  onOpenWarehouse?: () => void;
}

const LEGAL_TYPES: { type: LegalGoodsType; name: string; icon: string; val: number }[] = [
  { type: 'flour', name: 'แป้ง', icon: '🌾', val: 3 },
  { type: 'apples', name: 'แอปเปิล', icon: '🍎', val: 4 },
  { type: 'coffee', name: 'กาแฟ', icon: '☕', val: 5 },
  { type: 'cigars', name: 'ซิการ์', icon: '🚬', val: 8 },
];

export const TabletopBoard: React.FC<TabletopBoardProps> = ({
  gameState,
  myPlayerId,
  selectedCardIds = [],
  onToggleSelect,
  onSelectMultiple,
  onSelectInspectTarget,
  onOpenBribePrompt,
  onMarketDiscard,
  onMarketSplitDiscard,
  onMarketSetAside,
  onMarketFinalizeDiscards,
  onMarketDrawSingle,
  onMarketAutoFill,
  onMarketSkipDiscard,
  onPackCrate,
  onDeclareGoods,
  onResolveInspection,
  onNextRound,
  onOfferBribe,
  onOfferUniversalBribe,
  declaredType = 'apples',
  setDeclaredType,
  isStealthMode = false,
  onToggleStealthMode,
  soundEnabled = true,
  onToggleSound,
  onOpenRules,
  onOpenWarehouse,
}) => {
  const theme = THEMES[gameState.themeId] || THEMES.mafia_1920;
  const me = gameState.players?.find((p) => p.id === myPlayerId);
  const otherPlayers = (gameState.players || []).filter((p) => p.id !== myPlayerId);
  const inspector = gameState.players?.find((p) => p.isInspector);
  const activeTargetPlayer = gameState.players?.find((p) => p.id === gameState.activeInspectTargetId);

  // Local state for log filter: 'all' | 'bribe' | 'fine'
  const [logFilter, setLogFilter] = useState<'all' | 'bribe' | 'fine'>('all');
  const [bribeInputAmount, setBribeInputAmount] = useState<number>(3);
  const [activeSidePanel, setActiveSidePanel] = useState<'inspect' | 'bribe' | 'declare' | 'trade' | null>(null);

  // Discard hover peek state
  const [hoveredDiscardPile, setHoveredDiscardPile] = useState<'left' | 'right' | null>(null);

  // Interactive Crate Packing State (In & Out freely)
  const [packedCrateCardIds, setPackedCrateCardIds] = useState<string[]>([]);
  const [isSealingCrate, setIsSealingCrate] = useState<boolean>(false);

  // Universal Bribe Modal State
  const [isBribeModalOpen, setIsBribeModalOpen] = useState<boolean>(false);
  const [universalBribeTargetId, setUniversalBribeTargetId] = useState<string | null>(null);
  const [universalBribeIntent, setUniversalBribeIntent] = useState<'inspect' | 'pass'>('pass');
  const [universalBribeCash, setUniversalBribeCash] = useState<number>(3);
  const [universalBribeMsg, setUniversalBribeMsg] = useState<string>('ปล่อยคันนี้ไปเถอะครับ มีแค่อาหารจริงๆ');

  const openBribeModalFor = (targetId?: string) => {
    const chosenTarget =
      targetId ||
      activeTargetPlayer?.id ||
      otherPlayers.find((p) => !p.isInspector)?.id ||
      myPlayerId;
    setUniversalBribeTargetId(chosenTarget);
    const isSelf = chosenTarget === myPlayerId;
    setUniversalBribeIntent(isSelf ? 'pass' : 'inspect');
    setUniversalBribeMsg(
      isSelf ? 'ปล่อยคันนี้ไปเถอะครับ มีแค่อาหารจริงๆ' : 'ตรวจค้นมันเลยสารวัตร มีของเถื่อนแน่!'
    );
    setIsBribeModalOpen(true);
  };

  const handleSendUniversalBribe = () => {
    if (!universalBribeTargetId) return;
    const cash = Math.min(Math.max(1, universalBribeCash), me?.cash || 0);
    if (onOfferUniversalBribe) {
      onOfferUniversalBribe(universalBribeTargetId, universalBribeIntent, cash, universalBribeMsg);
    } else if (onOfferBribe) {
      onOfferBribe(universalBribeTargetId, cash);
    }
    sounds.playCoin();
    setIsBribeModalOpen(false);
  };

  // Reset packed crate state when phase changes or player already packed
  useEffect(() => {
    if (gameState.phase !== 'LOADING' || me?.hasPackedCrate) {
      setPackedCrateCardIds([]);
      setIsSealingCrate(false);
    }
  }, [gameState.phase, me?.hasPackedCrate]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState.logs]);

  // Determine current active phase for sidebar button highlighting
  const currentActionTab = (() => {
    if (gameState.phase === 'MARKET') return 'trade';
    if (gameState.phase === 'LOADING') return 'declare';
    if (gameState.phase === 'INSPECTION' || gameState.phase === 'NEGOTIATION') return 'inspect';
    return null;
  })();

  // Market phase state
  const myHand = me?.hand || [];
  const isMyMarketTurn = gameState.phase === 'MARKET' && myPlayerId === gameState.activeMarketPlayerId;
  const pendingDiscards = me?.pendingDiscards || [];
  const isMarketStep1 = isMyMarketTurn && pendingDiscards.length === 0 && myHand.length === 6;
  const isMarketStep2 = isMyMarketTurn && (pendingDiscards.length > 0 || myHand.length < 6) && myHand.length < 6;
  const isMarketStep3 = isMyMarketTurn && pendingDiscards.length > 0 && myHand.length >= 6;
  const cardsNeeded = isMarketStep2 ? 6 - myHand.length : 0;

  // Market Step 3 Distribution State
  const [step3Targets, setStep3Targets] = useState<Record<string, 'left' | 'right'>>({});
  const [step3Order, setStep3Order] = useState<string[]>([]);

  useEffect(() => {
    if (pendingDiscards.length > 0) {
      setStep3Order(pendingDiscards.map((c) => c.id));
      const initialTargets: Record<string, 'left' | 'right'> = {};
      pendingDiscards.forEach((c) => {
        initialTargets[c.id] = 'left';
      });
      setStep3Targets(initialTargets);
    } else {
      setStep3Order([]);
      setStep3Targets({});
    }
  }, [pendingDiscards.length]);

  const effectiveOrder =
    step3Order.length === pendingDiscards.length && pendingDiscards.every((c) => step3Order.includes(c.id))
      ? step3Order
      : pendingDiscards.map((c) => c.id);



  // Filter logs
  const displayedLogs = (gameState.logs || []).filter((log) => {
    if (logFilter === 'bribe') return log.type === 'bribe';
    if (logFilter === 'fine') return log.type === 'fine' || log.type === 'alert' || log.type === 'pass';
    return true;
  });

  // Render 5 Goods Stacks (4 Legal + 1 Contraband) with enlarged cards, clear count badges & rich instant hover tooltips
  const renderGoodsStacks = (player?: Player) => {
    if (!player) return null;
    const legalWarehouse = player.warehouse?.legal || ({} as Record<LegalGoodsType, Card[]>);
    const contrabandCount = player.warehouse?.contrabandCount || 0;

    return (
      <div className="flex items-center gap-1.5 justify-center py-1">
        {LEGAL_TYPES.map(({ type, name, icon, val }) => {
          const cards = legalWarehouse[type] || [];
          const count = cards.length;
          const legalInfo = theme.legalGoods?.[type];
          const displayName = legalInfo?.name || name;
          const displayVal = legalInfo?.value || val;

          return (
            <div
              key={type}
              className="relative group select-none cursor-pointer"
            >
              {/* Instant Rich Hover Tooltip */}
              <div className="hidden group-hover:flex flex-col items-center absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-black/95 border-2 border-amber-400/90 rounded-xl px-2.5 py-1.5 shadow-[0_0_25px_rgba(0,0,0,0.95)] whitespace-nowrap animate-fadeIn">
                <div className="text-[11px] font-extrabold text-amber-200 flex items-center gap-1 border-b border-amber-500/40 pb-1 w-full justify-center">
                  <span>{icon}</span>
                  <span>{displayName}</span>
                  <span className="text-[10px] text-amber-300 font-mono">(${displayVal}/ใบ)</span>
                </div>
                <div className="text-[10.5px] text-white font-mono font-bold mt-1">
                  โกดังของ {player.name}: <span className={count > 0 ? "text-emerald-400 font-extrabold" : "text-white/40"}>{count} ใบ</span>
                  {count > 0 && <span className="text-amber-300 ml-1">(${count * displayVal})</span>}
                </div>
                <div className="text-[8.5px] text-amber-200/70 mt-0.5">
                  {count > 0 ? '✓ สินค้าถูกกฎหมายผ่านด่านแล้ว' : 'ยังไม่มีในโกดัง'}
                </div>
                {/* Arrow */}
                <div className="w-2 h-2 bg-black border-r-2 border-b-2 border-amber-400/90 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
              </div>

              {/* Card Container */}
              <div
                className={`w-7 sm:w-8 aspect-[3/4] rounded-lg overflow-hidden border transition-all relative flex flex-col items-center justify-center ${
                  count > 0
                    ? 'border-emerald-400 bg-black shadow-[0_0_10px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/80 scale-100'
                    : 'border-white/20 bg-black/50 opacity-40 grayscale hover:opacity-75 hover:grayscale-0'
                }`}
              >
                <img
                  src={`/cards/${type}.jpg`}
                  alt={displayName}
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Bold, Clear Count Badge */}
                <div
                  className={`absolute -bottom-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full border text-[8px] font-black flex items-center justify-center shadow-md z-10 font-mono ${
                    count > 0
                      ? 'bg-emerald-400 border-black text-black'
                      : 'bg-black/90 border-white/40 text-white/50'
                  }`}
                >
                  {count}
                </div>
              </div>
            </div>
          );
        })}

        {/* 5th Stack: Contraband (Face-Down Secret Stash) */}
        <div className="relative group select-none cursor-pointer">
          {/* Instant Rich Hover Tooltip */}
          <div className="hidden group-hover:flex flex-col items-center absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-black/95 border-2 border-rose-500 rounded-xl px-2.5 py-1.5 shadow-[0_0_25px_rgba(225,29,72,0.6)] whitespace-nowrap animate-fadeIn">
            <div className="text-[11px] font-extrabold text-rose-300 flex items-center gap-1 border-b border-rose-500/40 pb-1 w-full justify-center">
              <span>🤫</span>
              <span>สินค้าผิดกฎหมาย (ของเถื่อน)</span>
            </div>
            <div className="text-[10.5px] text-white font-mono font-bold mt-1">
              โกดังของ {player.name}: <span className={contrabandCount > 0 ? "text-rose-400 font-extrabold" : "text-white/40"}>{contrabandCount} ใบ</span>
            </div>
            <div className="text-[8.5px] text-rose-200/70 mt-0.5">
              คว่ำหน้าซ่อนไว้ (เปิดนับคะแนนหลังจบเกม)
            </div>
            {/* Arrow */}
            <div className="w-2 h-2 bg-black border-r-2 border-b-2 border-rose-500 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
          </div>

          {/* Card Container */}
          <div
            className={`w-7 sm:w-8 aspect-[3/4] rounded-lg overflow-hidden border transition-all relative flex flex-col items-center justify-center ${
              contrabandCount > 0
                ? 'border-rose-500 bg-[#25070c] shadow-[0_0_10px_rgba(225,29,72,0.4)] ring-1 ring-rose-400/80 scale-100'
                : 'border-white/20 bg-black/50 opacity-40 grayscale hover:opacity-75'
            }`}
          >
            <img
              src="/cards/card_back.jpg"
              alt="Secret Contraband"
              className="w-full h-full object-cover pointer-events-none"
            />
            {/* Bold, Clear Count Badge */}
            <div
              className={`absolute -bottom-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full border text-[8px] font-black flex items-center justify-center shadow-md z-10 font-mono ${
                contrabandCount > 0
                  ? 'bg-rose-600 border-black text-white'
                  : 'bg-black/90 border-white/40 text-white/50'
              }`}
            >
              {contrabandCount}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Arrange opponent seats around perimeter:
  const getSeatPosition = (index: number, total: number) => {
    if (total === 1) return 'top-center';
    if (total === 2) return index === 0 ? 'top-left' : 'top-right';
    if (total === 3) {
      if (index === 0) return 'mid-left';
      if (index === 1) return 'top-center';
      return 'mid-right';
    }
    if (total === 4) {
      if (index === 0) return 'mid-left';
      if (index === 1) return 'top-left';
      if (index === 2) return 'top-right';
      return 'mid-right';
    }
    if (index === 0) return 'mid-left';
    if (index === 1) return 'top-left';
    if (index === 2) return 'top-center';
    if (index === 3) return 'top-right';
    return 'mid-right';
  };

  const topOpponents = otherPlayers.filter((_, idx) => {
    const pos = getSeatPosition(idx, otherPlayers.length);
    return pos.startsWith('top');
  });

  const leftOpponents = otherPlayers.filter((_, idx) => {
    const pos = getSeatPosition(idx, otherPlayers.length);
    return pos === 'mid-left';
  });

  const rightOpponents = otherPlayers.filter((_, idx) => {
    const pos = getSeatPosition(idx, otherPlayers.length);
    return pos === 'mid-right';
  });

  // Render an individual Opponent Station (Sleek, Compact, No Overlapping)
  const renderOpponentStation = (p: Player) => {
    const isTarget = p.id === gameState.activeInspectTargetId;
    const isInspectorPlayer = p.isInspector;
    const targetBribes = (gameState.bribeOffers || []).filter((b) => b.targetPlayerId === p.id);

    return (
      <div
        key={p.id}
        onClick={
          me?.isInspector && !isInspectorPlayer && onSelectInspectTarget
            ? () => onSelectInspectTarget(p.id)
            : undefined
        }
        className={`
          relative rounded-xl p-1.5 transition-all duration-200 select-none flex flex-col items-center w-36 sm:w-44 shrink-0
          ${
            isTarget
              ? 'bg-amber-950/90 border-2 border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.6)] scale-105 z-20'
              : isInspectorPlayer
              ? 'bg-blue-950/70 border-2 border-blue-400 shadow-md'
              : 'bg-black/75 border border-amber-900/50 hover:border-amber-500/70 shadow'
          }
          ${me?.isInspector && !isInspectorPlayer ? 'cursor-pointer hover:scale-105' : ''}
        `}
      >
        {/* Top: Avatar + Name + Cash in a single compact row */}
        <div className="flex items-center gap-1.5 w-full justify-between">
          <div className="relative w-8 h-8 rounded-lg bg-[#2a170b] border border-amber-600/80 flex items-center justify-center shrink-0">
            <span className="text-lg filter drop-shadow">{p.avatar || '👤'}</span>
            {isInspectorPlayer && (
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-600 border border-amber-300 text-amber-200 text-[8px] flex items-center justify-center shadow animate-bounce">
                ⭐
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 px-1">
            <div className="font-bold text-[10px] text-amber-200 truncate leading-tight">
              {p.name || 'GANGSTER'}
            </div>
            <div className="font-extrabold text-[9px] text-emerald-400 font-mono">
              ${p.cash || 0}
            </div>
          </div>
        </div>

        {/* 5 Goods Piles (Miniature) */}
        <div className="w-full mt-1 pt-1 border-t border-amber-500/20 flex justify-center">
          {renderGoodsStacks(p)}
        </div>

        {/* Packed Secret Crate */}
        {p.crate && !isInspectorPlayer && (
          <div className="mt-1 w-full bg-[#201007] border border-amber-600/60 rounded-lg px-1.5 py-0.5 text-center">
            <div className="flex items-center justify-between text-[8.5px] text-amber-300 leading-tight">
              <span>📦 {p.crate?.cardsCount || 0} ใบ</span>
              {p.crate?.declaredType && (
                <span className="text-emerald-300 font-bold truncate max-w-[80px]">
                  {theme.legalGoods[p.crate.declaredType]?.name || p.crate.declaredType}
                </span>
              )}
            </div>

            {targetBribes.length > 0 && (
              <div className="text-[8px] text-amber-300 font-mono font-bold mt-0.5">
                💰 สินบน: ${targetBribes.reduce((sum, b) => sum + (b.cash || 0), 0)}
              </div>
            )}

            {!me?.isInspector && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenBribePrompt) onOpenBribePrompt(p.id);
                  openBribeModalFor(p.id);
                }}
                className="mt-1 w-full py-0.5 text-[8px] bg-gradient-to-r from-amber-700 to-amber-900 border border-amber-500/60 text-amber-200 font-bold rounded hover:brightness-125 transition-all shadow cursor-pointer"
              >
                เสนอสินบน 💵
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full flex-1 min-h-0 rounded-2xl overflow-hidden bg-[#0a0604] border-2 border-[#2f180d] p-1.5 sm:p-2 select-none shadow-2xl flex flex-col justify-between">
      {/* Background Ambient Glows */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundColor: '#0a0604',
          backgroundImage: 'radial-gradient(#2b160b 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />

      {/* 1. TOP STATUS BANNER */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 mb-1 px-1 shrink-0">
        {/* Room & Theme Title */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-black/80 border border-amber-600/60 rounded-xl flex items-center gap-2 shadow">
            <span className="text-base">🎩</span>
            <div>
              <div className="font-['Press_Start_2P',monospace] text-[8.5px] text-amber-300">
                {theme.name.toUpperCase()}
              </div>
              <div className="text-[9px] text-amber-100/70">
                รอบที่ {gameState.currentRound}/{gameState.totalRounds || 6}
              </div>
            </div>
          </div>
        </div>

        {/* Phase Indicator */}
        <div className="bg-black/80 border border-amber-500/60 rounded-xl px-3 py-1 text-center shadow-lg mx-auto">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-white">
            <span className="text-amber-400">เฟสปัจจุบัน:</span>
            <span className="text-amber-200 font-extrabold bg-amber-950 px-2 py-0.5 rounded-lg border border-amber-500/60 font-mono">
              {gameState.phase}
            </span>
            {inspector && (
              <span className="text-xs text-blue-300 ml-1">
                (ผู้คุมด่าน: <strong>{inspector.name}</strong>)
              </span>
            )}
          </div>
        </div>

        {/* Quick Utility Tools */}
        <div className="flex items-center gap-1.5">
          {onOpenWarehouse && (
            <button
              onClick={onOpenWarehouse}
              className="px-2 py-1 rounded-xl bg-black/80 border border-amber-600/50 hover:bg-amber-950 text-amber-300 text-xs shadow transition-all font-bold flex items-center gap-1"
              title="เปิดโกดังของคุณ"
            >
              <span>🏛️</span>
              <span className="hidden sm:inline">โกดัง</span>
            </button>
          )}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className="p-1 px-1.5 rounded-xl bg-black/80 border border-amber-600/50 hover:bg-amber-950 text-amber-300 text-xs shadow transition-all"
              title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          )}
          {onOpenRules && (
            <button
              onClick={onOpenRules}
              className="p-1 px-2 rounded-xl bg-black/80 border border-amber-600/50 hover:bg-amber-950 text-amber-300 text-xs shadow transition-all font-bold"
              title="กติกาการเล่น"
            >
              📖 กติกา
            </button>
          )}
          {onToggleStealthMode && (
            <button
              onClick={onToggleStealthMode}
              className={`p-1 px-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 shadow ${
                isStealthMode
                  ? 'bg-amber-950 border-amber-400 text-amber-300 ring-2 ring-amber-400'
                  : 'bg-black/80 border-amber-600/50 hover:bg-amber-950 text-amber-300'
              }`}
              title={isStealthMode ? 'แสดงการ์ด' : 'ซ่อนการ์ด'}
            >
              <span>{isStealthMode ? '🙈' : '👁️'}</span>
              <span>ซ่อน</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN 3-COLUMN BODY: WIDESCREEN BOARD OVERHAUL */}
      <div className="relative z-10 flex flex-col lg:flex-row items-stretch justify-between gap-1.5 my-1 w-full flex-1 min-h-0 overflow-hidden">
        
        {/* === COLUMN 1 (LEFT): SLIM INTELLIGENCE GAME LOG === */}
        <div className="w-full lg:w-44 xl:w-48 flex flex-col bg-black/85 border-2 border-[#5c3e21] rounded-xl p-2 shadow-2xl backdrop-blur-md shrink-0 justify-between min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header & Filter Pills */}
            <div className="flex items-center justify-between pb-1 border-b border-amber-600/40 mb-1 shrink-0">
              <div className="flex items-center gap-1 text-xs font-bold text-amber-300 font-['Press_Start_2P',monospace] text-[7.5px]">
                <span>📜</span>
                <span>LOG</span>
              </div>
              <span className="text-[8px] text-amber-400/80 font-mono bg-amber-950/80 px-1 py-0.2 rounded border border-amber-500/40">
                {gameState.logs?.length || 0}
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 mb-1 shrink-0">
              <button
                onClick={() => setLogFilter('all')}
                className={`flex-1 py-0.5 text-[8.5px] font-bold rounded transition-all ${
                  logFilter === 'all'
                    ? 'bg-amber-700 text-white'
                    : 'bg-black/50 text-amber-200/60 hover:text-white'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setLogFilter('bribe')}
                className={`flex-1 py-0.5 text-[8.5px] font-bold rounded transition-all ${
                  logFilter === 'bribe'
                    ? 'bg-amber-700 text-white'
                    : 'bg-black/50 text-amber-200/60 hover:text-white'
                }`}
              >
                💰 สินบน
              </button>
              <button
                onClick={() => setLogFilter('fine')}
                className={`flex-1 py-0.5 text-[8.5px] font-bold rounded transition-all ${
                  logFilter === 'fine'
                    ? 'bg-amber-700 text-white'
                    : 'bg-black/50 text-amber-200/60 hover:text-white'
                }`}
              >
                ⚖️ ปรับ
              </button>
            </div>

            {/* Scrollable Log Entries */}
            <div className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-1 text-xs font-mono scrollbar-thin scrollbar-thumb-amber-700">
              {displayedLogs.map((log) => {
                const timeStr = log?.timestamp
                  ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--';
                return (
                  <div
                    key={log?.id || Math.random().toString()}
                    className={`p-1.5 rounded-lg leading-relaxed border transition-all ${
                      log?.type === 'bribe'
                        ? 'bg-amber-950/70 border-amber-500/80 text-amber-200'
                        : log?.type === 'fine'
                        ? 'bg-rose-950/70 border-rose-500/80 text-rose-200'
                        : log?.type === 'pass'
                        ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200'
                        : log?.type === 'alert'
                        ? 'bg-yellow-950/70 border-yellow-500/80 text-yellow-200 font-bold'
                        : 'bg-black/50 border-amber-900/30 text-amber-100/80'
                    }`}
                  >
                    <div className="text-[8.5px] opacity-60 mb-0.5 flex items-center justify-between">
                      <span>[{timeStr}]</span>
                      <span className="uppercase text-[7.5px] tracking-wider">
                        {log?.type || 'INFO'}
                      </span>
                    </div>
                    <div>{log?.text}</div>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Quick Info Card at bottom of left column */}
          <div className="mt-1.5 pt-1.5 border-t border-amber-600/30 text-[9.5px] text-amber-200/70 italic text-center shrink-0">
            บันทึกการส่งข่าวกรองสดจากโต๊ะเล่น
          </div>
        </div>

        {/* === COLUMN 2 (CENTER): ENLARGED OCTAGONAL FELT TABLE === */}
        <div className="flex-1 min-w-0 flex flex-col items-center justify-between min-h-0 h-full">
          <div
            className="relative w-full rounded-[36px] border-[6px] sm:border-[8px] border-[#3d2010] bg-[#140b06] shadow-[0_25px_65px_rgba(0,0,0,0.95),inset_0_0_50px_rgba(0,0,0,0.85)] p-2 sm:p-3 flex flex-col justify-between flex-1 min-h-0"
            style={{
              backgroundImage: 'radial-gradient(ellipse at 50% 50%, #1a4224 0%, #0d2816 65%, #05140a 100%)',
            }}
          >
            {/* Ornate Gold Double Pinstripe Border on Felt */}
            <div className="absolute inset-1.5 sm:inset-2.5 rounded-[28px] border-2 border-amber-500/30 pointer-events-none" />
            <div className="absolute inset-2.5 sm:inset-3.5 rounded-[24px] border border-amber-500/15 pointer-events-none" />

            {/* TABLE TOP EDGE: Opponent Stations */}
            <div className="w-full flex items-start justify-around gap-1.5 mb-1.5 z-10 shrink-0">
              {topOpponents.map((p) => renderOpponentStation(p))}
            </div>

            {/* TABLE MIDDLE: Left Seat + Center Decks / Checkpoint + Right Seat */}
            <div className="w-full flex items-center justify-between gap-2 sm:gap-3 my-1 z-10 flex-1 min-h-0">
              
              {/* Mid-Left Opponent */}
              <div className="w-36 sm:w-44 flex justify-start shrink-0">
                {leftOpponents.map((p) => renderOpponentStation(p))}
              </div>

              {/* TABLE CENTER: DECK, DISCARD PILES & CUSTOMS CHECKPOINT */}
              <div className="flex-1 max-w-2xl mx-auto flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-black/45 border border-amber-500/30 shadow-2xl backdrop-blur-sm">
                
                {/* Central Decks Row: Left Discard | Draw Deck | Right Discard */}
                <div className="flex items-center justify-center gap-3 sm:gap-6 w-full">
                  
                  {/* 1. Left Discard Pile with Hover History Tooltip */}
                  <div
                    className="flex flex-col items-center relative"
                    onMouseEnter={() => setHoveredDiscardPile('left')}
                    onMouseLeave={() => setHoveredDiscardPile(null)}
                  >
                    {/* Hover Peek Tooltip */}
                    {hoveredDiscardPile === 'left' && (
                      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 w-56 p-2.5 rounded-xl bg-black/95 border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)] backdrop-blur-md animate-fadeIn text-left pointer-events-none">
                        <div className="text-[10px] font-bold text-emerald-300 pb-1 border-b border-emerald-500/40 mb-1.5 flex items-center justify-between">
                          <span>📜 ประวัติกองทิ้งซ้าย</span>
                          <span className="text-[8.5px] text-white/60">5 ใบล่าสุด</span>
                        </div>
                        <div className="space-y-1">
                          {(gameState.discardPiles?.leftRecent || []).length > 0 ? (
                            gameState.discardPiles.leftRecent!.map((c, i) => (
                              <div key={c.id || i} className="flex items-center justify-between text-[9.5px]">
                                <span className="text-amber-200/80 font-mono text-[8.5px]">
                                  {i === 0 ? '1. [บนสุด]' : `${i + 1}.`}
                                </span>
                                <span className={`font-bold flex items-center gap-1 ${c.category === 'legal' ? 'text-emerald-300' : 'text-rose-400'}`}>
                                  <span>{c.icon}</span>
                                  <span className="truncate max-w-[100px]">{c.name}</span>
                                </span>
                                <span className="text-vintage-gold font-mono text-[8.5px]">${c.value}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[9px] text-white/40 italic text-center py-1">กองทิ้งว่างเปล่า</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div
                      onClick={() => {
                        if (isMarketStep2 && onMarketDrawSingle) {
                          if ((gameState.discardPiles?.leftCount || 0) > 0) {
                            onMarketDrawSingle('left');
                          }
                        } else if (isMarketStep1 && onMarketSetAside) {
                          onMarketSetAside(selectedCardIds);
                        } else if (isMarketStep3) {
                          const allLeft: Record<string, 'left' | 'right'> = {};
                          pendingDiscards.forEach((c) => { allLeft[c.id] = 'left'; });
                          setStep3Targets(allLeft);
                          sounds.playFlip();
                        }
                      }}
                      className={`
                        w-20 h-28 sm:w-24 sm:h-32 rounded-2xl p-1 flex items-center justify-center transition-all duration-200 relative
                        ${
                          gameState.discardPiles?.leftTop
                            ? 'border-2 border-emerald-500/80 bg-black/80 shadow-lg'
                            : 'border-2 border-dashed border-white/20 bg-black/40'
                        }
                        ${
                          (isMarketStep2 && (gameState.discardPiles?.leftCount || 0) > 0) ||
                          (isMarketStep1 && selectedCardIds.length > 0) ||
                          isMarketStep3
                            ? 'cursor-pointer hover:scale-105 ring-4 ring-emerald-400 animate-pulse'
                            : ''
                        }
                      `}
                    >
                      {/* Stack effect if count > 1 */}
                      {(gameState.discardPiles?.leftCount || 0) > 1 && (
                        <>
                          <div className="absolute -top-1 -left-1 w-full h-full rounded-2xl bg-emerald-950/60 border border-emerald-600/40 -z-10 pointer-events-none" />
                          <div className="absolute -top-2 -left-2 w-full h-full rounded-2xl bg-emerald-950/40 border border-emerald-700/30 -z-20 pointer-events-none" />
                        </>
                      )}

                      {gameState.discardPiles?.leftTop ? (
                        <ModularCard card={gameState.discardPiles.leftTop} size="sm" showBonusBadge={false} />
                      ) : (
                        <span className="font-['Press_Start_2P',monospace] text-[8px] text-white/30 text-center">
                          EMPTY
                        </span>
                      )}

                      {/* Count Badge */}
                      <div className="absolute -bottom-2 -left-2 px-2 py-0.5 rounded-full bg-black/95 border border-emerald-400 text-emerald-300 font-mono text-[10px] font-bold shadow">
                        {gameState.discardPiles?.leftCount || 0} ใบ
                      </div>
                    </div>

                    <span className="text-xs font-bold text-emerald-300 mt-2">
                      กองทิ้งซ้าย
                    </span>

                    {isMarketStep2 && onMarketDrawSingle && (gameState.discardPiles?.leftCount || 0) > 0 && (
                      <button
                        onClick={() => onMarketDrawSingle('left')}
                        className="mt-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-lg shadow active:scale-95"
                      >
                        จั่วใบนี้ 👈
                      </button>
                    )}
                  </div>

                  {/* 2. Middle Face-down Draw Deck */}
                  <div className="flex flex-col items-center">
                    <div
                      onClick={() => {
                        if (isMarketStep2 && onMarketDrawSingle) {
                          onMarketDrawSingle('deck');
                        } else if (isMarketStep1 && onMarketSetAside) {
                          onMarketSetAside(selectedCardIds);
                        }
                      }}
                      className={`
                        w-20 h-28 sm:w-24 sm:h-32 rounded-2xl transition-all duration-200 relative overflow-hidden
                        border-2 border-amber-500/80 shadow-2xl flex flex-col items-center justify-center
                        ${
                          isMarketStep2 || (isMarketStep1 && selectedCardIds.length > 0)
                            ? 'cursor-pointer hover:scale-105 ring-4 ring-amber-400 animate-pulse'
                            : ''
                        }
                      `}
                    >
                      <div className="absolute -top-1 -right-1 w-full h-full rounded-2xl bg-amber-900/40 border border-amber-600/40 -z-10 pointer-events-none" />
                      <div className="absolute -top-2 -right-2 w-full h-full rounded-2xl bg-amber-950/30 border border-amber-700/20 -z-20 pointer-events-none" />

                      <img
                        src="/cards/card_back.jpg"
                        alt="Draw Deck"
                        className="w-full h-full object-cover"
                      />

                      {/* Cards Left Badge */}
                      <div className="absolute -bottom-1 px-2 py-0.5 rounded-full bg-black/95 border border-amber-500 text-amber-300 font-mono text-[10px] font-bold shadow z-10">
                        {gameState.drawDeckCount || 0} ใบ
                      </div>
                    </div>

                    <span className="text-xs font-bold text-amber-300 mt-2">
                      กองจั่วกลาง
                    </span>

                    {isMarketStep2 && onMarketDrawSingle && (
                      <button
                        onClick={() => onMarketDrawSingle('deck')}
                        className="mt-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-lg shadow active:scale-95"
                      >
                        จั่วสุ่ม 👇
                      </button>
                    )}
                  </div>

                  {/* 3. Right Discard Pile with Hover History Tooltip */}
                  <div
                    className="flex flex-col items-center relative"
                    onMouseEnter={() => setHoveredDiscardPile('right')}
                    onMouseLeave={() => setHoveredDiscardPile(null)}
                  >
                    {/* Hover Peek Tooltip */}
                    {hoveredDiscardPile === 'right' && (
                      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 w-56 p-2.5 rounded-xl bg-black/95 border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)] backdrop-blur-md animate-fadeIn text-left pointer-events-none">
                        <div className="text-[10px] font-bold text-emerald-300 pb-1 border-b border-emerald-500/40 mb-1.5 flex items-center justify-between">
                          <span>📜 ประวัติกองทิ้งขวา</span>
                          <span className="text-[8.5px] text-white/60">5 ใบล่าสุด</span>
                        </div>
                        <div className="space-y-1">
                          {(gameState.discardPiles?.rightRecent || []).length > 0 ? (
                            gameState.discardPiles.rightRecent!.map((c, i) => (
                              <div key={c.id || i} className="flex items-center justify-between text-[9.5px]">
                                <span className="text-amber-200/80 font-mono text-[8.5px]">
                                  {i === 0 ? '1. [บนสุด]' : `${i + 1}.`}
                                </span>
                                <span className={`font-bold flex items-center gap-1 ${c.category === 'legal' ? 'text-emerald-300' : 'text-rose-400'}`}>
                                  <span>{c.icon}</span>
                                  <span className="truncate max-w-[100px]">{c.name}</span>
                                </span>
                                <span className="text-vintage-gold font-mono text-[8.5px]">${c.value}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[9px] text-white/40 italic text-center py-1">กองทิ้งว่างเปล่า</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div
                      onClick={() => {
                        if (isMarketStep2 && onMarketDrawSingle) {
                          if ((gameState.discardPiles?.rightCount || 0) > 0) {
                            onMarketDrawSingle('right');
                          }
                        } else if (isMarketStep1 && onMarketSetAside) {
                          onMarketSetAside(selectedCardIds);
                        } else if (isMarketStep3) {
                          const allRight: Record<string, 'left' | 'right'> = {};
                          pendingDiscards.forEach((c) => { allRight[c.id] = 'right'; });
                          setStep3Targets(allRight);
                          sounds.playFlip();
                        }
                      }}
                      className={`
                        w-20 h-28 sm:w-24 sm:h-32 rounded-2xl p-1 flex items-center justify-center transition-all duration-200 relative
                        ${
                          gameState.discardPiles?.rightTop
                            ? 'border-2 border-emerald-500/80 bg-black/80 shadow-lg'
                            : 'border-2 border-dashed border-white/20 bg-black/40'
                        }
                        ${
                          (isMarketStep2 && (gameState.discardPiles?.rightCount || 0) > 0) ||
                          (isMarketStep1 && selectedCardIds.length > 0) ||
                          isMarketStep3
                            ? 'cursor-pointer hover:scale-105 ring-4 ring-emerald-400 animate-pulse'
                            : ''
                        }
                      `}
                    >
                      {/* Stack effect if count > 1 */}
                      {(gameState.discardPiles?.rightCount || 0) > 1 && (
                        <>
                          <div className="absolute -top-1 -right-1 w-full h-full rounded-2xl bg-emerald-950/60 border border-emerald-600/40 -z-10 pointer-events-none" />
                          <div className="absolute -top-2 -right-2 w-full h-full rounded-2xl bg-emerald-950/40 border border-emerald-700/30 -z-20 pointer-events-none" />
                        </>
                      )}

                      {gameState.discardPiles?.rightTop ? (
                        <ModularCard card={gameState.discardPiles.rightTop} size="sm" showBonusBadge={false} />
                      ) : (
                        <span className="font-['Press_Start_2P',monospace] text-[8px] text-white/30 text-center">
                          EMPTY
                        </span>
                      )}

                      {/* Count Badge */}
                      <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-black/95 border border-emerald-400 text-emerald-300 font-mono text-[10px] font-bold shadow">
                        {gameState.discardPiles?.rightCount || 0} ใบ
                      </div>
                    </div>

                    <span className="text-xs font-bold text-emerald-300 mt-2">
                      กองทิ้งขวา
                    </span>

                    {isMarketStep2 && onMarketDrawSingle && (gameState.discardPiles?.rightCount || 0) > 0 && (
                      <button
                        onClick={() => onMarketDrawSingle('right')}
                        className="mt-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-lg shadow active:scale-95"
                      >
                        จั่วใบนี้ 👉
                      </button>
                    )}
                  </div>

                </div>

                {/* === MARKET STEP-BY-STEP PROMPT BANNER === */}
                {isMarketStep1 && (
                  <div className="mt-3 w-full bg-[#1e0e07] border border-amber-500/70 rounded-2xl p-2.5 text-center shadow animate-fadeIn">
                    <div className="text-xs font-bold text-amber-300 mb-1 flex items-center justify-center gap-1.5">
                      <span>🛒</span>
                      <span>ขั้นตอนที่ 1/3: เลือกการ์ดที่จะทิ้ง (0–5 ใบจากมือของคุณ)</span>
                    </div>
                    <div className="text-[11px] text-amber-200/80 mb-2">
                      {selectedCardIds.length === 0
                        ? 'คลิกเลือกการ์ดในมือที่ต้องการเปลี่ยน หรือกด "ข้าม" หากพอใจกับการ์ดในมือแล้ว'
                        : `เลือกไว้ ${selectedCardIds.length} ใบ — กดปุ่มด้านล่างเพื่อเริ่มหยิบการ์ดใหม่`}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      {selectedCardIds.length > 0 ? (
                        <button
                          onClick={() => {
                            if (onMarketSetAside) onMarketSetAside(selectedCardIds);
                            else if (onMarketDiscard) onMarketDiscard(selectedCardIds, 'left');
                          }}
                          className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-xl shadow-lg border border-amber-300 active:scale-95 transition-all"
                        >
                          📦 พักการ์ดที่เลือก ({selectedCardIds.length} ใบ) ➔ ไปขั้นจั่ว
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (onMarketSetAside) onMarketSetAside([]);
                            else if (onMarketSkipDiscard) onMarketSkipDiscard();
                          }}
                          className="px-4 py-1.5 bg-black/80 hover:bg-black text-amber-300 border border-amber-500/60 font-bold text-xs rounded-xl shadow active:scale-95 transition-all"
                        >
                          ⏭️ ข้าม / ไม่เปลี่ยนการ์ดในรอบนี้
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {isMarketStep2 && (
                  <div className="mt-3 w-full bg-[#1a3822] border-2 border-emerald-400 rounded-2xl p-2.5 text-center shadow animate-pulse">
                    <div className="text-xs sm:text-sm font-bold text-emerald-300 mb-1 flex items-center justify-center gap-1.5">
                      <span>🎴</span>
                      <span>ขั้นตอนที่ 2/3: จั่วการ์ดใหม่เข้ามืออีก {cardsNeeded} ใบ</span>
                    </div>
                    <div className="text-[11px] text-emerald-200/90 mb-2">
                      คลิกเลือกหยิบจาก <strong>กองจั่วกลาง</strong> หรือ <strong>กองทิ้งซ้าย/ขวา</strong> ได้ทีละใบ
                    </div>
                    {onMarketAutoFill && (
                      <button
                        onClick={onMarketAutoFill}
                        className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-xs rounded-xl shadow border border-amber-300 hover:scale-105 active:scale-95 transition-all"
                      >
                        ⚡ จั่วจากกองกลางให้ครบ {cardsNeeded} ใบอัตโนมัติ
                      </button>
                    )}
                  </div>
                )}

                {isMarketStep3 && (
                  <div className="mt-3 w-full bg-[#1e0e07] border-2 border-amber-400 rounded-2xl p-3 text-center shadow-2xl animate-fadeIn relative z-40 pointer-events-auto">
                    <div className="text-xs sm:text-sm font-bold text-amber-300 mb-1 flex items-center justify-center gap-1.5">
                      <span>📦</span>
                      <span>ขั้นตอนที่ 3/3: กำหนดปลายทางและลำดับการทิ้ง ({pendingDiscards.length} ใบ)</span>
                    </div>
                    <div className="text-[11px] text-amber-200/80 mb-2">
                      เลือกให้แต่ละใบลง "กองซ้าย" หรือ "กองขวา" หรือคลิกที่กองบนโต๊ะได้ทันที:
                    </div>

                    {/* Quick batch assign buttons */}
                    <div className="flex items-center justify-center gap-2 mb-2 relative z-50">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const allLeft: Record<string, 'left' | 'right'> = {};
                          pendingDiscards.forEach((c) => { allLeft[c.id] = 'left'; });
                          setStep3Targets(allLeft);
                          sounds.playFlip();
                        }}
                        className="px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 hover:bg-emerald-800 active:scale-95 transition-all shadow cursor-pointer pointer-events-auto"
                      >
                        ⬅️ ลงกองซ้ายทั้งหมด
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const allRight: Record<string, 'left' | 'right'> = {};
                          pendingDiscards.forEach((c) => { allRight[c.id] = 'right'; });
                          setStep3Targets(allRight);
                          sounds.playFlip();
                        }}
                        className="px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 hover:bg-emerald-800 active:scale-95 transition-all shadow cursor-pointer pointer-events-auto"
                      >
                        ลงกองขวาทั้งหมด ➡️
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-700 relative z-50">
                      {effectiveOrder.map((cardId, index) => {
                        const card = pendingDiscards.find((c) => c.id === cardId);
                        if (!card) return null;
                        const target = step3Targets[cardId] || 'left';
                        return (
                          <div key={cardId} className="flex items-center justify-between bg-black/60 px-2.5 py-1 rounded-xl border border-amber-600/40 pointer-events-auto">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono text-amber-400">{index + 1}.</span>
                              <span className="text-base">{card.icon}</span>
                              <span className={`text-xs font-bold ${card.category === 'legal' ? 'text-emerald-300' : 'text-rose-400'}`}>
                                {card.name} (${card.value})
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (index === 0) return;
                                  const newOrder = [...effectiveOrder];
                                  [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                  setStep3Order(newOrder);
                                }}
                                className={`px-1.5 py-0.5 rounded border text-[10px] transition-all ${
                                  index === 0
                                    ? 'opacity-20 border-white/10 text-white/30 cursor-not-allowed'
                                    : 'bg-amber-950 border-amber-600/50 text-amber-300 hover:bg-amber-900 cursor-pointer'
                                }`}
                                title="เลื่อนขึ้น"
                              >
                                ⬆️
                              </button>
                              <button
                                type="button"
                                disabled={index === effectiveOrder.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (index === effectiveOrder.length - 1) return;
                                  const newOrder = [...effectiveOrder];
                                  [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                  setStep3Order(newOrder);
                                }}
                                className={`px-1.5 py-0.5 rounded border text-[10px] transition-all ${
                                  index === effectiveOrder.length - 1
                                    ? 'opacity-20 border-white/10 text-white/30 cursor-not-allowed'
                                    : 'bg-amber-950 border-amber-600/50 text-amber-300 hover:bg-amber-900 cursor-pointer'
                                }`}
                                title="เลื่อนลง"
                              >
                                ⬇️
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStep3Targets((prev) => ({ ...prev, [cardId]: 'left' }));
                                  sounds.playFlip();
                                }}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                  target === 'left'
                                    ? 'bg-emerald-700 text-white border-emerald-400 ring-1 ring-emerald-300'
                                    : 'bg-black/50 text-white/50 border-white/20 hover:border-white/40'
                                }`}
                              >
                                ⬅️ ซ้าย
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStep3Targets((prev) => ({ ...prev, [cardId]: 'right' }));
                                  sounds.playFlip();
                                }}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                  target === 'right'
                                    ? 'bg-emerald-700 text-white border-emerald-400 ring-1 ring-emerald-300'
                                    : 'bg-black/50 text-white/50 border-white/20 hover:border-white/40'
                                }`}
                              >
                                ขวา ➡️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playCrate();
                        const leftIds = effectiveOrder.filter((id) => (step3Targets[id] || 'left') === 'left');
                        const rightIds = effectiveOrder.filter((id) => step3Targets[id] === 'right');
                        const finalLeft = leftIds.length === 0 && rightIds.length === 0 ? pendingDiscards.map((c) => c.id) : leftIds;
                        if (onMarketFinalizeDiscards) {
                          onMarketFinalizeDiscards(finalLeft, rightIds);
                        } else if (onMarketSplitDiscard) {
                          onMarketSplitDiscard(finalLeft, rightIds);
                        }
                      }}
                      className="mt-2.5 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg border border-amber-300 active:scale-95 transition-all cursor-pointer relative z-50 pointer-events-auto ring-2 ring-amber-400/40"
                    >
                      ✅ ยืนยันการทิ้งการ์ด ({pendingDiscards.length} ใบ)
                    </button>
                  </div>
                )}

                {/* DEFENSIVE DECLARATION UI (Never get stuck in DECLARATION phase!) */}
                {(gameState.phase === 'DECLARATION' || gameState.phase === 'LOADING') && me?.hasPackedCrate && !me?.hasDeclared && !me?.isInspector && (
                  <div className="mt-3 w-full bg-[#1e0e07] border-2 border-amber-400 rounded-2xl p-3 text-center shadow-xl animate-fadeIn">
                    <div className="text-xs sm:text-sm font-bold text-amber-300 mb-1 flex items-center justify-center gap-1.5">
                      <span>🗣️</span>
                      <span>สบตาสารวัตร ({inspector?.name}) แล้วแจ้งสินค้าถูกกฎหมาย:</span>
                    </div>
                    <div className="text-[11px] text-amber-200/80 mb-2">
                      เกวียนของคุณมีของ {me?.crate?.cardsCount || 0} ชิ้น — เลือกว่าจะประกาศว่าเป็นสินค้าใด:
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {LEGAL_TYPES.map(({ type, name, icon, val }) => (
                        <button
                          key={type}
                          onClick={() => {
                            if (setDeclaredType) setDeclaredType(type);
                            if (onDeclareGoods) onDeclareGoods(type);
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow transition-all ${
                            (me?.crate?.declaredType || declaredType) === type
                              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-emerald-300 scale-105 ring-2 ring-emerald-400'
                              : 'bg-black/70 border-amber-600/60 text-amber-200 hover:border-amber-400'
                          }`}
                        >
                          <span className="text-base">{icon}</span>
                          <span>{name} (${val})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customs Checkpoint (Inspection & Negotiation) */}
                {(gameState.phase === 'INSPECTION' || gameState.phase === 'NEGOTIATION') && (
                  <div className="mt-3 w-full bg-[#1b0d06] border border-amber-500/70 rounded-2xl p-3 text-center shadow-inner">
                    <div className="font-['Press_Start_2P',monospace] text-[9px] text-amber-300 flex items-center justify-center gap-1.5 mb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>ด่านตรวจศุลกากร (CUSTOMS CHECKPOINT)</span>
                    </div>

                    {activeTargetPlayer && activeTargetPlayer.crate ? (
                      <div>
                        <div className="text-xs sm:text-sm text-white font-bold">
                          กำลังตรวจค้นรถของ: <span className="text-amber-300">{activeTargetPlayer.name}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 py-1.5">
                          {Array.from({ length: activeTargetPlayer.crate?.cardsCount || 0 }).map((_, i) => (
                            <div key={i} className="w-10 h-14 rounded-xl border border-amber-500/70 overflow-hidden shadow">
                              <img src="/cards/card_back.jpg" alt="Secret Crate Card" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-emerald-300 font-bold bg-emerald-950/90 rounded-lg py-1 px-3 inline-block border border-emerald-500/50">
                          คำแจ้ง: {(activeTargetPlayer.crate?.declaredType || '???').toUpperCase()} x{activeTargetPlayer.crate?.declaredCount || 0}
                        </div>

                        {/* Checkpoint Bribe Display */}
                        {(() => {
                          const targetBribes = (gameState.bribeOffers || []).filter(
                            (b) => b.targetPlayerId === activeTargetPlayer.id && b.status === 'pending'
                          );
                          return (
                            <div className="my-2.5 p-2.5 rounded-xl bg-black/75 border border-amber-500/50 text-left shadow-lg">
                              <div className="text-xs font-bold text-amber-300 pb-1.5 border-b border-amber-600/30 mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <span>💰</span>
                                  <span>ข้อเสนอสินบนสำหรับรถคันนี้ ({targetBribes.length} รายการ)</span>
                                </span>
                                <span className="text-[10.5px] text-amber-200/80 font-mono">
                                  ยอดรวม: ${targetBribes.reduce((s, b) => s + (b.cash || 0), 0)}
                                </span>
                              </div>

                              {targetBribes.length === 0 ? (
                                <div className="text-[11px] text-amber-100/50 italic text-center py-1.5 bg-black/40 rounded-lg border border-white/5">
                                  ยังไม่มีใครยื่นสินบนสำหรับรถของ {activeTargetPlayer.name} (ผู้เล่นทุกคนสามารถยื่นได้!)
                                </div>
                              ) : (
                                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-700">
                                  {targetBribes.map((b) => {
                                    const briber = gameState.players?.find((p) => p.id === b.fromPlayerId);
                                    const isPass = b.intent === 'pass';
                                    return (
                                      <div
                                        key={b.id}
                                        className={`p-2 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs shadow transition-all ${
                                          isPass
                                            ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200'
                                            : 'bg-rose-950/70 border-rose-500/70 text-rose-200'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <span className="text-xl">{briber?.avatar || '👤'}</span>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-bold text-white text-xs">{briber?.name || 'ผู้เล่น'}</span>
                                              <span
                                                className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded ${
                                                  isPass
                                                    ? 'bg-emerald-800 text-emerald-100 border border-emerald-400/60'
                                                    : 'bg-rose-800 text-rose-100 border border-rose-400/60'
                                                }`}
                                              >
                                                {isPass ? '🟢 ขอให้ปล่อยผ่าน' : '🔴 ขอให้เปิดตรวจจับ!'}
                                              </span>
                                              <span className="font-mono font-extrabold text-amber-300 text-xs">
                                                ${b.cash}
                                              </span>
                                            </div>
                                            {b.message && (
                                              <div className="text-[10.5px] italic opacity-90 mt-0.5 truncate max-w-xs">
                                                "{b.message}"
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Inspector Click to Accept This Specific Bribe! */}
                                        {me?.isInspector && onResolveInspection && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              try { sounds.playCoin(); } catch (_) {}
                                              onResolveInspection(
                                                activeTargetPlayer.id,
                                                isPass ? 'pass' : 'inspect',
                                                b.id
                                              );
                                            }}
                                            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer pointer-events-auto relative z-50 ${
                                              isPass
                                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black border border-emerald-300 ring-1 ring-emerald-300'
                                                : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white border border-rose-300 ring-1 ring-rose-300'
                                            }`}
                                          >
                                            <span>{isPass ? '🤝' : '🚨'}</span>
                                            <span>รับ ${b.cash} & {isPass ? 'ปล่อยผ่าน' : 'ตรวจจับ!'}</span>
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Inspector Standalone Action Controls */}
                        {me?.isInspector && onResolveInspection && (
                          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2.5 pt-2 border-t border-amber-600/30 relative z-50">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                try { sounds.playGavel(); } catch (_) {}
                                if (activeTargetPlayer && onResolveInspection) {
                                  onResolveInspection(activeTargetPlayer.id, 'inspect');
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-700 to-rose-800 hover:from-rose-600 hover:to-rose-700 text-white font-extrabold text-xs shadow-md border border-rose-400 active:scale-95 transition-all cursor-pointer pointer-events-auto relative z-50"
                            >
                              🔍 สั่งเปิดตรวจค้นเอง (ไม่รับสินบน)
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                try { sounds.playStamp(); } catch (_) {}
                                if (activeTargetPlayer && onResolveInspection) {
                                  onResolveInspection(activeTargetPlayer.id, 'pass');
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold text-xs shadow-md border border-emerald-400 active:scale-95 transition-all cursor-pointer pointer-events-auto relative z-50"
                            >
                              🕊️ ปล่อยผ่านเอง (ไม่รับสินบน)
                            </button>
                          </div>
                        )}

                        {/* Merchant Universal Bribe Action Button */}
                        {!me?.isInspector && (
                          <div className="mt-2.5 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openBribeModalFor(activeTargetPlayer.id);
                              }}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg border border-amber-300 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <span>💰</span>
                              <span>
                                {activeTargetPlayer.id === myPlayerId
                                  ? 'ยื่นสินบนขอผ่านทางด่วน'
                                  : `ยื่นสินบนแทรกแซง (ขอให้ปล่อย หรือ ขอให้ตรวจจับ ${activeTargetPlayer.name})`}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic py-1.5">
                        {me?.isInspector ? '👉 คลิกเลือกรถของผู้เล่นรอบโต๊ะเพื่อเริ่มตรวจค้น' : 'รอให้นายอำเภอเลือกเป้าหมายตรวจค้น...'}
                      </div>
                    )}
                  </div>
                )}

                {/* Round End Button */}
                {gameState.phase === 'ROUND_END' && me?.isInspector && onNextRound && (
                  <div className="mt-3 text-center">
                    <button
                      onClick={onNextRound}
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-xs rounded-xl shadow-lg border border-amber-300 hover:scale-105 active:scale-95 transition-all"
                    >
                      เริ่มรอบถัดไป ➔
                    </button>
                  </div>
                )}

              </div>

              {/* Mid-Right Opponent */}
              <div className="w-36 sm:w-44 flex justify-end shrink-0">
                {rightOpponents.map((p) => renderOpponentStation(p))}
              </div>

            </div>

            {/* TABLE BOTTOM FELT: Active Player's Warehouse & Crate */}
            {me && (
              <div className="w-full mt-1.5 pt-1.5 border-t border-amber-500/25 flex flex-col sm:flex-row items-center justify-between gap-2 px-2 z-10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{me.avatar}</span>
                  <div>
                    <div className="font-bold text-xs text-amber-200 flex items-center gap-1.5">
                      <span>{me.name}</span>
                      <span className="text-[7.5px] bg-amber-500 text-black px-1 py-0.2 rounded font-extrabold">YOU</span>
                    </div>
                    <div className="font-mono text-[10px] text-emerald-400 font-bold">
                      💵 ${me.cash}
                    </div>
                  </div>
                </div>

                {/* Your 5 Goods Piles on Table Felt */}
                <div className="flex flex-col items-center">
                  <div className="text-[7.5px] font-['Press_Start_2P',monospace] text-amber-300/80 mb-0.5">
                    YOUR GOODS PILES
                  </div>
                  {renderGoodsStacks(me)}
                </div>

                {/* Your Crate status */}
                {me.crate && !me.isInspector && (
                  <div className="bg-[#1f0f08] border border-amber-600/70 rounded-lg px-2.5 py-1 text-center shadow">
                    <span className="text-[10px] font-bold text-amber-300">
                      📦 เกวียน: {me.crate.cardsCount} ชิ้น ({theme.legalGoods[me.crate.declaredType]?.name || me.crate.declaredType})
                    </span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* === COLUMN 3 (RIGHT): SLIM PHASE TRACKER & TACTICS === */}
        <div className="w-full lg:w-28 xl:w-32 flex flex-col bg-black/85 border-2 border-[#5c3e21] rounded-xl p-2 shadow-2xl backdrop-blur-md shrink-0 justify-between min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            {/* Header */}
            <div className="pb-1 border-b border-amber-600/40 text-center shrink-0">
              <div className="font-['Press_Start_2P',monospace] text-[7.5px] text-amber-300">
                PHASE
              </div>
            </div>

            {/* Vertical Mini-Phase Steps */}
            <div className="flex flex-col gap-1">
              {[
                { id: 'MARKET', icon: '🛒', name: 'ตลาด' },
                { id: 'LOADING', icon: '📦', name: 'จัดของ' },
                { id: 'DECLARATION', icon: '🗣️', name: 'แจ้งยอด' },
                { id: 'INSPECTING', icon: '🔍', name: 'ตรวจค้น' },
              ].map((step) => {
                const isActive =
                  gameState.phase === step.id ||
                  (step.id === 'INSPECTING' &&
                    (gameState.phase === 'INSPECTION' ||
                      gameState.phase === 'NEGOTIATION' ||
                      gameState.phase === 'INSPECTING' ||
                      gameState.phase === 'INSPECTION_REVEAL'));
                return (
                  <div
                    key={step.id}
                    className={`py-1 px-1.5 rounded-lg border text-center transition-all ${
                      isActive
                        ? 'bg-amber-600/90 border-amber-300 text-black font-extrabold shadow scale-105 ring-1 ring-amber-300 animate-pulse'
                        : 'bg-black/50 border-amber-900/30 text-amber-200/50'
                    }`}
                  >
                    <div className="text-sm leading-none">{step.icon}</div>
                    <div className="text-[7.5px] font-bold mt-0.5">{step.name}</div>
                  </div>
                );
              })}
            </div>

            {/* Quick Bribe Console (or Inspector Status for Inspector) */}
            {activeTargetPlayer && (
              me?.isInspector ? (
                <div className="mt-1 bg-[#1b0d06] border border-amber-500/60 rounded-lg p-1.5 text-center">
                  <div className="text-[8px] text-amber-300 font-bold leading-tight">
                    ⭐ สารวัตร
                  </div>
                  <div className="text-[7px] text-amber-100/70 mt-0.5">
                    ด่านตรวจ
                  </div>
                </div>
              ) : (
                <div className="mt-1 bg-[#1b0d06] border border-amber-600/60 rounded-lg p-1.5 text-center">
                  <div className="text-[7.5px] text-amber-300 font-bold mb-1">
                    สินบนด่วน:
                  </div>
                  <div className="grid grid-cols-2 gap-1 mb-1">
                    {[1, 3, 5, 10].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          const isSelf = activeTargetPlayer.id === myPlayerId;
                          const intent = isSelf ? 'pass' : 'inspect';
                          const msg = isSelf ? 'สินบนขอผ่านทางด่วน' : 'สินบนขอให้ช่วยตรวจค้นคนนี้';
                          if (onOfferUniversalBribe) {
                            onOfferUniversalBribe(activeTargetPlayer.id, intent, amt, msg);
                          } else if (onOfferBribe) {
                            onOfferBribe(activeTargetPlayer.id, amt);
                          }
                          sounds.playCoin();
                        }}
                        className="py-0.5 rounded bg-amber-950 hover:bg-amber-900 border border-amber-500/70 text-amber-300 text-[9px] font-mono font-bold active:scale-95 cursor-pointer"
                      >
                        +${amt}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => openBribeModalFor(activeTargetPlayer.id)}
                    className="w-full py-0.5 bg-amber-600 hover:bg-amber-500 text-black text-[8px] font-extrabold rounded border border-amber-300 transition-all cursor-pointer shadow"
                  >
                    กำหนดเอง ⚙️
                  </button>
                </div>
              )
            )}
          </div>

          <div className="mt-1 pt-1 border-t border-amber-600/30 text-[8px] text-amber-300/60 text-center shrink-0">
            R{gameState.currentRound}/{gameState.totalRounds || 6}
          </div>
        </div>

      </div>

      {/* 4. BOTTOM DOCK: YOUR HAND OF CARDS & CRATE PACKING */}
      {me && (
        <div className="relative z-20 w-full bg-black/95 border-t-2 border-amber-600/80 rounded-xl p-1.5 sm:p-2 shadow-2xl shrink-0">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            
            {/* Interactive Crate Packing Tray in LOADING phase */}
            {gameState.phase === 'LOADING' && !me.isInspector && !me.hasPackedCrate && onPackCrate && (
              <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-2.5 bg-[#1b0d06] p-2 sm:p-2.5 rounded-xl border border-amber-600/70 shadow">
                {/* Visual Tray with 5 slots */}
                <div className="flex items-center gap-1.5">
                  <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1 mr-1">
                    <span>📦</span>
                    <span>ลังไม้:</span>
                  </div>
                  {Array.from({ length: 5 }).map((_, slotIdx) => {
                    const cardId = packedCrateCardIds[slotIdx];
                    const card = cardId ? me.hand?.find((c) => c.id === cardId) : null;
                    return (
                      <div
                        key={slotIdx}
                        onClick={
                          cardId
                            ? () => {
                                setPackedCrateCardIds((prev) => prev.filter((id) => id !== cardId));
                                sounds.playFlip();
                              }
                            : undefined
                        }
                        title={card ? `คลิกเพื่อนำ ${card.name} ออกจากลังคืนสู่มือ` : 'ช่องว่าง (คลิกการ์ดในมือเพื่อใส่ลงลัง)'}
                        className={`w-11 h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                          card
                            ? 'border-amber-400 bg-amber-950/90 cursor-pointer hover:scale-105 shadow-md ring-1 ring-amber-400'
                            : 'border-dashed border-white/20 bg-black/40 text-white/30 text-[10px]'
                        }`}
                      >
                        {card ? (
                          <div className="flex flex-col items-center text-center leading-none p-0.5">
                            <span className="text-base">{card.icon}</span>
                            <span className="text-[8px] font-bold text-amber-200 truncate max-w-[40px] mt-0.5">
                              {card.name}
                            </span>
                            <span className="text-[7px] text-rose-400 mt-1 font-bold">✕ เอาออก</span>
                          </div>
                        ) : (
                          <span className="font-mono">+{slotIdx + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Sealing Button & Declaration Picker */}
                <div className="flex items-center gap-2">
                  {!isSealingCrate ? (
                    <button
                      disabled={packedCrateCardIds.length < 1 || packedCrateCardIds.length > 5}
                      onClick={() => {
                        setIsSealingCrate(true);
                        sounds.playLatch();
                      }}
                      className={`px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 ${
                        packedCrateCardIds.length >= 1 && packedCrateCardIds.length <= 5
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:scale-105 active:scale-95 ring-2 ring-amber-300 cursor-pointer'
                          : 'bg-white/10 text-white/30 cursor-not-allowed'
                      }`}
                    >
                      <span>🔒</span>
                      <span>ปิดผนึกลังไม้ ({packedCrateCardIds.length}/5 ใบ)</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 bg-black/95 p-2 rounded-xl border-2 border-amber-400 shadow-xl animate-fadeIn">
                      <span className="text-[10px] text-amber-300 font-bold mr-1">สบตาสารวัตรแล้วแจ้ง:</span>
                      {LEGAL_TYPES.map(({ type, name, icon, val }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            if (setDeclaredType) setDeclaredType(type);
                            if (onPackCrate) onPackCrate(packedCrateCardIds, type, packedCrateCardIds.length);
                            setIsSealingCrate(false);
                            setPackedCrateCardIds([]);
                          }}
                          className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-amber-100 border border-amber-400/80 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 shadow transition-all cursor-pointer"
                        >
                          <span>{icon}</span>
                          <span>{name} (${val})</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setIsSealingCrate(false)}
                        className="px-2 py-1 text-[10px] text-white/60 hover:text-white rounded bg-white/10 ml-1 cursor-pointer"
                        title="กลับไปแก้ไขลังไม้"
                      >
                        ↩️ ยกเลิก
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Declare Goods After Packing (Defensive Fallback) */}
            {!me.isInspector && me.hasPackedCrate && !me.hasDeclared && (
              <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3 bg-[#1e0e07] p-3 rounded-2xl border-2 border-amber-400 shadow-xl animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🗣️</span>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-amber-300">
                      บรรจุลงซองแล้ว ({me.crate?.cardsCount || 0} ชิ้น) — เลือกว่าจะประกาศว่าเป็นสินค้าใด:
                    </div>
                    <div className="text-[10px] text-amber-200/70">
                      สบตาสารวัตร ({inspector?.name}) แล้วกดเลือกสินค้าถูกกฎหมาย:
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {LEGAL_TYPES.map(({ type, name, icon, val }) => (
                    <button
                      key={type}
                      onClick={() => {
                        if (setDeclaredType) setDeclaredType(type);
                        if (onDeclareGoods) onDeclareGoods(type);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-amber-100 border border-amber-400/80 font-bold text-xs flex items-center gap-1.5 shadow hover:scale-105 active:scale-95 transition-all"
                    >
                      <span className="text-base">{icon}</span>
                      <span>{name} (${val})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Packing & Declaration Completed */}
            {!me.isInspector && me.hasPackedCrate && me.hasDeclared && (
              <div className="w-full lg:w-auto flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/70 p-2.5 rounded-xl text-emerald-200 text-xs shadow">
                <span className="text-xl">✅</span>
                <div>
                  <span className="font-bold">ปิดผนึกลัง & แจ้งสารวัตรแล้ว: </span>
                  <span className="text-emerald-300 font-extrabold">
                    {theme.legalGoods[me.crate?.declaredType || 'apples']?.name || me.crate?.declaredType} x{me.crate?.declaredCount}
                  </span>
                  <span className="text-[10px] text-emerald-400/70 ml-1.5">
                    (รอสารวัตรดำเนินการตรวจค้น)
                  </span>
                </div>
              </div>
            )}

            {/* Center: Hand of Cards using HandDragZone with Hold-to-Drag & Concentric Coins */}
            <div className="flex-1 w-full flex items-center justify-center">
              {onToggleSelect && onSelectMultiple && (
                <HandDragZone
                  cards={me?.hand || []}
                  selectedCardIds={gameState.phase === 'LOADING' && !me.isInspector && !me.hasPackedCrate ? packedCrateCardIds : selectedCardIds}
                  isLocked={me.isInspector || me.hasPackedCrate || (gameState.phase !== 'LOADING' && !isMyMarketTurn)}
                  themeCrateTitle="ซอง/ลังสินค้าของคุณ"
                  isStealthMode={isStealthMode}
                  onToggleSelect={(cardId) => {
                    if (gameState.phase === 'LOADING' && !me.isInspector && !me.hasPackedCrate) {
                      if (packedCrateCardIds.includes(cardId)) {
                        setPackedCrateCardIds((prev) => prev.filter((id) => id !== cardId));
                        sounds.playFlip();
                      } else if (packedCrateCardIds.length < 5) {
                        setPackedCrateCardIds((prev) => [...prev, cardId]);
                        sounds.playLatch();
                      }
                    } else if (onToggleSelect) {
                      onToggleSelect(cardId);
                    }
                  }}
                  onSelectMultiple={onSelectMultiple}
                  onDropIntoCrate={
                    gameState.phase === 'LOADING' && !me.isInspector && !me.hasPackedCrate
                      ? (ids) => {
                          setPackedCrateCardIds((prev) => Array.from(new Set([...prev, ...ids])).slice(0, 5));
                          sounds.playLatch();
                        }
                      : undefined
                  }
                />
              )}
            </div>

            {/* Right: Quick Action Hint */}
            <div className="hidden lg:block text-right min-w-[150px]">
              <div className="text-xs text-amber-200 font-mono font-bold">
                {selectedCardIds.length > 0 ? `เลือกไว้ ${selectedCardIds.length} ใบ` : 'คลิกเพื่อเลือก / กดค้างเพื่อลาก'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {gameState.phase === 'LOADING'
                  ? 'บรรจุ 1–5 ใบลงเกวียน'
                  : gameState.phase === 'MARKET'
                  ? 'ทิ้งสูงสุด 5 ใบแล้วจั่วคืน'
                  : 'รอบการเจรจา 1920s'}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* === UNIVERSAL BRIBE POPUP MODAL (Available to all players) === */}
      {isBribeModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn"
          onClick={() => setIsBribeModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#160b06] border-2 border-amber-500/80 rounded-2xl p-4 sm:p-5 shadow-[0_0_50px_rgba(245,158,11,0.35)] flex flex-col gap-3 text-left relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-amber-600/40">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤝</span>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-amber-300">
                    ยื่นข้อเสนอสินบน (Universal Bribe)
                  </h3>
                  <p className="text-[10.5px] text-amber-200/70">
                    ทุกคนสามารถยื่นสินบนให้นายอำเภอ ไม่ว่าจะเป็นรถของใครก็ตาม
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBribeModalOpen(false)}
                className="w-7 h-7 rounded-full bg-black/60 border border-amber-500/50 text-amber-300 hover:bg-amber-950 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 1. Target Merchant Selection */}
            <div>
              <label className="text-xs font-bold text-amber-300 block mb-1">
                🎯 1. เลือกเป้าหมายรถที่จะแทรกแซง:
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {gameState.players
                  ?.filter((p) => !p.isInspector)
                  .map((p) => {
                    const isSelected = p.id === universalBribeTargetId;
                    const isSelf = p.id === myPlayerId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setUniversalBribeTargetId(p.id);
                          const defaultIntent = isSelf ? 'pass' : 'inspect';
                          setUniversalBribeIntent(defaultIntent);
                          setUniversalBribeMsg(
                            defaultIntent === 'pass'
                              ? 'ปล่อยคันนี้ไปเถอะครับ มีแค่อาหารจริงๆ'
                              : 'ตรวจค้นมันเลยสารวัตร มีของเถื่อนแน่!'
                          );
                        }}
                        className={`p-2 rounded-xl border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600/30 border-amber-400 ring-2 ring-amber-400 shadow'
                            : 'bg-black/50 border-amber-900/40 hover:border-amber-700/60'
                        }`}
                      >
                        <span className="text-xl">{p.avatar || '👤'}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-white truncate">
                            {p.name} {isSelf && '(คุณ)'}
                          </div>
                          <div className="text-[9.5px] text-emerald-400 font-mono font-bold">
                            ${p.cash} | 📦 {p.crate?.cardsCount || 0}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* 2. Intent Selection: Pass vs Inspect */}
            <div>
              <label className="text-xs font-bold text-amber-300 block mb-1">
                ⚖️ 2. เจตนาของสินบน (ต้องการให้นายอำเภอทำอะไร?):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUniversalBribeIntent('pass');
                    setUniversalBribeMsg('ปล่อยคันนี้ไปเถอะครับ มีแค่อาหารจริงๆ');
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                    universalBribeIntent === 'pass'
                      ? 'bg-emerald-950/90 border-emerald-400 ring-2 ring-emerald-400 text-emerald-200'
                      : 'bg-black/50 border-white/10 text-white/50 hover:border-white/30'
                  }`}
                >
                  <span className="text-2xl">🕊️</span>
                  <div>
                    <div className="text-xs font-extrabold">ยื่นให้ "ปล่อยผ่าน"</div>
                    <div className="text-[9.5px] opacity-80">ช่วยตนเองหรือพันธมิตร</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUniversalBribeIntent('inspect');
                    setUniversalBribeMsg('ตรวจค้นมันเลยสารวัตร มีของเถื่อนแน่!');
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                    universalBribeIntent === 'inspect'
                      ? 'bg-rose-950/90 border-rose-400 ring-2 ring-rose-400 text-rose-200'
                      : 'bg-black/50 border-white/10 text-white/50 hover:border-white/30'
                  }`}
                >
                  <span className="text-2xl">🚨</span>
                  <div>
                    <div className="text-xs font-extrabold">ยื่นให้ "เปิดตรวจค้น!"</div>
                    <div className="text-[9.5px] opacity-80">แกล้งคู่แข่ง / หวังแบ่งค่าปรับ</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Bribe Cash Amount */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-amber-300">
                  💵 3. จำนวนเงินสินบน:
                </label>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  (เงินในมือคุณ: ${me?.cash || 0})
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 5, 10].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={(me?.cash || 0) < amt}
                    onClick={() => setUniversalBribeCash(amt)}
                    className={`px-3 py-1 rounded-lg border font-mono text-xs font-bold transition-all ${
                      universalBribeCash === amt
                        ? 'bg-amber-500 text-black border-amber-300 ring-1 ring-amber-300'
                        : 'bg-black/60 border-amber-800 text-amber-300 hover:bg-amber-950'
                    } ${(me?.cash || 0) < amt ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={(me?.cash || 0) <= 0}
                  onClick={() => setUniversalBribeCash(me?.cash || 0)}
                  className="px-3 py-1 rounded-lg border border-amber-600 bg-amber-950/80 text-amber-200 text-xs font-bold hover:bg-amber-900 cursor-pointer disabled:opacity-30"
                >
                  ทั้งหมด (${me?.cash || 0})
                </button>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-xs text-amber-200 font-bold">$</span>
                  <input
                    type="number"
                    min={1}
                    max={me?.cash || 0}
                    value={universalBribeCash}
                    onChange={(e) => setUniversalBribeCash(Math.max(1, Math.min(me?.cash || 0, parseInt(e.target.value) || 1)))}
                    className="w-16 px-2 py-1 bg-black/80 border border-amber-500/70 rounded-lg text-amber-300 font-mono text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* 4. Message Presets & Custom Input */}
            <div>
              <label className="text-xs font-bold text-amber-300 block mb-1">
                💬 4. ข้อความกระซิบหานายอำเภอ:
              </label>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {(universalBribeIntent === 'pass'
                  ? [
                      'ปล่อยคันนี้ไปเถอะครับ มีแค่อาหารจริงๆ',
                      'ช่วยปล่อยที คันนี้ของพวกเราเอง',
                      'รับเงินนี้ไป แล้วทำเป็นไม่เห็นนะสารวัตร',
                      'รอบหน้าจะตอบแทนให้อย่างงาม!',
                    ]
                  : [
                      'ตรวจค้นมันเลยสารวัตร มีของเถื่อนแน่!',
                      'อย่าไปเชื่อมัน ตรวจดูสิได้ค่าปรับแน่นอน',
                      'มีเงินให้ สารวัตรจัดมันเลย!',
                      'คันนี้แอบซ่อนของเถื่อนเต็มเกวียน!',
                    ]
                ).map((msg) => (
                  <button
                    key={msg}
                    type="button"
                    onClick={() => setUniversalBribeMsg(msg)}
                    className="px-2 py-0.5 text-[9.5px] rounded bg-black/60 border border-amber-700/50 text-amber-200/90 hover:border-amber-400 hover:text-white transition-all cursor-pointer truncate max-w-[210px]"
                  >
                    {msg}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={universalBribeMsg}
                onChange={(e) => setUniversalBribeMsg(e.target.value)}
                placeholder="พิมพ์ข้อความเจรจา..."
                className="w-full px-2.5 py-1.5 bg-black/80 border border-amber-500/60 rounded-xl text-xs text-amber-100 placeholder-amber-200/40 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-600/30">
              <button
                type="button"
                onClick={() => setIsBribeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-black/60 border border-white/20 text-white/70 hover:text-white text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!universalBribeTargetId || (me?.cash || 0) < universalBribeCash || universalBribeCash <= 0}
                onClick={handleSendUniversalBribe}
                className={`px-5 py-2 rounded-xl font-extrabold text-xs shadow-lg transition-all flex items-center gap-1.5 ${
                  universalBribeTargetId && (me?.cash || 0) >= universalBribeCash && universalBribeCash > 0
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black border border-amber-300 active:scale-95 cursor-pointer ring-2 ring-amber-300'
                    : 'bg-white/10 text-white/30 border border-white/10 cursor-not-allowed'
                }`}
              >
                <span>💰</span>
                <span>ยืนยันยื่นสินบน ${universalBribeCash}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
