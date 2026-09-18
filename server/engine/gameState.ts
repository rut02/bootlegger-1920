import {
  Card,
  Crate,
  BribeOffer,
  GamePhase,
  InspectionResult,
  InspectionAnimationState,
  LegalGoodsType,
  Player,
  PublicGameState,
  GameLogEntry,
  GameScoreResult,
} from '../../shared/types.js';
import { THEMES, ThemeId } from '../../shared/themes.js';
import { HAND_LIMIT, INITIAL_PLAYER_CASH, MAX_CRATE_CARDS, MIN_CRATE_CARDS } from '../../shared/cards.js';
import { DeckManager } from './deck.js';
import { settleDebt } from './settlement.js';
import { calculateScores } from './scoring.js';

export class GameEngine {
  public roomCode: string;
  public themeId: ThemeId = 'mafia_1920';
  public phase: GamePhase = 'LOBBY';
  public currentRound: number = 0;
  public roundsPerPlayer: number = 1;
  public totalRounds: number = 0;
  public inspectorIndex: number = 0;
  public activeInspectTargetId: string | null = null;
  public activeMarketPlayerId: string | null = null;
  public marketTurnOrder: string[] = [];
  public players: Player[] = [];
  public deck: DeckManager;
  public bribeOffers: BribeOffer[] = [];
  public inspectionAnimation: InspectionAnimationState | null = null;
  public lastInspectionResult: InspectionResult | null = null;
  public logs: GameLogEntry[] = [];
  public scores: GameScoreResult[] = [];
  public processedMerchantsThisRound: Set<string> = new Set();
  public onStateChanged?: () => void;

  private botTimer: NodeJS.Timeout | null = null;

  constructor(roomCode: string, themeId: ThemeId = 'mafia_1920') {
    this.roomCode = roomCode;
    this.themeId = themeId;
    this.deck = new DeckManager(themeId);
  }

  public setTheme(themeId: ThemeId): void {
    if (this.phase === 'LOBBY') {
      this.themeId = themeId;
      this.deck = new DeckManager(themeId);
      this.addLog(`เปลี่ยนธีมห้องเป็น "${THEMES[themeId].name}"`, 'info');
    }
  }

