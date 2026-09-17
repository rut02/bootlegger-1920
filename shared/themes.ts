import { Card, LegalGoodsType, ContrabandGoodsType, GoodsType } from './types.js';

export type ThemeId = 'mafia_1920' | 'bang_rajan';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  nameEn: string;
  era: string;
  description: string;
  inspectorTitle: string;
  merchantTitle: string;
  crateTitle: string;
  warehouseTitle: string;
  currencySymbol: string;
  currencyName: string;
  legalGoods: Record<LegalGoodsType, Omit<Card, 'id'>>;
  contrabandGoods: Record<ContrabandGoodsType, Omit<Card, 'id'>>;
  kingBonuses: Record<LegalGoodsType, { king: number; queen: number; title: string }>;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  mafia_1920: {
    id: 'mafia_1920',
    name: 'มาเฟียและสุราเถื่อน 1920s',
    nameEn: '1920s Prohibition Mafia',
    era: 'ชิคาโก ค.ศ. 1920 ยุคทองของอัล คาโปน',
    description: 'ลักลอบขนสุราเถื่อน ปืนกล และสินค้าหนีภาษีเข้าเมืองชิคาโก สู้เหลี่ยมกับสารวัตรตำรวจคุมด่าน',
    inspectorTitle: 'สารวัตรตำรวจคุมด่าน (Chief Inspector)',
    merchantTitle: 'คนขับรถส่งของ / สมาชิกแก๊ง (Bootlegger)',
    crateTitle: 'ลังไม้ท้ายรถบรรทุก (Wooden Crate)',
    warehouseTitle: 'โกดังซ่อนสินค้า (Warehouse)',
    currencySymbol: '$',
    currencyName: 'ดอลลาร์',
    legalGoods: {
      flour: {
        type: 'flour',
        name: 'แป้งทำขนมปัง',
        nameEn: 'Baking Flour',
        category: 'legal',
        value: 3,
        penalty: 2,
        icon: '🥖',
        flavor: 'แป้งสาลีทำเบเกอรี่ส่งร้านอาหารอิตาเลียน ถูกกฎหมาย 100%',
      },
      apples: {
        type: 'apples',
        name: 'ลังแอปเปิ้ลสด',
        nameEn: 'Fresh Apples',
        category: 'legal',
        value: 2,
        penalty: 2,
        icon: '🍎',
        flavor: 'แอปเปิ้ลแดงหวานกรอบจากสวนนอกเมือง',
      },
      coffee: {
        type: 'coffee',
        name: 'กาแฟกระป๋อง',
        nameEn: 'Canned Coffee',
        category: 'legal',
        value: 3,
        penalty: 2,
        icon: '☕',
        flavor: 'กาแฟคั่วเข้มยอดฮิตของคนงานกะดึก',
      },
      cigars: {
        type: 'cigars',
        name: 'ซิการ์ถูกกฎหมาย',
        nameEn: 'Havana Cigars',
        category: 'legal',
        value: 4,
        penalty: 2,
        icon: '🚬',
        flavor: 'ซิการ์ชั้นยอด เสียภาษีเรียบร้อย กลิ่นหอมฟุ้ง',
      },
    },
    contrabandGoods: {
      whiskey: {
        type: 'whiskey',
        name: 'วิสกี้ต้มเถื่อน',
        nameEn: 'Moonshine Whiskey',
        category: 'contraband',
        value: 6,
        penalty: 4,
        icon: '🍾',
        flavor: 'สุราเถื่อนกลั่นในป่า ยุคนี้ผับลับพร้อมจ่ายไม่อั้น',
      },
      tommy_gun: {
        type: 'tommy_gun',
        name: 'ปืนกลทอมมี่',
        nameEn: 'Tommy Gun',
        category: 'contraband',
        value: 9,
        penalty: 4,
        icon: '🔫',
        flavor: 'ปืนกลกระบอกกลม อาวุธสังหารคู่กายเจ้าพ่อ (มีเพียง 5 ใบในสำรับ!)',
      },
      diamonds: {
        type: 'diamonds',
        name: 'เพชรโจรกรรม',
        nameEn: 'Stolen Diamonds',
        category: 'contraband',
        value: 8,
        penalty: 4,
        icon: '💎',
        flavor: 'อัญมณีล้ำค่า ปล้นมาจากคฤหาสน์เศรษฐี',
      },
      counterfeit: {
        type: 'counterfeit',
        name: 'แท่นพิมพ์แบงก์ปลอม',
        nameEn: 'Counterfeit Plates',
        category: 'contraband',
        value: 7,
        penalty: 4,
        icon: '💵',
        flavor: 'เพลตพิมพ์ธนบัตรดอลลาร์ปลอมระดับเทพ',
      },
    },
    kingBonuses: {
      apples: { king: 20, queen: 10, title: 'เจ้าพ่อสวนแอปเปิ้ล (King of Apples)' },
      flour: { king: 15, queen: 10, title: 'เจ้าพ่อโรงสีแป้ง (King of Flour)' },
      coffee: { king: 15, queen: 10, title: 'เจ้าพ่อไร่กาแฟ (King of Coffee)' },
      cigars: { king: 10, queen: 5, title: 'เจ้าพ่อควันซิการ์ (King of Cigars)' },
    },
  },

  bang_rajan: {
    id: 'bang_rajan',
    name: 'ค่ายบางระจัน 2309',
    nameEn: 'Bang Rajan Heroes 1766',
    era: 'กรุงศรีอยุธยา พ.ศ. 2309 ค่ายบางระจัน',
    description: 'ขบวนเกวียนลอบส่งเสบียงและอาวุธเข้าค่ายบางระจัน สู้เหลี่ยมกับขุนศึกผู้คุมด่านตรวจเกวียน',
    inspectorTitle: 'ขุนศึกผู้คุมด่านตรวจเกวียน (Chief Commander)',
    merchantTitle: 'คนขับเกวียนเสบียงค่าย (Cart Driver)',
    crateTitle: 'เกวียนบรรทุกเสบียง (Supply Cart)',
    warehouseTitle: 'ยุ้งฉางค่ายบางระจัน (Camp Granary)',
    currencySymbol: '🪙',
    currencyName: 'อัฐ/ตำลึง',
    legalGoods: {
      flour: {
        type: 'flour',
        name: 'ข้าวสารค่าย',
        nameEn: 'Milled Rice',
        category: 'legal',
        value: 2,
        penalty: 2,
        icon: '🌾',
        flavor: 'ข้าวสารเลี้ยงดูนักรบและชาวบ้านในค่ายบางระจัน เป็นของจำเป็น',
      },
      apples: {
        type: 'apples',
        name: 'ปลาร้าทรงเครื่อง',
        nameEn: 'Fermented Fish',
        category: 'legal',
        value: 3,
        penalty: 2,
        icon: '🐟',
        flavor: 'เสบียงกักตุนรสเลิศ เก็บไว้ได้นานยามศึกสงคราม',
      },
      coffee: {
        type: 'coffee',
        name: 'ผักสวนครัวสมุนไพร',
        nameEn: 'Garden Herbs',
        category: 'legal',
        value: 4,
        penalty: 2,
        icon: '🥬',
        flavor: 'พืชผักและสมุนไพรรักษาบาดแผลของเหล่านักรบ',
      },
      cigars: {
        type: 'cigars',
        name: 'หม้อดินเผาเคลือบ',
        nameEn: 'Clay Pottery',
        category: 'legal',
        value: 5,
        penalty: 2,
        icon: '🏺',
        flavor: 'ภาชนะดินเผาบรรจุน้ำและปรุงอาหารในค่าย',
      },
    },
    contrabandGoods: {
      whiskey: {
        type: 'whiskey',
        name: 'ดาบเหล็กน้ำพี้',
        nameEn: 'Nam Phi Blades',
        category: 'contraband',
        value: 6,
        penalty: 3,
        icon: '🗡️',
        flavor: 'ดาบอาคมตีจากเหล็กน้ำพี้ ฟันแทงไม่เข้า ขุนศึกห้ามพกผ่านด่าน',
      },
      tommy_gun: {
        type: 'tommy_gun',
        name: 'ปืนไฟดินปืนศึกลับ',
        nameEn: 'Matchlock & Gunpowder',
        category: 'contraband',
        value: 7,
        penalty: 4,
        icon: '💣',
        flavor: 'ดินปืนและปืนไฟสั่งตรงจากเมืองท่า ห้ามนำเข้าค่ายเด็ดขาด',
      },
      diamonds: {
        type: 'diamonds',
        name: 'ทองคำราชสำนัก',
        nameEn: 'Royal Gold',
        category: 'contraband',
        value: 8,
        penalty: 4,
        icon: '👑',
        flavor: 'ทองคำและสมบัติหลวงลี้ภัยศึก มูลค่ามหาศาล',
      },
      counterfeit: {
        type: 'counterfeit',
        name: 'สาส์นลับยุทธการ',
        nameEn: 'Secret War Scroll',
        category: 'contraband',
        value: 9,
        penalty: 4,
        icon: '📜',
        flavor: 'แผนที่เดินทัพและสาส์นลับพระนคร โทษถึงประหารหากถูกจับได้',
      },
    },
    kingBonuses: {
      flour: { king: 20, queen: 10, title: 'จอมทัพเสบียงข้าว (Master of Rice)' },
      apples: { king: 20, queen: 10, title: 'จอมทัพคลังปลา (Master of Fish)' },
      coffee: { king: 15, queen: 10, title: 'หมอยาสมุนไพรใหญ่ (Chief Herbalist)' },
      cigars: { king: 15, queen: 10, title: 'ยอดช่างปั้นแห่งค่าย (Master Potter)' },
    },
  },
};
