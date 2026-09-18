import type { ThemeId } from './themes.js';

export type LegalGoodsType = 'flour' | 'apples' | 'coffee' | 'cigars';
export type ContrabandGoodsType = 'whiskey' | 'tommy_gun' | 'diamonds' | 'counterfeit';
export type GoodsType = LegalGoodsType | ContrabandGoodsType;

export interface Card {
  id: string;
  type: GoodsType;
  name: string;
  nameEn: string;
  category: 'legal' | 'contraband';
  value: number;       // คะแนน / มูลค่าเมื่อจบเกม หรือใช้หักหนี้
  penalty: number;     // ค่าปรับหากถูกจับได้ หรือค่าชดเชยที่สารวัตรต้องจ่าย
  icon: string;        // อีโมจิ หรือไอคอน
  flavor: string;      // คำอธิบาย
}

export interface Crate {
  playerId: string;
  cardsCount: number;
  declaredType: LegalGoodsType | null;
  declaredCount: number;
  // Note: cards are hidden in public state until inspection
  cards?: Card[];
}

// Universal Bribing: Any player can bribe the Inspector regarding ANY target!
export interface BribeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  targetPlayerId: string;       // รถคันเป้าหมาย
  intent: 'inspect' | 'pass';   // ยื่นเงินเพื่อให้ "ตรวจค้น" หรือ "ปล่อยผ่าน"
  cash: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface PlayerWarehouse {
  legal: Record<LegalGoodsType, Card[]>;
  contrabandCount: number;
  // The actual contraband cards are private to player until game over
  contrabandCards?: Card[];
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  cash: number;
  handCount: number;
  hand?: Card[]; // Private to the player
  pendingDiscards?: Card[]; // Cards set aside during market exchange
  warehouse: PlayerWarehouse;
  crate: Crate | null;
  hasDeclared: boolean;
  hasPackedCrate: boolean;
  isInspector: boolean;
  isReady: boolean;
  isConnected: boolean;
  isBot?: boolean;
  isAfk?: boolean; // When human player disconnects or is idle, Bot AI plays on their behalf
}

export type GamePhase =
  | 'LOBBY'
  | 'MARKET'          // ผลัดกันทิ้งและจั่วการ์ดตามลำดับ
  | 'LOADING'         // แอบใส่การ์ด 1-5 ใบในลังไม้
  | 'DECLARATION'     // แจ้งจำนวนและสินค้าถูกกฎหมาย 1 ชนิด
  | 'NEGOTIATION'     // เจรจา ติดสินบนรอบวง สารวัตรเลือกตรวจ/ปล่อย
  | 'INSPECTING'      // อนิเมชั่นเปิดการ์ดทีละใบสร้างความระทึก
  | 'INSPECTION_REVEAL' // แสดงผลการตรวจค้น คำนวณค่าปรับ/ชดเชย
  | 'ROUND_END'       // สรุปผลรอบ หมุนเวียนสารวัตร
  | 'GAME_OVER';      // จบเกม คำนวณคะแนนและประกาศผู้ชนะ

export interface InspectionAnimationState {
  targetPlayerId: string;
  targetPlayerName: string;
  declaredType: LegalGoodsType;
  declaredCount: number;
  cards: Card[];
  revealedCount: number; // 0 to cards.length
  isComplete: boolean;
  action?: 'inspected' | 'passed';
}

export interface InspectionResult {
  playerId: string;
  playerName: string;
  inspectorId: string;
  inspectorName: string;
  action: 'passed' | 'inspected';
  bribeAccepted?: {
    fromPlayerId: string;
    fromPlayerName: string;
    cash: number;
    intent: 'inspect' | 'pass';
    message: string;
  };
  actualCards: Card[];
  declaredType: LegalGoodsType;
  declaredCount: number;
  isTruthful: boolean;
  fineOrCompensation: number; // Positive: player owes inspector, Negative: inspector owes player
  confiscatedCards: Card[];   // Cards discarded to common discard pile
  admittedCards: Card[];      // Cards safely moved to player's warehouse
  debtSettlement?: {
    cashPaid: number;
    cardsSeizedToCreditor: Card[];
    debtForgiven: number;     // Bankruptcy protection
  };
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  text: string;
  type: 'info' | 'bribe' | 'fine' | 'pass' | 'inspect' | 'alert';
}

export interface GameScoreResult {
  playerId: string;
  playerName: string;
  cash: number;
  goodsValue: number;
  bonuses: {
    goodType: LegalGoodsType;
    rank: 1 | 2;
    bonusAmount: number;
  }[];
  totalScore: number;
  isWinner: boolean;
}

export interface PublicGameState {
  roomCode: string;
  themeId: ThemeId;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  inspectorId: string;
  activeInspectTargetId: string | null;
  activeMarketPlayerId: string | null; // For sequential market turns!
  drawDeckCount: number;
  discardPiles: {
    leftTop: Card | null;
    rightTop: Card | null;
    leftCount: number;
    rightCount: number;
    leftRecent?: Card[];
    rightRecent?: Card[];
  };
  players: Player[];
  bribeOffers: BribeOffer[]; // Universal bribes from all players
  inspectionAnimation: InspectionAnimationState | null;
  lastInspectionResult: InspectionResult | null;
  logs: GameLogEntry[];
  scores?: GameScoreResult[];
}