  public addLog(text: string, type: GameLogEntry['type'] = 'info'): void {
    this.logs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      text,
      type,
    });
    if (this.logs.length > 50) this.logs.shift();
  }

  public addPlayer(name: string, avatar: string, isBot: boolean = false): Player {
    const id = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPlayer: Player = {
      id,
      name,
      avatar,
      cash: INITIAL_PLAYER_CASH,
      handCount: 0,
      hand: [],
      warehouse: {
        legal: { flour: [], apples: [], coffee: [], cigars: [] },
        contrabandCount: 0,
        contrabandCards: [],
      },
      crate: null,
      hasDeclared: false,
      hasPackedCrate: false,
      isInspector: false,
      isReady: isBot,
      isConnected: true,
      isBot,
    };
    this.players.push(newPlayer);
    this.addLog(`${name} เข้าร่วมห้องเกม`, 'info');
    return newPlayer;
  }

  public removePlayer(playerId: string): void {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx !== -1) {
      const p = this.players[idx];
      this.addLog(`${p.name} ออกจากห้องเกม`, 'info');
      this.players.splice(idx, 1);
    }
  }

  public startGame(roundsPerPlayer: number = 1): boolean {
    if (this.players.length < 2) return false;

    this.roundsPerPlayer = roundsPerPlayer;
    this.totalRounds = this.players.length * roundsPerPlayer;
    this.currentRound = 1;
    this.deck.reset(this.themeId);

    // Reset players & deal 6 cards
    for (const player of this.players) {
      player.cash = INITIAL_PLAYER_CASH;
      player.warehouse = {
        legal: { flour: [], apples: [], coffee: [], cigars: [] },
        contrabandCount: 0,
        contrabandCards: [],
      };
      player.hand = this.deck.drawCards(HAND_LIMIT);
      player.handCount = player.hand.length;
      player.crate = null;
      player.hasDeclared = false;
      player.hasPackedCrate = false;
      player.isInspector = false;
    }

    // Randomize initial inspector
    this.inspectorIndex = Math.floor(Math.random() * this.players.length);
    this.players[this.inspectorIndex].isInspector = true;

    const theme = THEMES[this.themeId];
    this.addLog(
      `เกมเริ่มต้นแล้ว! ธีม: ${theme.name} | ${theme.inspectorTitle} คนแรกคือ ${this.getInspector().name}`,
      'alert'
    );

    this.startMarketPhase();
    return true;
  }

  public getInspector(): Player {
    return this.players[this.inspectorIndex];
  }

  public getMerchants(): Player[] {
    return this.players.filter((p) => !p.isInspector);
  }

  // --- Phase 1: Sequential Market Phase ---
  private startMarketPhase(): void {
    this.phase = 'MARKET';
    this.processedMerchantsThisRound.clear();
    this.bribeOffers = [];
    this.lastInspectionResult = null;
    this.inspectionAnimation = null;

    // Ensure Left and Right discard piles have at least 1 face-up card seeded
    this.deck.ensureSeeded();

    for (const p of this.players) {
      p.hasPackedCrate = false;
      p.hasDeclared = false;
      p.crate = null;
      p.pendingDiscards = [];
    }

    // Build clockwise order starting to the left of the Inspector
    this.marketTurnOrder = [];
    const n = this.players.length;
    for (let i = 1; i < n; i++) {
      const idx = (this.inspectorIndex + i) % n;
      this.marketTurnOrder.push(this.players[idx].id);
    }

    this.activeMarketPlayerId = this.marketTurnOrder[0] || null;

    const activePlayer = this.players.find((p) => p.id === this.activeMarketPlayerId);
    this.addLog(
      `รอบที่ ${this.currentRound}/${this.totalRounds}: เริ่มตลาดสินค้าตามลำดับ - ตาของ ${activePlayer?.name} เลือกเปลี่ยนการ์ด`,
      'info'
    );

    this.scheduleBotAction();
  }

  public marketAction(
    playerId: string,
    discardCardIds: string[],
    discardPile: 'left' | 'right' = 'left',
    drawSource: 'deck' | 'left' | 'right' = 'deck'
  ): boolean {
    if (this.phase !== 'MARKET' || this.activeMarketPlayerId !== playerId) return false;
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.isInspector || !player.hand) return false;

    if (discardCardIds.length > 5) return false;

    // Remove discarded cards from hand
    const discardedCards: Card[] = [];
    player.hand = player.hand.filter((card) => {
      if (discardCardIds.includes(card.id)) {
        discardedCards.push(card);
        return false;
      }
      return true;
    });

    // Place discarded cards face-up onto chosen discard pile
    if (discardedCards.length > 0) {
      this.deck.discardToPile(discardedCards, discardPile);
      this.addLog(
        `${player.name} ทิ้งการ์ด ${discardedCards.length} ใบหงายหน้าลงกอง${discardPile === 'left' ? 'ซ้าย' : 'ขวา'}`,
        'info'
      );
    }

    // Draw cards back up to 6
    const drawCount = HAND_LIMIT - player.hand.length;
    if (drawCount > 0) {
      if (drawSource === 'left' || drawSource === 'right') {
        const picked = this.deck.drawFromDiscard(drawSource);
        if (picked) {
          player.hand.push(picked);
          this.addLog(`${player.name} หยิบการ์ด ${picked.icon} ${picked.name} จากกองทิ้ง${drawSource === 'left' ? 'ซ้าย' : 'ขวา'}`, 'info');
        }
      }

      // Draw remainder from main draw deck
      const remainingDraw = HAND_LIMIT - player.hand.length;
      if (remainingDraw > 0) {
        const drawn = this.deck.drawCards(remainingDraw);
        player.hand.push(...drawn);
      }
    }
    player.handCount = player.hand.length;

    this.advanceMarketTurn(playerId);
    return true;
  }

  // Step 1: Set aside 0 to 5 cards to discard from hand
  public marketSetAsideDiscards(playerId: string, discardCardIds: string[]): boolean {
    if (this.phase !== 'MARKET' || this.activeMarketPlayerId !== playerId) return false;
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.isInspector || !player.hand) return false;

    if (discardCardIds.length > 5) return false;

    // If skipping discard (0 cards)
    if (discardCardIds.length === 0) {
      player.pendingDiscards = [];
      this.addLog(`${player.name} เลือกที่จะไม่เปลี่ยนการ์ดในรอบนี้`, 'info');
      this.advanceMarketTurn(playerId);
      return true;
    }

    const setAside: Card[] = [];
    player.hand = player.hand.filter((card) => {
      if (discardCardIds.includes(card.id)) {
        setAside.push(card);
        return false;
      }
      return true;
    });

    player.pendingDiscards = setAside;
    player.handCount = player.hand.length;

    this.addLog(
      `${player.name} พักการ์ดไว้ ${setAside.length} ใบ — เริ่มหยิบการ์ดใหม่เข้ามือให้ครบ`,
      'info'
    );

    this.notifyStateChanged();
    return true;
  }

  // Step 1 legacy wrapper: Split Market Discard (immediate discard)
  public marketSplitDiscard(
    playerId: string,
    leftCardIds: string[],
    rightCardIds: string[]
  ): boolean {
    if (this.phase !== 'MARKET' || this.activeMarketPlayerId !== playerId) return false;
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.isInspector || !player.hand) return false;

    const totalDiscard = leftCardIds.length + rightCardIds.length;
    if (totalDiscard > 5) return false;

    // Check no overlap between left and right
    const leftSet = new Set(leftCardIds);
    if (rightCardIds.some((id) => leftSet.has(id))) return false;

    const leftCards: Card[] = [];
    const rightCards: Card[] = [];

    player.hand = player.hand.filter((card) => {
      if (leftCardIds.includes(card.id)) {
        leftCards.push(card);
        return false;
      }
      if (rightCardIds.includes(card.id)) {
        rightCards.push(card);
        return false;
      }
      return true;
    });

    if (leftCards.length > 0) {
      this.deck.discardToPile(leftCards, 'left');
    }
    if (rightCards.length > 0) {
      this.deck.discardToPile(rightCards, 'right');
    }

    if (leftCards.length > 0 && rightCards.length > 0) {
      this.addLog(
        `${player.name} ทิ้งการ์ดลงกองซ้าย ${leftCards.length} ใบ และกองขวา ${rightCards.length} ใบ`,
        'info'
      );
    } else if (leftCards.length > 0) {
      this.addLog(
        `${player.name} ทิ้งการ์ด ${leftCards.length} ใบหงายหน้าลงกองซ้าย`,
        'info'
      );
    } else if (rightCards.length > 0) {
      this.addLog(
        `${player.name} ทิ้งการ์ด ${rightCards.length} ใบหงายหน้าลงกองขวา`,
        'info'
      );
    }

    player.handCount = player.hand.length;

    // If discarded 0 cards and already has 6, advance immediately
    if (player.hand.length >= HAND_LIMIT) {
      this.advanceMarketTurn(playerId);
    } else {
      this.notifyStateChanged();
    }
    return true;
  }

  // Step 1 legacy wrapper: Discard 0 to 5 cards to a single chosen pile
  public marketDiscard(
    playerId: string,
    discardCardIds: string[],
    discardPile: 'left' | 'right' = 'left'
  ): boolean {
    if (discardPile === 'right') {
      return this.marketSplitDiscard(playerId, [], discardCardIds);
    }
    return this.marketSplitDiscard(playerId, discardCardIds, []);
  }

  // Step 2: Draw 1 card interactively from chosen source
  public marketDrawSingle(
    playerId: string,
    source: 'deck' | 'left' | 'right'
  ): Card | null {
    if (this.phase !== 'MARKET' || this.activeMarketPlayerId !== playerId) return null;
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.isInspector || !player.hand) return null;

    if (player.hand.length >= HAND_LIMIT) return null;

    let drawnCard: Card | null = null;
    if (source === 'left' || source === 'right') {
      drawnCard = this.deck.drawFromDiscard(source);
      if (drawnCard) {
        player.hand.push(drawnCard);
        this.addLog(`${player.name} หยิบ ${drawnCard.icon} ${drawnCard.name} จากกองทิ้ง${source === 'left' ? 'ซ้าย' : 'ขวา'}`, 'info');
      }
    } else {
      const drawn = this.deck.drawCards(1);
      if (drawn.length > 0) {
        drawnCard = drawn[0];
        player.hand.push(drawnCard);
        this.addLog(`${player.name} จั่วการ์ด 1 ใบจากกองคว่ำหน้า`, 'info');
      }
    }

    player.handCount = player.hand.length;

    // If reached 6 cards:
    if (player.hand.length >= HAND_LIMIT) {
      const pending = player.pendingDiscards || [];
      if (pending.length === 0) {
        this.advanceMarketTurn(playerId);
      } else {
        // Ready for Step 3 (distribute set-aside discards)
        this.addLog(`${player.name} จั่วการ์ดครบ 6 ใบแล้ว — เข้าสู่ขั้นตอนเลือกกองทิ้ง`, 'info');
        this.notifyStateChanged();
      }
    } else {
      this.notifyStateChanged();
    }

    return drawnCard;
  }

  // Step 3: Finalize and distribute set-aside discarded cards to left and right piles
  public marketFinalizeDiscards(
    playerId: string,
    leftCardIds: string[],
    rightCardIds: string[]
  ): boolean {
    if (this.phase !== 'MARKET') return false;
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.isInspector) return false;

    // Graceful check: Player must be active or must have pending discards to finalize
    if (this.activeMarketPlayerId && this.activeMarketPlayerId !== playerId && (!player.pendingDiscards || player.pendingDiscards.length === 0)) {
      return false;
    }

    const pending = player.pendingDiscards || [];
    const pendingMap = new Map(pending.map((c) => [c.id, c]));

    const leftCards: Card[] = [];
    for (const id of leftCardIds) {
      const card = pendingMap.get(id);
      if (card) {
        leftCards.push(card);
        pendingMap.delete(id);
      }
    }

    const rightCards: Card[] = [];
    for (const id of rightCardIds) {
      const card = pendingMap.get(id);
      if (card) {
        rightCards.push(card);
        pendingMap.delete(id);
      }
    }

    // Any remaining in pendingMap dump into left pile
    for (const card of pendingMap.values()) {
      leftCards.push(card);
    }

    if (leftCards.length > 0) {
      this.deck.discardToPile(leftCards, 'left');
    }
    if (rightCards.length > 0) {
      this.deck.discardToPile(rightCards, 'right');
    }

    if (leftCards.length > 0 && rightCards.length > 0) {
      this.addLog(
        `${player.name} นำการ์ดที่ทิ้งลงกองซ้าย ${leftCards.length} ใบ และกองขวา ${rightCards.length} ใบ`,
        'info'
      );
    } else if (leftCards.length > 0) {
      this.addLog(
        `${player.name} นำการ์ดที่ทิ้ง ${leftCards.length} ใบหงายหน้าลงกองซ้าย`,
        'info'
      );
    } else if (rightCards.length > 0) {
      this.addLog(
        `${player.name} นำการ์ดที่ทิ้ง ${rightCards.length} ใบหงายหน้าลงกองขวา`,
        'info'
      );
    }

    player.pendingDiscards = [];

    // Ensure player hand is full up to 6 cards
    if (player.hand) {
      const needed = HAND_LIMIT - player.hand.length;
      if (needed > 0) {
        const drawn = this.deck.drawCards(needed);
        player.hand.push(...drawn);
        player.handCount = player.hand.length;
      }
    }

    this.advanceMarketTurn(playerId);
    return true;
  }

  // Auto-fill when timer expires
  public marketAutoDrawFill(playerId: string): boolean {
    if (this.phase !== 'MARKET' || this.activeMarketPlayerId !== playerId) return false;
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.isInspector || !player.hand) return false;

    const needed = HAND_LIMIT - player.hand.length;
    if (needed > 0) {
      const drawn = this.deck.drawCards(needed);
      player.hand.push(...drawn);
      player.handCount = player.hand.length;
      this.addLog(`หมดเวลา! ระบบช่วยจั่วการ์ด ${needed} ใบจากกองคว่ำหน้าให้ ${player.name}`, 'alert');
    }

    const pending = player.pendingDiscards || [];
    if (pending.length > 0) {
      this.deck.discardToPile(pending, 'left');
      player.pendingDiscards = [];
    }

    this.advanceMarketTurn(playerId);
    return true;
  }

  private advanceMarketTurn(playerId: string): void {
    const currentIdx = this.marketTurnOrder.indexOf(playerId);
    if (currentIdx !== -1 && currentIdx < this.marketTurnOrder.length - 1) {
      this.activeMarketPlayerId = this.marketTurnOrder[currentIdx + 1];
      const nextP = this.players.find((p) => p.id === this.activeMarketPlayerId);
      this.addLog(`ตาของ ${nextP?.name} เลือกเปลี่ยนการ์ดที่ตลาด`, 'info');
      this.scheduleBotAction();
    } else {
      this.activeMarketPlayerId = null;
      this.startLoadingPhase();
    }
    this.notifyStateChanged();
  }

  // --- Phase 2: Loading Phase ---
  private startLoadingPhase(): void {
    this.phase = 'LOADING';
    const theme = THEMES[this.themeId];
    this.addLog(`เข้าสู่เฟสจัดของขึ้นรถ/เกวียน - คนขับรถกำลังแอบเอาของขึ้น ${theme.crateTitle}`, 'info');

    this.scheduleBotAction();
  }

  public packCrate(playerId: string, cardIds: string[], declaredType?: LegalGoodsType): boolean {
    if (this.phase !== 'LOADING' && this.phase !== 'DECLARATION') return false;
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.isInspector || !player.hand) return false;

    if (cardIds.length < MIN_CRATE_CARDS || cardIds.length > MAX_CRATE_CARDS) return false;

    const crateCards: Card[] = [];
    player.hand = player.hand.filter((c) => {
      if (cardIds.includes(c.id)) {
        crateCards.push(c);
        return false;
      }
      return true;
    });

    if (crateCards.length !== cardIds.length) {
      player.hand.push(...crateCards);
      return false;
    }

    player.handCount = player.hand.length;

    // Determine declared goods type: user-provided -> first legal card -> fallback to 'apples'
    const finalDeclaredType =
      declaredType ||
      (crateCards.find((c) => c.category === 'legal')?.type as LegalGoodsType) ||
      'apples';

    player.crate = {
      playerId: player.id,
      cardsCount: crateCards.length,
      declaredType: finalDeclaredType,
      declaredCount: crateCards.length,
      cards: crateCards,
    };
    player.hasPackedCrate = true;
    player.hasDeclared = player.isBot ? true : Boolean(declaredType);

    const theme = THEMES[this.themeId];
    if (player.hasDeclared) {
      const declaredName = theme.legalGoods[finalDeclaredType]?.name || finalDeclaredType;
      this.addLog(
        `${player.name} จัดของใส่ลัง (${crateCards.length} ชิ้น) และแจ้งว่า: "${declaredName} ทั้งหมด ${crateCards.length} ชิ้นครับ"`,
        'info'
      );
    } else {
      this.addLog(
        `${player.name} จัดของใส่ซอง (${crateCards.length} ชิ้น) เรียบร้อยแล้ว — สบตาสารวัตรเพื่อแจ้งรายการสินค้า`,
        'info'
      );
    }

    const merchants = this.getMerchants();
    if (merchants.every((m) => m.hasPackedCrate)) {
      if (merchants.every((m) => m.hasDeclared)) {
        this.startNegotiationPhase();
      } else {
        this.startDeclarationPhase();
      }
    } else {
      this.scheduleBotAction();
    }

    this.notifyStateChanged();
    return true;
  }

  // --- Phase 3: Declaration Phase ---
  private startDeclarationPhase(): void {
    this.phase = 'DECLARATION';
    const theme = THEMES[this.themeId];
    this.addLog(`เข้าสู่เฟสแจ้งรายการสินค้า - ทุกคนต้องสบตา ${theme.inspectorTitle} แล้วแจ้งสินค้าถูกกฎหมาย!`, 'info');

    // Declare for all bots immediately if any undeclared
    const merchants = this.getMerchants();
    for (const m of merchants) {
      if (m.isBot && !m.hasDeclared && m.crate) {
        const legalCards = m.crate.cards?.filter((c) => c.category === 'legal') || [];
        const bestType = (legalCards[0]?.type as LegalGoodsType) || 'apples';
        m.crate.declaredType = bestType;
        m.crate.declaredCount = m.crate.cardsCount;
        m.hasDeclared = true;
      }
    }

    if (merchants.every((m) => m.hasDeclared)) {
      this.startNegotiationPhase();
      return;
    }

    this.scheduleBotAction();

    // Auto-advance safety fallback: if any merchant is undeclared after 10s, auto-declare and advance
    setTimeout(() => {
      if (this.phase === 'DECLARATION') {
        const remaining = this.getMerchants().filter((m) => !m.hasDeclared);
        for (const rm of remaining) {
          if (rm.crate) {
            const legalCards = rm.crate.cards?.filter((c) => c.category === 'legal') || [];
            const fallbackType = (legalCards[0]?.type as LegalGoodsType) || 'apples';
            rm.crate.declaredType = fallbackType;
            rm.crate.declaredCount = rm.crate.cardsCount;
            rm.hasDeclared = true;
            this.addLog(`${rm.name} แจ้งสินค้า: ${fallbackType} (${rm.crate.cardsCount} ชิ้น)`, 'info');
          }
        }
        this.startNegotiationPhase();
        this.notifyStateChanged();
      }
    }, 10000);
  }

  public declareGoods(playerId: string, declaredType: LegalGoodsType): boolean {
    if (this.phase !== 'DECLARATION' && this.phase !== 'LOADING') return false;
    const player = this.players.find((p) => p.id === playerId);
    if (!player || !player.crate) return false;

    player.crate.declaredType = declaredType;
    player.crate.declaredCount = player.crate.cardsCount;
    player.hasDeclared = true;

    const theme = THEMES[this.themeId];
    const declaredName = theme.legalGoods[declaredType]?.name || declaredType;

    this.addLog(
      `${player.name} สบตาสารวัตรและแจ้งว่า: "นี่คือ ${declaredName} ทั้งหมด ${player.crate.declaredCount} ชิ้นครับ!"`,
      'info'
    );

    const merchants = this.getMerchants();
    if (merchants.every((m) => m.hasDeclared && m.hasPackedCrate)) {
      this.startNegotiationPhase();
    } else {
      this.scheduleBotAction();
    }

    this.notifyStateChanged();
    return true;
  }

  // --- Phase 4: Negotiation & Universal Bribing ---
  private startNegotiationPhase(): void {
    this.phase = 'NEGOTIATION';
    this.processedMerchantsThisRound.clear();
    this.bribeOffers = [];

    const merchants = this.getMerchants();
    if (merchants.length > 0) {
      this.activeInspectTargetId = merchants[0].id;
      const theme = THEMES[this.themeId];
      this.addLog(
        `${theme.inspectorTitle} ${this.getInspector().name} กำลังตรวจรถของ ${merchants[0].name} (ทุกคนบนโต๊ะสามารถยื่นสินบนเชียร์ตรวจ/ปล่อยได้!)`,
        'alert'
      );
    }

    this.scheduleBotAction();
  }

  public setActiveInspectTarget(targetPlayerId: string): boolean {
    if (this.phase !== 'NEGOTIATION') return false;
    const merchant = this.players.find((p) => p.id === targetPlayerId && !p.isInspector);
    if (!merchant || this.processedMerchantsThisRound.has(targetPlayerId)) return false;

    this.activeInspectTargetId = targetPlayerId;
    this.addLog(`สารวัตรหันไปตรวจรถของ ${merchant.name}`, 'info');
    this.scheduleBotAction();
    this.notifyStateChanged();
    return true;
  }

  // Universal Bribe: Anyone can bribe the Inspector regarding any target
  public offerUniversalBribe(
    fromPlayerId: string,
    targetPlayerId: string,
    intent: 'inspect' | 'pass',
    cash: number,
    message: string = ''
  ): boolean {
    if (this.phase !== 'NEGOTIATION') return false;
    const fromPlayer = this.players.find((p) => p.id === fromPlayerId);
    const targetPlayer = this.players.find((p) => p.id === targetPlayerId);
    const inspector = this.getInspector();

    if (!fromPlayer || !targetPlayer || fromPlayer.cash < cash || cash < 0) return false;

    // Remove existing pending bribe from this sender regarding this target
    this.bribeOffers = this.bribeOffers.filter(
      (b) => !(b.fromPlayerId === fromPlayerId && b.targetPlayerId === targetPlayerId)
    );

    const newOffer: BribeOffer = {
      id: `bribe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fromPlayerId,
      toPlayerId: inspector.id,
      targetPlayerId,
      intent,
      cash,
      message,
      status: 'pending',
    };
    this.bribeOffers.push(newOffer);

    const actionWord = intent === 'inspect' ? 'สั่งเปิดตรวจ' : 'สั่งปล่อยผ่าน';
    this.addLog(
      `${fromPlayer.name} เสนอสินบน \$${cash} ให้นายอำเภอเพื่อ "${actionWord}" รถของ ${targetPlayer.name} ${message ? `("${message}")` : ''}`,
      'bribe'
    );

    this.scheduleBotAction();
    this.notifyStateChanged();
    return true;
  }

  // --- Phase 5: Suspenseful Inspection Reveal ---
  public resolveInspection(
    action: 'passed' | 'inspected',
    acceptedBribeId?: string
  ): boolean {
    if (this.phase !== 'NEGOTIATION' || !this.activeInspectTargetId) return false;

    const merchant = this.players.find((p) => p.id === this.activeInspectTargetId);
    const inspector = this.getInspector();
    if (!merchant || !merchant.crate || !merchant.crate.cards) return false;

    const crateCards = [...merchant.crate.cards];
    const declaredType = merchant.crate.declaredType!;
    const declaredCount = merchant.crate.declaredCount;

    // Process Accepted Bribe if any
    let bribeAcceptedInfo = undefined;
    if (acceptedBribeId) {
      const bribe = this.bribeOffers.find((b) => b.id === acceptedBribeId);
      if (bribe && bribe.status === 'pending') {
        const briber = this.players.find((p) => p.id === bribe.fromPlayerId);
        if (briber) {
          const cashPaid = Math.min(briber.cash, bribe.cash);
          briber.cash -= cashPaid;
          inspector.cash += cashPaid;
          bribe.status = 'accepted';
          bribeAcceptedInfo = {
            fromPlayerId: briber.id,
            fromPlayerName: briber.name,
            cash: cashPaid,
            intent: bribe.intent,
            message: bribe.message,
          };
          this.addLog(
            `สารวัตรรับเงินสินบน \$${cashPaid} จาก ${briber.name} (${bribe.intent === 'pass' ? 'สั่งปล่อยผ่าน' : 'สั่งเปิดตรวจจับ'}) เรียบร้อย!`,
            'bribe'
          );
        }
      }
      // Mark other pending bribes for this target as rejected
      for (const b of this.bribeOffers) {
        if (b.targetPlayerId === this.activeInspectTargetId && b.id !== acceptedBribeId && b.status === 'pending') {
          b.status = 'rejected';
        }
      }
    } else {
      // Inspector acted without accepting any bribe -> reject all pending bribes for this target
      for (const b of this.bribeOffers) {
        if (b.targetPlayerId === this.activeInspectTargetId && b.status === 'pending') {
          b.status = 'rejected';
        }
      }
    }

    if (action === 'passed') {
      this.phase = 'INSPECTING';
      this.addLog(`สารวัตรสั่ง "ปล่อยผ่าน" รถของ ${merchant.name}! (สินค้ากำลังเคลื่อนผ่านด่านตรวจ...)`, 'pass');

      this.inspectionAnimation = {
        targetPlayerId: merchant.id,
        targetPlayerName: merchant.name,
        declaredType,
        declaredCount,
        cards: crateCards,
        revealedCount: 0,
        isComplete: false,
        action: 'passed',
      };

      this.notifyStateChanged();
      this.runInspectionAnimationStep(bribeAcceptedInfo);
      return true;
    }

    // Action === 'inspected' -> Start Suspenseful Reveal Animation!
    this.phase = 'INSPECTING';
    this.addLog(`สารวัตรสั่ง "เปิดตรวจค้น!" ลังไม้ของ ${merchant.name} (กำลังปลดล็อกตรวจทีละใบ...)`, 'inspect');

    this.inspectionAnimation = {
      targetPlayerId: merchant.id,
      targetPlayerName: merchant.name,
      declaredType,
      declaredCount,
      cards: crateCards,
      revealedCount: 0,
      isComplete: false,
      action: 'inspected',
    };

    this.notifyStateChanged();

    // Step-by-step reveal timer
    this.runInspectionAnimationStep(bribeAcceptedInfo);
    return true;
  }

  private runInspectionAnimationStep(bribeAcceptedInfo?: any): void {
    if (!this.inspectionAnimation) return;

    if (this.inspectionAnimation.revealedCount < this.inspectionAnimation.cards.length) {
      setTimeout(() => {
        if (!this.inspectionAnimation) return;
        this.inspectionAnimation.revealedCount += 1;
        this.notifyStateChanged();
        this.runInspectionAnimationStep(bribeAcceptedInfo);
      }, 1200);
    } else {
      // Completed all card reveals! Pause 1.5s for everyone to absorb the result before showing verdict
      setTimeout(() => {
        this.finishInspectionVerdict(bribeAcceptedInfo);
      }, 1500);
    }
  }

  private finishInspectionVerdict(bribeAcceptedInfo?: any): void {
    if (!this.inspectionAnimation) return;

    const merchant = this.players.find((p) => p.id === this.inspectionAnimation!.targetPlayerId);
    const inspector = this.getInspector();
    if (!merchant || !merchant.crate || !merchant.crate.cards) return;

    const crateCards = [...merchant.crate.cards];
    const declaredType = this.inspectionAnimation.declaredType;

    // If action was 'passed': run peaceful admission to warehouse
    if (this.inspectionAnimation.action === 'passed') {
      for (const card of crateCards) {
        if (card.category === 'legal') {
          merchant.warehouse.legal[card.type as LegalGoodsType].push(card);
        } else {
          if (!merchant.warehouse.contrabandCards) merchant.warehouse.contrabandCards = [];
          merchant.warehouse.contrabandCards.push(card);
          merchant.warehouse.contrabandCount = merchant.warehouse.contrabandCards.length;
        }
      }

      this.lastInspectionResult = {
        playerId: merchant.id,
        playerName: merchant.name,
        inspectorId: inspector.id,
        inspectorName: inspector.name,
        action: 'passed',
        bribeAccepted: bribeAcceptedInfo,
        actualCards: crateCards,
        declaredType,
        declaredCount: this.inspectionAnimation.declaredCount,
        isTruthful: crateCards.every((c) => c.type === declaredType),
        fineOrCompensation: 0,
        confiscatedCards: [],
        admittedCards: crateCards,
      };

      this.processedMerchantsThisRound.add(merchant.id);
      merchant.crate = null;
      this.bribeOffers = this.bribeOffers.filter((b) => b.targetPlayerId !== merchant.id);

      this.phase = 'INSPECTION_REVEAL';
      this.notifyStateChanged();
      return;
    }

    const isTruthful = crateCards.every((c) => c.type === declaredType);
    const admittedCards: Card[] = [];
    const confiscatedCards: Card[] = [];

    let result: InspectionResult;

    if (isTruthful) {
      let totalCompensation = 0;
      for (const card of crateCards) {
        totalCompensation += card.penalty;
        merchant.warehouse.legal[card.type as LegalGoodsType].push(card);
        admittedCards.push(card);
      }

      const debtSummary = settleDebt(inspector, merchant, totalCompensation);
      this.addLog(
        `${merchant.name} พูดความจริงทุกใบ! สารวัตร ${inspector.name} หน้าแตก ต้องจ่ายค่าชดเชย \$${totalCompensation}`,
        'fine'
      );

      result = {
        playerId: merchant.id,
        playerName: merchant.name,
        inspectorId: inspector.id,
        inspectorName: inspector.name,
        action: 'inspected',
        bribeAccepted: bribeAcceptedInfo,
        actualCards: crateCards,
        declaredType,
        declaredCount: this.inspectionAnimation.declaredCount,
        isTruthful: true,
        fineOrCompensation: -totalCompensation,
        confiscatedCards: [],
        admittedCards,
        debtSettlement: debtSummary,
      };
    } else {
      // Caught lying!
      let totalFines = 0;
      for (const card of crateCards) {
        if (card.type === declaredType) {
          merchant.warehouse.legal[card.type as LegalGoodsType].push(card);
          admittedCards.push(card);
        } else {
          totalFines += card.penalty;
          confiscatedCards.push(card);
        }
      }

      this.deck.discardToPile(confiscatedCards, 'left');
      const debtSummary = settleDebt(merchant, inspector, totalFines);

      this.addLog(
        `จับได้คาหนังคาเขา! ${merchant.name} ซ่อนของผิดกติกา ${confiscatedCards.length} ชิ้น ถูกยึดทิ้งและโดนปรับ \$${totalFines}`,
        'fine'
      );

      if (debtSummary.debtForgiven > 0) {
        this.addLog(
          `${merchant.name} เงินสดและสินค้าหมดตัว! สิทธิคุ้มครองคนหมดตัวยกหนี้ที่เหลือ \$${debtSummary.debtForgiven} ให้`,
          'alert'
        );
      }

      result = {
        playerId: merchant.id,
        playerName: merchant.name,
        inspectorId: inspector.id,
        inspectorName: inspector.name,
        action: 'inspected',
        bribeAccepted: bribeAcceptedInfo,
        actualCards: crateCards,
        declaredType,
        declaredCount: this.inspectionAnimation.declaredCount,
        isTruthful: false,
        fineOrCompensation: totalFines,
        confiscatedCards,
        admittedCards,
        debtSettlement: debtSummary,
      };
    }

    this.lastInspectionResult = result;
    this.processedMerchantsThisRound.add(merchant.id);
    merchant.crate = null;
    this.bribeOffers = this.bribeOffers.filter((b) => b.targetPlayerId !== merchant.id);

    this.phase = 'INSPECTION_REVEAL';
    this.notifyStateChanged();
  }

  public checkInspectionCompletion(): void {
    const remainingMerchants = this.getMerchants().filter(
      (m) => !this.processedMerchantsThisRound.has(m.id)
    );

    if (remainingMerchants.length > 0) {
      this.activeInspectTargetId = remainingMerchants[0].id;
      this.phase = 'INSPECTION_REVEAL';
    } else {
      this.activeInspectTargetId = null;
      this.phase = 'ROUND_END';
      this.addLog(`การตรวจค้นรอบที่ ${this.currentRound} เสร็จสิ้นครบทุกคนแล้ว`, 'info');
      this.scheduleBotAction();
    }
    this.notifyStateChanged();
  }

  public resumeNegotiationNextTarget(): void {
    if (this.phase === 'INSPECTION_REVEAL') {
      this.inspectionAnimation = null;
      this.lastInspectionResult = null;

      const remainingMerchants = this.getMerchants().filter(
        (m) => !this.processedMerchantsThisRound.has(m.id)
      );

      if (remainingMerchants.length > 0) {
        this.activeInspectTargetId = remainingMerchants[0].id;
        this.phase = 'NEGOTIATION';
        this.addLog(`สารวัตรเดินไปตรวจรถคันถัดไป: ${remainingMerchants[0].name}`, 'info');
        this.scheduleBotAction();
      } else {
        this.phase = 'ROUND_END';
        this.addLog(`การตรวจค้นรอบที่ ${this.currentRound} เสร็จสิ้น`, 'info');
        this.scheduleBotAction();
      }
      this.notifyStateChanged();
    }
  }

  public endRoundAndAdvance(): boolean {
    if (this.phase !== 'ROUND_END') return false;

    if (this.currentRound >= this.totalRounds) {
      this.phase = 'GAME_OVER';
      this.scores = calculateScores(this.players, this.themeId);
      const theme = THEMES[this.themeId];
      this.addLog(
        `จบเกม! ผู้ชนะเลิศคือ ${this.scores[0]?.playerName} (คะแนนรวม: ${this.scores[0]?.totalScore})`,
        'alert'
      );
      this.notifyStateChanged();
      return true;
    }

    this.currentRound += 1;
    this.inspectorIndex = (this.inspectorIndex + 1) % this.players.length;

    for (let i = 0; i < this.players.length; i++) {
      this.players[i].isInspector = i === this.inspectorIndex;
      if (!this.players[i].hand) this.players[i].hand = [];
      const needed = HAND_LIMIT - this.players[i].hand!.length;
      if (needed > 0) {
        const drawn = this.deck.drawCards(needed);
        this.players[i].hand!.push(...drawn);
      }
      this.players[i].handCount = this.players[i].hand!.length;
    }

    this.startMarketPhase();
    this.notifyStateChanged();
    return true;
  }

  // --- BOT AI PROACTIVE ENGINE & AFK TAKEOVER ---
  public scheduleBotAction(): void {
    if (this.botTimer) clearTimeout(this.botTimer);

    this.botTimer = setTimeout(() => {
      this.executeBotLogic();
    }, 1200 + Math.random() * 800);
  }

  public setPlayerAfk(playerId: string, isAfk: boolean): boolean {
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return false;
    p.isAfk = isAfk;
    if (isAfk) {
      this.addLog(`⚠️ ${p.name} อยู่ในสถานะ AFK — บอท AI เข้าเล่นแทนอัตโนมัติ`, 'alert');
      this.scheduleBotAction();
    } else {
      this.addLog(`✅ ${p.name} กลับมาควบคุมเองแล้ว (ยกเลิกระบบบอทแทน)`, 'info');
    }
    this.notifyStateChanged();
    return true;
  }

  private executeBotLogic(): void {
    if (this.phase === 'MARKET') {
      if (this.activeMarketPlayerId) {
        const p = this.players.find((pl) => pl.id === this.activeMarketPlayerId);
        if (p && (p.isBot || p.isAfk || !p.isConnected)) {
          // Bot / AFK market turn
          const discardIds: string[] = [];
          if (p.hand) {
            // Discard 1-2 lowest value cards
            p.hand.forEach((c) => {
              if (c.value <= 3 && discardIds.length < 2) discardIds.push(c.id);
            });
          }
          this.marketAction(p.id, discardIds, 'left', 'deck');
        }
      }
    } else if (this.phase === 'LOADING') {
      const unreadyBot = this.getMerchants().find((m) => (m.isBot || m.isAfk || !m.isConnected) && !m.hasPackedCrate);
      if (unreadyBot && unreadyBot.hand && unreadyBot.hand.length > 0) {
        const count = Math.min(unreadyBot.hand.length, Math.floor(Math.random() * 3) + 2);
        const cardIds = unreadyBot.hand.slice(0, count).map((c) => c.id);
        const legalCards = unreadyBot.hand.slice(0, count).filter((c) => c.category === 'legal');
        const bestType = (legalCards[0]?.type as LegalGoodsType) || 'apples';
        this.packCrate(unreadyBot.id, cardIds, bestType);
      }
    } else if (this.phase === 'DECLARATION') {
      const undeclaredBot = this.getMerchants().find((m) => (m.isBot || m.isAfk || !m.isConnected) && !m.hasDeclared && m.crate);
      if (undeclaredBot && undeclaredBot.crate && undeclaredBot.crate.cards) {
        const legalCounts: Partial<Record<LegalGoodsType, number>> = {};
        for (const c of undeclaredBot.crate.cards) {
          if (c.category === 'legal') {
            legalCounts[c.type as LegalGoodsType] = (legalCounts[c.type as LegalGoodsType] || 0) + 1;
          }
        }
        const bestType = (Object.keys(legalCounts)[0] as LegalGoodsType) || 'apples';
        this.declareGoods(undeclaredBot.id, bestType);
      }
    } else if (this.phase === 'NEGOTIATION') {
      const inspector = this.getInspector();
      const target = this.players.find((p) => p.id === this.activeInspectTargetId);

      // Bot / AFK as Merchant: offer realistic bribe if has contraband or slight bluff
      if (target && (target.isBot || target.isAfk || !target.isConnected) && target.crate?.cards) {
        const hasContraband = target.crate.cards.some((c) => c.category === 'contraband');
        const existingBribe = this.bribeOffers.find(
          (b) => b.fromPlayerId === target.id && b.targetPlayerId === target.id
        );
        const shouldBribe = (hasContraband && Math.random() < 0.85) || (!hasContraband && Math.random() < 0.25);
        if (shouldBribe && !existingBribe && target.cash >= 3) {
          const bribeCash = Math.min(target.cash, Math.floor(Math.random() * 4) + 2);
          const msg = hasContraband ? 'ปล่อยผมไปเถอะครับ สินค้าทั่วไปจริงๆ!' : 'ผมบริสุทธิ์ครับ แต่ให้ค่ากาแฟท่านสารวัตร';
          this.offerUniversalBribe(target.id, target.id, 'pass', bribeCash, msg);
          return;
        }
      }

      // Bot / AFK as Inspector: decides Inspect or Pass
      if ((inspector.isBot || inspector.isAfk || !inspector.isConnected) && target) {
        const relevantBribes = this.bribeOffers.filter((b) => b.targetPlayerId === target.id);
        const highestBribe = relevantBribes.sort((a, b) => b.cash - a.cash)[0];

        if (highestBribe && highestBribe.cash >= 3) {
          if (highestBribe.intent === 'pass') {
            this.resolveInspection('passed', highestBribe.id);
          } else {
            this.resolveInspection('inspected', highestBribe.id);
          }
        } else {
          // Realistic decision: 45% inspect, 55% pass
          const action = Math.random() < 0.45 ? 'inspected' : 'passed';
          this.resolveInspection(action);
        }
      }
    } else if (this.phase === 'INSPECTION_REVEAL') {
      // Auto advance after reveal if inspector is bot / afk
      const inspector = this.getInspector();
      if (inspector.isBot || inspector.isAfk || !inspector.isConnected) {
        setTimeout(() => {
          this.resumeNegotiationNextTarget();
        }, 2500);
      }
    } else if (this.phase === 'ROUND_END') {
      // Advance to next round if inspector is bot / afk
      const inspector = this.getInspector();
      if (inspector.isBot || inspector.isAfk || !inspector.isConnected) {
        setTimeout(() => {
          this.endRoundAndAdvance();
        }, 2000);
      }
    }
  }

  private notifyStateChanged(): void {
    if (this.onStateChanged) {
      this.onStateChanged();
    }
  }

  // --- State Sanitization ---
  public getSanitizedState(forPlayerId: string): PublicGameState {
    const discardPiles = this.deck.getDiscardPiles();

    const sanitizedPlayers: Player[] = this.players.map((p) => {
      const isMe = p.id === forPlayerId;

      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        cash: p.cash,
        handCount: p.handCount,
        hand: isMe ? p.hand : undefined,
        pendingDiscards: isMe ? p.pendingDiscards : undefined,
        warehouse: {
          legal: p.warehouse.legal,
          contrabandCount: p.warehouse.contrabandCount,
          contrabandCards: isMe || this.phase === 'GAME_OVER' ? p.warehouse.contrabandCards : undefined,
        },
        crate: p.crate
          ? {
              playerId: p.crate.playerId,
              cardsCount: p.crate.cardsCount,
              declaredType: p.crate.declaredType,
              declaredCount: p.crate.declaredCount,
              cards: isMe || this.phase === 'INSPECTION_REVEAL' ? p.crate.cards : undefined,
            }
          : null,
        hasDeclared: p.hasDeclared,
        hasPackedCrate: p.hasPackedCrate,
        isInspector: p.isInspector,
        isReady: p.isReady,
        isConnected: p.isConnected,
        isAfk: p.isAfk,
        isBot: p.isBot,
      };
    });

    return {
      roomCode: this.roomCode,
      themeId: this.themeId,
      phase: this.phase,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      inspectorId: this.getInspector()?.id || '',
      activeInspectTargetId: this.activeInspectTargetId,
      activeMarketPlayerId: this.activeMarketPlayerId,
      drawDeckCount: this.deck.getDrawDeckCount(),
      discardPiles,
      players: sanitizedPlayers,
      bribeOffers: this.bribeOffers,
      inspectionAnimation: this.inspectionAnimation
        ? {
            ...this.inspectionAnimation,
            cards: this.inspectionAnimation.cards.map((c, i) => {
              if (i < this.inspectionAnimation!.revealedCount) {
                if (this.inspectionAnimation!.action === 'passed' && c.category === 'contraband') {
                  const isOwner = forPlayerId === this.inspectionAnimation!.targetPlayerId;
                  return {
                    id: `contraband_passed_${i}`,
                    type: isOwner ? c.type : ('whiskey' as any),
                    name: isOwner ? c.name : 'ของเถื่อน (ไม่เปิดเผย)',
                    nameEn: isOwner ? c.nameEn : 'Hidden Contraband',
                    category: 'contraband' as const,
                    value: isOwner ? c.value : 0,
                    penalty: isOwner ? c.penalty : 0,
                    icon: '🤫',
                    flavor: 'สินค้าผิดกฎหมายลักลอบผ่านด่านสำเร็จ!',
                  };
                }
                return c;
              }
              return {
                id: `hidden_${i}`,
                type: this.inspectionAnimation!.declaredType,
                name: '???',
                nameEn: 'Mystery',
                category: 'legal' as const,
                value: 0,
                penalty: 0,
                icon: '❓',
                flavor: 'กำลังจะถูกเปิดตรวจ...',
              };
            }),
          }
        : null,
      lastInspectionResult: this.lastInspectionResult
        ? {
            ...this.lastInspectionResult,
            actualCards:
              this.lastInspectionResult.action === 'passed' && forPlayerId !== this.lastInspectionResult.playerId
                ? this.lastInspectionResult.actualCards.filter((c) => c.category === 'legal')
                : this.lastInspectionResult.actualCards,
          }
        : null,
      logs: this.logs.slice(-30),
      scores: this.phase === 'GAME_OVER' ? this.scores : undefined,
    };
  }
}
