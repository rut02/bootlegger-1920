import React, { useState } from 'react';
import { THEMES, ThemeId } from '../../shared/themes.js';
import { LegalGoodsType, ContrabandGoodsType } from '../../shared/types.js';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId?: ThemeId;
}

type TabType = 'flow' | 'scoring' | 'cards' | 'tips';

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  currentThemeId = 'mafia_1920',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('flow');
  const [previewThemeId, setPreviewThemeId] = useState<ThemeId>(currentThemeId);

  if (!isOpen) return null;

  const theme = THEMES[previewThemeId] || THEMES.mafia_1920;
  const legalKeys: LegalGoodsType[] = ['flour', 'apples', 'coffee', 'cigars'];
  const contrabandKeys: ContrabandGoodsType[] = ['whiskey', 'tommy_gun', 'diamonds', 'counterfeit'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="vintage-box rounded-2xl max-w-2xl w-full p-4 sm:p-6 border-2 border-vintage-gold shadow-[0_0_50px_rgba(212,175,55,0.3)] my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-vintage-gold/30">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">📜</span>
            <div>
              <h2 className="font-bold text-lg sm:text-xl font-vintage gold-gradient-text leading-tight">
                คู่มือกฎกติกา & วิธีนับคะแนน
              </h2>
              <span className="text-xs text-vintage-paper/70">
                เรียนรู้ง่าย เข้าใจไว ชนะได้ด้วยเหลี่ยมและไหวพริบ!
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold transition-all cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Theme Switcher within Guide */}
        <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl mt-3 border border-white/10 text-xs">
          <span className="text-vintage-paper/80 font-bold">ดูข้อมูลสินค้าตามธีม:</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPreviewThemeId('mafia_1920')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                previewThemeId === 'mafia_1920'
                  ? 'bg-amber-950 border border-vintage-gold text-vintage-gold shadow'
                  : 'bg-black/30 text-white/50 hover:text-white'
              }`}
            >
              🥃 มาเฟีย 1920s
            </button>
            <button
              type="button"
              onClick={() => setPreviewThemeId('bang_rajan')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                previewThemeId === 'bang_rajan'
                  ? 'bg-amber-950 border border-vintage-gold text-vintage-gold shadow'
                  : 'bg-black/30 text-white/50 hover:text-white'
              }`}
            >
              ⚔️ บางระจัน 2309
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 sm:gap-2 mt-3 p-1 bg-black/50 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('flow')}
            className={`py-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
              activeTab === 'flow'
                ? 'bg-vintage-gold text-vintage-dark shadow-md'
                : 'text-vintage-paper/70 hover:text-white'
            }`}
          >
            🎯 วิธีเล่น (5 ขั้น)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scoring')}
            className={`py-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
              activeTab === 'scoring'
                ? 'bg-vintage-gold text-vintage-dark shadow-md'
                : 'text-vintage-paper/70 hover:text-white'
            }`}
          >
            🏆 วิธีนับคะแนน
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            className={`py-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
              activeTab === 'cards'
                ? 'bg-vintage-gold text-vintage-dark shadow-md'
                : 'text-vintage-paper/70 hover:text-white'
            }`}
          >
            🎴 สินค้า & ค่าปรับ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tips')}
            className={`py-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
              activeTab === 'tips'
                ? 'bg-vintage-gold text-vintage-dark shadow-md'
                : 'text-vintage-paper/70 hover:text-white'
            }`}
          >
            💡 ทริคบลัฟฟ์
          </button>
        </div>

        {/* Tab Contents - Scrollable */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 text-xs space-y-4">
          {/* TAB 1: HOW TO PLAY FLOW */}
          {activeTab === 'flow' && (
            <div className="space-y-3">
              <div className="bg-amber-950/30 border border-amber-600/40 rounded-xl p-3 text-amber-200">
                <span className="font-bold block text-sm text-vintage-gold mb-1">
                  🎯 เป้าหมายของเกม:
                </span>
                ผู้เล่นทุกคนจะสลับกันเป็น <strong>{theme.inspectorTitle.split(' ')[0]}</strong> คอยตรวจค้นสินค้า และเป็น <strong>{theme.merchantTitle.split(' ')[0]}</strong> ลักลอบขนสินค้าเข้าเมืองเพื่อสะสมคะแนนและความมั่งคั่งให้ได้มากที่สุดเมื่อจบเกม!
              </div>

              {/* Step 1 */}
              <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <h4 className="font-bold text-vintage-gold text-sm">
                    🛒 ตลาดสินค้า (Market Phase)
                  </h4>
                </div>
                <p className="text-vintage-paper/80 leading-relaxed">
                  เริ่มรอบ ผู้เล่นแต่ละคนจะผลัดกันเปลี่ยนการ์ดบนมือ:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-vintage-paper/70 pl-2">
                  <li>เลือกทิ้งการ์ดที่ไม่ต้องการกี่ใบก็ได้ (0–5 ใบ) ลงใน <strong>กองทิ้งซ้าย</strong> หรือ <strong>กองทิ้งขวา</strong> แบบหงายหน้า</li>
                  <li>คลิกหยิบการ์ดใหม่ให้ครบ 6 ใบ โดยเลือกหยิบได้ทั้งจาก <strong>กองคว่ำหน้า</strong> (สุ่มลุ้น) หรือหยิบใบหงายหน้าที่เพื่อนเพิ่งทิ้งลงไป!</li>
                  <li>มีเวลานับถอยหลัง 25 วินาที หากหมดเวลาระบบจะสุ่มหยิบจากกองคว่ำให้จนครบ</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <h4 className="font-bold text-vintage-gold text-sm">
                    📦 จัดของขึ้น{theme.crateTitle.split(' ')[0]} (Loading Phase)
                  </h4>
                </div>
                <p className="text-vintage-paper/80 leading-relaxed">
                  พ่อค้าทุกคน (ยกเว้นสารวัตร) เลือกการ์ดบนมือ <strong>1–5 ใบ</strong> ใส่ลงใน {theme.crateTitle.split(' ')[0]} สามารถลากวางหรือคลิกเลือกการ์ดแล้วกดยืนยัน ของในนี้จะเป็นความลับ ไม่มีใครเห็น!
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <h4 className="font-bold text-vintage-gold text-sm">
                    🗣️ แจ้งยอดสินค้า (Declaration Phase)
                  </h4>
                </div>
                <p className="text-vintage-paper/80 leading-relaxed">
                  สบตาสารวัตรแล้ว <strong>แจ้งสินค้าถูกกฎหมายเพียง 1 ชนิด</strong> และ <strong>จำนวนต้องตรงกับจำนวนการ์ดในเกวียน</strong>:
                </p>
                <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-700/50 mt-1.5 text-emerald-200">
                  💡 <strong>กฎเหล็ก:</strong> จะ <span className="underline font-bold">พูดความจริง</span> หรือ <span className="underline font-bold">โกหกตอแหล</span> ก็ได้! แต่ <span className="text-rose-300 font-bold">ห้ามแจ้งว่าเป็นของเถื่อน</span> (ต้องแจ้งเป็นของถูกกฎหมายเสมอ เช่น แอบใส่ปืนกล แต่แจ้งว่าขนแอปเปิ้ล 3 ชิ้น)
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[10px]">
                    4
                  </span>
                  <h4 className="font-bold text-vintage-gold text-sm">
                    🤝 เจรจา & สินบนรอบวง (Negotiation & Universal Bribes)
                  </h4>
                </div>
                <p className="text-vintage-paper/80 leading-relaxed">
                  สารวัตรเลือกเกวียนของพ่อค้าที่จะตรวจสอบ ในจังหวะนี้ <strong>ผู้เล่นทุกคนในวง</strong> สามารถยื่นเงินสินบนแก่สารวัตรได้:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-vintage-paper/70 pl-2">
                  <li><strong>เจ้าของรถ:</strong> ยื่นสินบนขอให้สารวัตร <span className="text-emerald-300 font-bold">"ปล่อยผ่าน"</span></li>
                  <li><strong>เพื่อนร่วมวง:</strong> สามารถยื่นสินบนเชียร์ให้สารวัตร <span className="text-rose-300 font-bold">"เปิดตรวจค้น!"</span> เพื่อขัดขาคู่แข่งได้ หรือยื่นช่วยเพื่อนก็ได้!</li>
                </ul>
              </div>

              {/* Step 5 */}
              <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[10px]">
                    5
                  </span>
                  <h4 className="font-bold text-vintage-gold text-sm">
                    🔍 ผลการตรวจ & กฎค่าปรับ (Verdict & Fines)
                  </h4>
                </div>
                <div className="space-y-2 mt-1.5">
                  <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-600/50 text-emerald-200">
                    <strong>✅ กรณีสารวัตรสั่ง "ปล่อยผ่าน":</strong>
                    <div className="text-[11px] text-vintage-paper/80 mt-0.5">
                      สินค้าทั้งหมดผ่านเข้าโกดังอย่างปลอดภัย (ของเถื่อนจะกลายเป็นคะแนนลับให้เจ้าของ โดยที่คนอื่นไม่เห็นหน้าการ์ด) สารวัตรได้รับเงินสินบน (ถ้ามี)
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-600/50 text-rose-200">
                    <strong>🚨 กรณีสารวัตรสั่ง "เปิดตรวจค้น!":</strong>
                    <div className="text-[11px] text-vintage-paper/80 mt-0.5 space-y-1">
                      <div>
                        • <strong>ถ้าพ่อค้าพูดความจริง 100%:</strong> สารวัตร "หน้าแตก"! ต้องจ่ายเงินชดเชยค่าปรับให้พ่อค้าตามราคาค่าปรับของการ์ดทุกใบ พ่อค้านำสินค้าทั้งหมดเข้าโกดัง
                      </div>
                      <div>
                        • <strong>ถ้าพ่อค้าโกหก (มีของเถื่อน หรือ มีของถูกกฎหมายไม่ตรงกับที่แจ้ง):</strong> ของที่โกหกจะถูก <strong>"ยึดเข้าหลวง" (ทิ้งลงกอง) ทั้งหมด!</strong> พ่อค้าต้องจ่ายค่าปรับให้สารวัตรตามมูลค่าค่าปรับของสินค้าที่ผิด ส่วนของที่แจ้งถูกต้องจะยังคงได้เข้าโกดัง
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCORING SYSTEM */}
          {activeTab === 'scoring' && (
            <div className="space-y-3">
              {/* Formula Banner */}
              <div className="bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border-2 border-vintage-gold/80 rounded-xl p-3 text-center shadow-md">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                  สูตรคำนวณคะแนนรวมเมื่อจบเกม (Total Score Formula)
                </span>
                <div className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center gap-2">
                  <span className="bg-black/50 px-2 py-0.5 rounded text-emerald-400">💵 เงินสด</span>
                  <span>+</span>
                  <span className="bg-black/50 px-2 py-0.5 rounded text-amber-300">🏛️ มูลค่าสินค้าในโกดัง</span>
                  <span>+</span>
                  <span className="bg-black/50 px-2 py-0.5 rounded text-vintage-gold">👑 โบนัสราชา/ราชินี</span>
                </div>
              </div>

              {/* 3 Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 bg-black/40 border border-emerald-600/40 rounded-xl">
                  <span className="text-base block mb-0.5">💵 เงินสด</span>
                  <h4 className="font-bold text-emerald-300 text-xs">เงินสดติดตัว</h4>
                  <p className="text-[11px] text-vintage-paper/70 mt-1">
                    เงินสดทุก $1 เท่ากับ <strong>1 คะแนน</strong> ได้มาจากการค้าขาย สินบน และเก็บค่าปรับ
                  </p>
                </div>

                <div className="p-2.5 bg-black/40 border border-amber-600/40 rounded-xl">
                  <span className="text-base block mb-0.5">📦 สินค้าในโกดัง</span>
                  <h4 className="font-bold text-amber-300 text-xs">มูลค่าการ์ด</h4>
                  <p className="text-[11px] text-vintage-paper/70 mt-1">
                    การ์ดทุกใบที่รอดเข้าโกดัง ทั้งถูกกฎหมาย ($2–$5) และของเถื่อน ($6–$9) คิดเป็นคะแนนตามมูลค่าหน้าการ์ด
                  </p>
                </div>

                <div className="p-2.5 bg-black/40 border border-vintage-gold/50 rounded-xl">
                  <span className="text-base block mb-0.5">👑 โบนัสพิเศษ</span>
                  <h4 className="font-bold text-vintage-gold text-xs">ราชา & ราชินี</h4>
                  <p className="text-[11px] text-vintage-paper/70 mt-1">
                    ผู้ที่มีสินค้าถูกกฎหมายแต่ละชนิดมากที่สุดเป็นอันดับ 1 และ 2 ของวง จะได้รับแต้มโบนัสก้อนโต!
                  </p>
                </div>
              </div>

              {/* King and Queen Table */}
              <div className="vintage-box rounded-xl p-3 border border-vintage-gold/40">
                <div className="flex justify-between items-center mb-2 pb-1 border-b border-white/10">
                  <span className="font-bold text-vintage-gold text-xs flex items-center gap-1.5">
                    <span>👑</span>
                    <span>ตารางโบนัสราชา & ราชินี: ธีม {theme.name}</span>
                  </span>
                  <span className="text-[10px] text-vintage-paper/60">อันดับ 1 vs อันดับ 2</span>
                </div>

                <div className="divide-y divide-white/10 text-xs">
                  {legalKeys.map((key) => {
                    const item = theme.legalGoods[key];
                    const bonus = theme.kingBonuses[key];
                    return (
                      <div key={key} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.icon}</span>
                          <div>
                            <span className="font-bold text-white block">{item.name}</span>
                            <span className="text-[10px] text-vintage-paper/60">{bonus.title}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-xs">
                          <span className="px-2 py-0.5 rounded bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/40 font-bold">
                            👑 ราชา: +{bonus.king} แต้ม
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-600/40 font-bold">
                            👸 ราชินี: +{bonus.queen} แต้ม
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2.5 p-2 bg-black/40 rounded-lg text-[10px] text-vintage-paper/70 border border-white/5 space-y-0.5">
                  <div className="font-bold text-amber-300">⚖️ กฎเมื่อมีผู้ครอบครองจำนวนเท่ากัน (Tie-Breaking):</div>
                  <div>• <strong>เสมออันดับ 1:</strong> นำแต้มราชา + ราชินี มารวมกันแล้วหารเฉลี่ยให้คนที่ได้อันดับ 1 เท่ากันทุกคน (และจะไม่มีใครได้แต้มราชินี)</div>
                  <div>• <strong>เสมออันดับ 2:</strong> นำแต้มราชินีมาหารเฉลี่ยให้คนที่ได้อันดับ 2 เท่ากันทุกคน</div>
                </div>
              </div>

              {/* Example Calculation Box */}
              <div className="p-3 bg-black/50 border border-vintage-gold/30 rounded-xl text-xs space-y-1">
                <span className="font-bold text-vintage-gold block">📝 ตัวอย่างการคิดคะแนนจริง:</span>
                <p className="text-vintage-paper/80 leading-relaxed">
                  สมชายมีเงินสด <strong>$15</strong>, ในโกดังมี แป้ง 4 ใบ ($8) + แอปเปิ้ล 2 ใบ ($6) + วิสกี้เถื่อน 1 ใบ ($6) รวมมูลค่าสินค้า = <strong>$20</strong>.
                  นอกจากนี้ยังครองแป้งมากที่สุดในโต๊ะ จึงได้โบนัส <strong>ราชาแป้ง (+20 แต้ม)</strong>!
                </p>
                <div className="text-emerald-300 font-bold pt-1">
                  ➔ คะแนนรวมของสมชาย = 15 (เงินสด) + 20 (สินค้า) + 20 (โบนัส) = <span className="text-vintage-gold text-sm underline">55 แต้ม!</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CARDS & PENALTIES */}
          {activeTab === 'cards' && (
            <div className="space-y-4">
              {/* Legal Goods Section */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">🥖</span>
                  <h4 className="font-bold text-emerald-300 text-xs uppercase tracking-wider">
                    สินค้าถูกกฎหมาย (Legal Goods) — ปลอดภัย มีโบนัสราชา
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {legalKeys.map((key) => {
                    const item = theme.legalGoods[key];
                    return (
                      <div
                        key={key}
                        className="p-2.5 rounded-xl border border-emerald-700/40 bg-emerald-950/20 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <div className="font-bold text-white text-xs">{item.name}</div>
                            <div className="text-[10px] text-vintage-paper/60 line-clamp-1">{item.flavor}</div>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-0.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-bold font-mono text-xs">
                            มูลค่า: \${item.value}
                          </span>
                          <span className="text-[10px] text-vintage-paper/60">
                            สารวัตรชดเชย: \${item.penalty}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Contraband Goods Section */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">☠️</span>
                  <h4 className="font-bold text-rose-400 text-xs uppercase tracking-wider">
                    ของเถื่อน / สินค้าผิดกฎหมาย (Contraband) — มูลค่าสูง เสี่ยงโดนยึดและปรับ
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {contrabandKeys.map((key) => {
                    const item = theme.contrabandGoods[key];
                    return (
                      <div
                        key={key}
                        className="p-2.5 rounded-xl border border-rose-700/40 bg-rose-950/20 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <div className="font-bold text-white text-xs">{item.name}</div>
                            <div className="text-[10px] text-vintage-paper/60 line-clamp-1">{item.flavor}</div>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-0.5">
                          <span className="px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 font-bold font-mono text-xs">
                            มูลค่า: \${item.value}
                          </span>
                          <span className="text-[10px] text-rose-400 font-bold">
                            ค่าปรับ: \${item.penalty}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BLUFFING TIPS & STRATEGIES */}
          {activeTab === 'tips' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-vintage-gold/40 space-y-1.5">
                <span className="font-bold text-vintage-gold text-sm flex items-center gap-1.5">
                  <span>🎭</span>
                  <span>1. กลยุทธ์ "พูดจริง แต่ติดสินบนล่อซื้อ" (Reverse Bluff)</span>
                </span>
                <p className="text-vintage-paper/80 leading-relaxed">
                  ใส่สินค้าถูกกฎหมายจริง 4 ใบ (เช่น แอปเปิ้ล 4 ใบ) แล้วประกาศแอปเปิ้ล 4 ใบตามตรง แต่กลับ<strong>ยื่นเงินสินบน $2-$3 ให้นายอำเภอ</strong>! สารวัตรที่โลภและสงสัยจะคิดว่าเราแอบขนของเถื่อนแน่ๆ เลยสั่งเปิดตรวจ เมื่อเปิดมาเจอของจริง 100% สารวัตรจะต้องจ่ายค่าชดเชยให้เราสูงสุดถึง $8 ฟรีๆ!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-600/40 space-y-1.5">
                <span className="font-bold text-rose-300 text-sm flex items-center gap-1.5">
                  <span>💰</span>
                  <span>2. เทคนิค "สอดไส้ 1 ใบ กำไรมหาศาล" (Piggyback Smuggling)</span>
                </span>
                <p className="text-vintage-paper/80 leading-relaxed">
                  ขนสินค้าถูกกฎหมาย 3 ใบ แล้วสอดแทรกของเถื่อนราคาแพง 1 ใบ (เช่น แท่นพิมพ์แบงก์ $9 หรือ เพชร $8) ประกาศเป็นของถูกกฎหมาย 4 ใบ ยื่นสินบนสัก $2-$3 สารวัตรมักจะปล่อยผ่านเพราะมองว่าได้เงินชัวร์ ทำให้เราฟันกำไรของเถื่อนเข้าโกดังได้สบาย
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-600/40 space-y-1.5">
                <span className="font-bold text-blue-300 text-sm flex items-center gap-1.5">
                  <span>🔪</span>
                  <span>3. สินบนรอบวง "จ้างสารวัตรเชียร์ตรวจเพื่อน" (Universal Bribe)</span>
                </span>
                <p className="text-vintage-paper/80 leading-relaxed">
                  หากเห็นว่าคู่แข่งที่กำลังแย่งชิงตำแหน่งราชาแอปเปิ้ล ขนของมา 5 ใบเต็มเกวียน เราสามารถ<strong>ยื่นสินบนให้สารวัตรเพื่อสั่งตรวจค้นเกวียนคันนั้น</strong>! หากตรวจเจอของเถื่อน เพื่อนจะเสียทั้งของ เสียทั้งค่าปรับ และชวดคะแนนโบนัสราชาไปเลย
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-600/40 space-y-1.5">
                <span className="font-bold text-emerald-300 text-sm flex items-center gap-1.5">
                  <span>👑</span>
                  <span>4. ชิงโบนัสราชา อย่ามองข้ามสินค้าพื้นฐาน</span>
                </span>
                <p className="text-vintage-paper/80 leading-relaxed">
                  สินค้าพื้นฐานอย่าง <strong>แป้ง/ข้าวสาร (+20 แต้ม)</strong> และ <strong>แอปเปิ้ล/ปลาแห้ง (+20 แต้ม)</strong> มีโบนัสราชาสูงที่สุดในเกม! อย่ามัวแต่ลักลอบของเถื่อนจนลืมสะสมสินค้าหลักเพื่อกวาดโบนัสราชา
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Close Button */}
        <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-vintage-gold to-amber-600 text-vintage-dark font-bold text-xs hover:scale-105 transition-all shadow-md cursor-pointer"
          >
            เข้าใจแล้ว พร้อมลุย!
          </button>
        </div>
      </div>
    </div>
  );
};
