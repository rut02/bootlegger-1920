import React, { useEffect } from 'react';
import { InspectionAnimationState } from '../../shared/types.js';
import { CardItem } from './CardItem.js';
import { sounds } from '../utils/audio.js';

interface InspectionSuspenseModalProps {
  animation: InspectionAnimationState;
}

export const InspectionSuspenseModal: React.FC<InspectionSuspenseModalProps> = ({ animation }) => {
  const isPassedAction = animation.action === 'passed';

  useEffect(() => {
    // Play sound on each reveal step
    if (animation.revealedCount > 0) {
      const lastRevealed = animation.cards[animation.revealedCount - 1];
      if (lastRevealed) {
        if (isPassedAction) {
          if (lastRevealed.category === 'legal') {
            sounds.playCoin();
          } else {
            // Contraband slipped through face-down: play mysterious sneak sound ("ตื๊ดๆ")
            sounds.playContrabandSneak();
          }
        } else {
          if (lastRevealed.id && !lastRevealed.id.startsWith('hidden_')) {
            const isMatch = lastRevealed.type === animation.declaredType;
            if (isMatch) {
              sounds.playCoin();
            } else {
              sounds.playSiren();
            }
          } else {
            sounds.playFlip();
          }
        }
      }
    } else {
      sounds.playLatch();
      sounds.playHeartbeat();
    }
  }, [animation.revealedCount, isPassedAction]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fadeIn">
      <div className={`vintage-box rounded-3xl max-w-2xl w-full p-6 sm:p-10 border-2 shadow-[0_0_80px_rgba(245,158,11,0.6)] text-center relative overflow-hidden ${
        isPassedAction ? 'border-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.5)]' : 'border-amber-500 shadow-[0_0_80px_rgba(245,158,11,0.6)]'
      }`}>
        {/* Animated dramatic searchlights */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className={`absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-3xl animate-pulse pointer-events-none ${
          isPassedAction ? 'bg-emerald-600/15' : 'bg-rose-600/15'
        }`} />

        {/* Header Badge */}
        <div className="mb-6">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-widest mb-3 shadow animate-pulse ${
            isPassedAction
              ? 'bg-emerald-950/90 border border-emerald-400 text-emerald-300'
              : 'bg-amber-950/80 border border-amber-500 text-amber-300'
          }`}>
            <span>{isPassedAction ? '🤝 สารวัตรสั่งปล่อยผ่าน (PASSED)' : '🚨 การตรวจค้นสด (LIVE INSPECTION)'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-vintage gold-gradient-text">
            {isPassedAction ? 'สินค้ากำลังผ่านด่านศุลกากร!' : 'กำลังเปิดตรวจเกวียน / ลังไม้!'}
          </h2>
          <p className="text-sm text-vintage-paper/80 mt-1">
            รถของ: <strong className="text-vintage-gold">{animation.targetPlayerName}</strong> | แจ้งว่ามี: <strong className="text-emerald-400">{animation.declaredCount} ชิ้น</strong>
          </p>
        </div>

        {/* Tension progress bar */}
        <div className="w-full bg-black/70 rounded-full h-2.5 mb-6 overflow-hidden border border-white/10 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isPassedAction
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-rose-500'
            }`}
            style={{
              width: `${(animation.revealedCount / animation.cards.length) * 100}%`,
            }}
          />
        </div>

        {/* Cards Row: Mystery Facedown vs Flipped Faceup */}
        <div className="flex flex-wrap gap-3 justify-center items-center my-6 min-h-[200px]">
          {animation.cards.map((card, idx) => {
            const isRevealed = idx < animation.revealedCount;
            const isMystery = card.id && card.id.startsWith('hidden_');
            const isContrabandPassed = isPassedAction && card.category === 'contraband';
            const isMatch = !isMystery && card.type === animation.declaredType;

            return (
              <div key={card.id || idx} className="relative transition-all duration-500 transform">
                {isRevealed && !isMystery ? (
                  isContrabandPassed ? (
                    /* Contraband during PASS: Keep Face-Down with Crimson Mystery Aura */
                    <div className="animate-[flipIn_0.5s_ease-out] flex flex-col items-center">
                      <div className="w-32 h-48 sm:w-36 sm:h-52 rounded-2xl border-2 border-rose-500/80 bg-gradient-to-b from-[#3a0d15] via-[#20070c] to-[#0d0205] shadow-[0_0_25px_rgba(244,63,94,0.6)] flex flex-col items-center justify-center relative overflow-hidden ring-2 ring-rose-500/40">
                        <img
                          src="/cards/card_back.jpg"
                          alt="Face-down Contraband"
                          className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 bg-rose-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center">
                          <span className="text-3xl animate-bounce">🤫</span>
                          <span className="text-xs font-bold text-rose-300 mt-1 uppercase tracking-wider">
                            ของเถื่อน
                          </span>
                          <span className="text-[9px] text-rose-200/70 font-mono mt-0.5">
                            (ไม่เปิดเผย)
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 py-1 px-2.5 rounded-lg text-xs font-bold text-center bg-rose-950/90 border border-rose-500 text-rose-300 shadow-lg animate-pulse">
                        🤫 ลักลอบผ่านสำเร็จ!
                      </div>
                    </div>
                  ) : (
                    /* Legal card during PASS or standard inspected card: Flip Face-Up */
                    <div className="animate-[flipIn_0.5s_ease-out]">
                      <CardItem card={card} />
                      <div
                        className={`mt-2 py-1 px-2 rounded-lg text-xs font-bold text-center shadow-lg transition-all ${
                          isPassedAction
                            ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                            : isMatch
                            ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                            : 'bg-rose-950 border border-rose-500 text-rose-300 animate-bounce'
                        }`}
                      >
                        {isPassedAction
                          ? 'สินค้าผ่านด่าน ✓'
                          : isMatch
                          ? 'ตรงกับที่แจ้ง ✓'
                          : 'ของเถื่อนแตก! 🚨'}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="w-32 h-48 sm:w-36 sm:h-52 rounded-2xl border-2 border-dashed border-amber-500/50 bg-gradient-to-b from-[#2d1b10] via-[#1c1008] to-[#0d0704] flex flex-col items-center justify-center shadow-xl animate-pulse">
                    <span className="text-4xl text-amber-400/50 font-bold mb-2">?</span>
                    <span className="text-[11px] font-bold text-amber-300/70 tracking-widest uppercase">
                      ใบที่ {idx + 1}
                    </span>
                    <span className="text-[9px] text-white/30 mt-1">กำลังจะถูกเปิด</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dramatic Status Ticker */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-xs font-mono">
          <span className={`animate-ping w-2 h-2 rounded-full ${isPassedAction ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          {animation.revealedCount < animation.cards.length ? (
            <span className={isPassedAction ? 'text-emerald-200' : 'text-amber-200'}>
              กำลังตรวจดูใบที่ {animation.revealedCount + 1} จาก {animation.cards.length} ใบ...
            </span>
          ) : (
            <span className="text-emerald-400 font-bold text-sm">
              {isPassedAction ? 'ปล่อยผ่านครบทุกใบแล้ว! สินค้าเคลื่อนเข้าสู่โกดัง...' : 'เปิดครบทุกใบแล้ว! กำลังประทับตราตัดสินคดี...'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
