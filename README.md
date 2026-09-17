---
title: Bootlegger 1920
emoji: 🥃
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# 🥃 Bootlegger 1920: The Chicago Smugglers
> เว็บบอร์ดเกมบลัฟฟ์และเจรจาต่อรองออนไลน์ สไตล์มาเฟียยุค 1920s (ดัดแปลงจากกลไก Sheriff of Nottingham อย่างถูกลิขสิทธิ์ 100%)

---

## 🎩 จุดเด่นของโปรเจกต์
1. **ถูกลิขสิทธิ์ 100% (Safe Re-theming):** ดัดแปลงกลไกเกมกระดานดั้งเดิมมาสู่ธีมยุคห้ามสุรา (1920s Prohibition) ในชิคาโก เปลี่ยนภาพลักษณ์ ตัวละคร และคำศัพท์ใหม่ทั้งหมด
2. **ระบบความปลอดภัย Server-Authoritative:** เซิร์ฟเวอร์เก็บข้อมูลการ์ดในมือและในลังไม้ลับ ป้องกันการแอบดูไพ่ผ่าน F12 DevTools
3. **ระบบจัดการเมื่อเงินสดหมด (Bankruptcy Protection):**
   - จ่ายเงินสดที่มีจนเกลี้ยง
   - หนี้ที่เหลือ บังคับยึดสินค้าในโกดังส่งให้เจ้าหนี้โดยตรงตามมูลค่าหน้าการ์ด
   - หากไม่มีทั้งเงินและสินค้าเหลือ ระบบจะ "ยกหนี้" ให้ทันที ไม่ให้ผู้เล่นหลุดออกจากเกม
4. **โหมดทดสอบคนเดียว (Solo / Bot AI):** มีปุ่ม `+ เพิ่มบอท AI` ในล็อบบี้ ทำให้สามารถทดสอบและเล่นคนเดียวได้ทันทีโดยไม่ต้องรอเพื่อนครบวง

---

## 🚀 วิธีการรันโปรเจกต์ (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. รันโหมดทดสอบ (Unit Tests)
```bash
npm test
```

### 3. รันโปรเจกต์สำหรับเล่นจริง (Production Mode)
```bash
# คอมไพล์ Frontend และรันเซิร์ฟเวอร์แบบ Full-stack บนพอร์ต 3001
npx vite build
npx tsx server/index.ts
```
เปิดเบราว์เซอร์ไปที่: `http://localhost:3001`

### 4. รันโหมดพัฒนา (Development Mode with Hot Reload)
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: `http://localhost:5173` (Vite dev server เชื่อมต่อ Socket ไปที่ 3001 อัตโนมัติ)

---

## 🃏 รายการสินค้าและการ์ดในเกม

### 🟢 สินค้าถูกกฎหมาย (Legal Goods)
* 🥖 **แป้งทำขนมปัง (Flour):** มูลค่า \$2 | ค่าปรับ \$2 | โบนัสอันดับ 1 (+\$20) / อันดับ 2 (+\$10)
* 🍎 **แอปเปิ้ลสด (Apples):** มูลค่า \$3 | ค่าปรับ \$2 | โบนัสอันดับ 1 (+\$20) / อันดับ 2 (+\$10)
* ☕ **กาแฟกระป๋อง (Coffee):** มูลค่า \$4 | ค่าปรับ \$2 | โบนัสอันดับ 1 (+\$15) / อันดับ 2 (+\$10)
* 🚬 **ซิการ์ถูกกฎหมาย (Cigars):** มูลค่า \$5 | ค่าปรับ \$2 | โบนัสอันดับ 1 (+\$15) / อันดับ 2 (+\$10)

### 🔴 สินค้าผิดกฎหมาย (Contraband Goods)
* 🍾 **วิสกี้เถื่อน (Bootleg Whiskey):** มูลค่า \$6 | ค่าปรับ \$3
* 🔫 **ปืนกลทอมมี่ (Tommy Gun):** มูลค่า \$7 | ค่าปรับ \$4
* 💎 **เพชรโจรกรรม (Stolen Diamonds):** มูลค่า \$8 | ค่าปรับ \$4
* 💵 **แท่นพิมพ์แบงก์ปลอม (Counterfeit):** มูลค่า \$9 | ค่าปรับ \$4

---

## 📁 โครงสร้างโปรเจกต์
```
bootlegger-1920/
├── shared/               # ข้อมูลที่แชร์ระหว่าง Client และ Server (Types, Card Definitions)
│   ├── types.ts          # State, Player, Card, GamePhase
│   └── cards.ts          # รายละเอียดการ์ด 8 ชนิดและโบนัส
├── server/               # Backend Server (Node.js + Socket.io)
│   ├── engine/           # Core Game Logic (Pure functions & State Machine)
│   │   ├── gameState.ts  # Game Engine คุม 5 เฟสการเล่น
│   │   ├── deck.ts       # ระบบสับการ์ด กองจั่ว กองทิ้ง 2 กอง
│   │   ├── settlement.ts # ระบบชำระหนี้ ยึดของ และยกหนี้เมื่อล้มละลาย
│   │   └── scoring.ts    # คำนวณแต้มและโบนัสเจ้าพ่อ (King & Queen)
│   ├── roomManager.ts    # ระบบห้องเกมและรหัสห้อง 4 หลัก
│   └── index.ts          # Socket.io Server & Express
├── src/                  # Frontend (React 18 + Tailwind CSS + Framer Motion)
│   ├── components/       # CardItem, CrateView, BribeModal, InspectionRevealModal, WarehouseView, LobbyView, GameOverModal
│   ├── utils/audio.ts    # เสียงประกอบสังเคราะห์ด้วย Web Audio API
│   ├── App.tsx           # หน้าจอเกมหลัก
│   └── main.tsx          # จุดเริ่มต้นของ React
└── tests/                # Unit Tests (Vitest)
    └── gameEngine.test.ts # ทดสอบกฎกติกาและกลไกทั้งหมด 100%
```
