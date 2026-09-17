import { Card, LegalGoodsType, ContrabandGoodsType, GoodsType } from './types.js';

export const CARD_DEFINITIONS: Record<GoodsType, Omit<Card, 'id'>> = {
  // --- สินค้าถูกกฎหมาย (Legal) ---
  flour: {
    type: 'flour',
    name: 'แป้งทำขนมปัง',
    nameEn: 'Baking Flour',
    category: 'legal',
    value: 3,
    penalty: 2,
    icon: '🥖',
    flavor: 'วัตถุดิบทำเบเกอรี่ส่งร้านอาหารอิตาเลียนในชิคาโก ถูกกฎหมายแน่นอน',
  },
  apples: {
    type: 'apples',
    name: 'ลังแอปเปิ้ลสด',
    nameEn: 'Fresh Apples',
    category: 'legal',
    value: 2,
    penalty: 2,
    icon: '🍎',
    flavor: 'แอปเปิ้ลแดงหวานกรอบจากสวนนอกเมือง ชวนน้ำลายสอ',
  },
  coffee: {
    type: 'coffee',
    name: 'กาแฟกระป๋อง',
    nameEn: 'Canned Coffee',
    category: 'legal',
    value: 3,
    penalty: 2,
    icon: '☕',
    flavor: 'กาแฟคั่วเข้มยอดฮิต ช่วยให้คนงานกะดึกตาสว่างทั้งคืน',
  },
  cigars: {
    type: 'cigars',
    name: 'ซิการ์ถูกกฎหมาย',
    nameEn: 'Havana Cigars',
    category: 'legal',
    value: 4,
    penalty: 2,
    icon: '🚬',
    flavor: 'ซิการ์ชั้นยอด เสียภาษีเรียบร้อย กลิ่นหอมฟุ้งถูกใจสุภาพบุรุษ',
  },

  // --- สินค้าผิดกฎหมาย (Contraband) ---
  whiskey: {
    type: 'whiskey',
    name: 'วิสกี้ต้มเถื่อน',
    nameEn: 'Moonshine Whiskey',
    category: 'contraband',
    value: 6,
    penalty: 4,
    icon: '🍾',
    flavor: 'สุราเถื่อนกลั่นในป่า ยุคห้ามสุราแบบนี้ผับลับพร้อมจ่ายไม่อั้น',
  },
  tommy_gun: {
    type: 'tommy_gun',
    name: 'ปืนกลทอมมี่',
    nameEn: 'Tommy Gun',
    category: 'contraband',
    value: 9,
    penalty: 4,
    icon: '🔫',
    flavor: 'ปืนกลกระบอกกลม อาวุธคู่กายของแก๊งอัล คาโปน (มีเพียง 5 ใบในสำรับ!)',
  },
  diamonds: {
    type: 'diamonds',
    name: 'เพชรโจรกรรม',
    nameEn: 'Stolen Diamonds',
    category: 'contraband',
    value: 8,
    penalty: 4,
    icon: '💎',
    flavor: 'อัญมณีล้ำค่า ปล้นมาจากคฤหาสน์เศรษฐีในคืนไร้จันทร์',
  },
  counterfeit: {
    type: 'counterfeit',
    name: 'แท่นพิมพ์แบงก์ปลอม',
    nameEn: 'Counterfeit Plates',
    category: 'contraband',
    value: 7,
    penalty: 4,
    icon: '💵',
    flavor: 'เพลตพิมพ์ธนบัตรดอลลาร์ปลอมระดับเทพ ตาเปล่าแยกไม่ออก',
  },
};

// จำนวนการ์ดแต่ละชนิดในสำรับเริ่มต้น (รวม 204 ใบ ตรงตามต้นฉบับ)
export const DECK_COMPOSITION: Record<GoodsType, number> = {
  apples: 48,
  flour: 36,
  coffee: 36,
  cigars: 24,
  whiskey: 22,
  counterfeit: 21,
  diamonds: 12,
  tommy_gun: 5,
};

// โบนัสเจ้าพ่อ (King & Queen) ตอนจบเกม
export const KING_BONUSES: Record<LegalGoodsType, { king: number; queen: number; title: string }> = {
  apples: { king: 20, queen: 10, title: 'เจ้าพ่อสวนแอปเปิ้ล (King of Apples)' },
  flour: { king: 15, queen: 10, title: 'เจ้าพ่อโรงสีแป้ง (King of Flour)' },
  coffee: { king: 15, queen: 10, title: 'เจ้าพ่อไร่กาแฟ (King of Coffee)' },
  cigars: { king: 10, queen: 5, title: 'เจ้าพ่อควันซิการ์ (King of Cigars)' },
};

export const INITIAL_PLAYER_CASH = 50;
export const HAND_LIMIT = 6;
export const MAX_CRATE_CARDS = 5;
export const MIN_CRATE_CARDS = 1;
