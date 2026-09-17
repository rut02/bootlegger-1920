import React from 'react';
import { InspectionResult } from '../../shared/types.js';
import { CardItem } from './CardItem.js';

interface InspectionRevealModalProps {
  result: InspectionResult;
  isInspector: boolean;
  myPlayerId: string;
  onContinue: () => void;
}

export const InspectionRevealModal: React.FC<InspectionRevealModalProps> = ({
  result,
  isInspector,
  myPlayerId,
  onContinue,
}) => {
  const isPassed = result.action === 'passed';
  const isTruthful = result.isTruthful;
  const isOwner = myPlayerId === result.playerId;

  // If passed: other players only see legal goods!
  const visibleCards = isPassed && !isOwner
    ? result.actualCards.filter((c) => c.category === 'legal')
    : result.actualCards;

  const hiddenContrabandCount = isPassed
    ? result.actualCards.filter((c) => c.category === 'contraband').length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="vintage-box rounded-2xl max-w-lg w-full p-6 border-2 border-vintage-gold shadow-2xl relative overflow-hidden">
        {/* Header Badge */}
        <div className="text-center mb-5">
          {isPassed ? (
            <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold text-sm tracking-wider uppercase shadow-md">
              ✓ ปล่อยผ่านสำเร็จ (PASSED)
            </div>
          ) : isTruthful ? (
            <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold text-sm tracking-wider uppercase shadow-md animate-bounce">
              🌟 คนขับพูดความจริงทุกชิ้น!
            </div>
          ) : (
            <div className="inline-block px-4 py-1.5 rounded-full bg-rose-950 border border-rose-500 text-rose-300 font-bold text-sm tracking-wider uppercase shadow-md animate-pulse">
              🚨 จับได้คาหนังคาเขา! (CONTRABAND CAUGHT)
            </div>
          )}

          <h2 className="text-xl font-bold text-vintage-gold mt-2 font-vintage">
            รายงานผลการตรวจรถของ {result.playerName}
          </h2>
          <p className="text-xs text-vintage-paper/70">
            ผู้ตรวจค้น: {result.inspectorName}
          </p>
        </div>

        {/* Details based on scenario */}
        <div className="space-y-4 mb-6 text-sm">
          {/* Passed Scenario */}
          {isPassed && (
            <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-xl p-4 text-center space-y-2">
              <p className="text-emerald-200">
                สารวัตรโบกมือปล่อยให้รถของ <span className="font-bold">{result.playerName}</span> ผ่านเข้าเมืองไปได้!
              </p>
              {result.bribeAccepted && (
                <div className="text-xs text-amber-300 font-bold bg-black/40 py-1.5 px-3 rounded-lg inline-block border border-amber-500/30">
                  สารวัตรได้รับสินบน: \${result.bribeAccepted.cash} (จาก {result.bribeAccepted.fromPlayerName})
                </div>
              )}

              {hiddenContrabandCount > 0 && !isOwner && (
                <div className="text-xs text-amber-300/80 bg-rose-950/40 border border-rose-700/50 rounded-lg p-2 mt-2">
                  🔒 มีของเถื่อนลักลอบผ่านไปได้ {hiddenContrabandCount} ชิ้น (เป็นความลับ ไม่มีใครรู้ว่าคืออะไร!)
                </div>
              )}

              {isOwner && hiddenContrabandCount > 0 && (
                <div className="text-xs text-emerald-300 bg-black/50 border border-emerald-600 rounded-lg p-2 mt-2">
                  🎉 คุณแอบลักลอบขนของเถื่อนผ่านด่านสำเร็จ {hiddenContrabandCount} ชิ้น!
                </div>
              )}
            </div>
          )}

          {/* Inspected - Truthful Scenario */}
          {!isPassed && isTruthful && (
            <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-xl p-4">
              <p className="text-emerald-200 text-center mb-3">
                คนขับไม่ได้โกหกแม้แต่น้อย! สินค้าทั้งหมดตรงตามที่แจ้งไว้
              </p>
              <div className="bg-black/40 rounded-lg p-3 border border-emerald-800/40 flex justify-between items-center text-xs">
                <span>ค่าชดเชยที่สารวัตรต้องจ่าย:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  +\${Math.abs(result.fineOrCompensation)}
                </span>
              </div>
            </div>
          )}

          {/* Inspected - Lie / Contraband Scenario */}
          {!isPassed && !isTruthful && (
            <div className="bg-rose-950/30 border border-rose-700/40 rounded-xl p-4 space-y-3">
              <div className="bg-black/40 rounded-lg p-3 border border-rose-800/40 flex justify-between items-center text-xs">
                <span>ค่าปรับที่คนขับต้องจ่ายให้สารวัตร:</span>
                <span className="font-bold text-rose-400 text-sm">
                  -\${result.fineOrCompensation}
                </span>
              </div>

              {result.confiscatedCards.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-rose-300 block mb-1">
                    สินค้าที่ถูกยึดทิ้งลงกองกลาง ({result.confiscatedCards.length} ชิ้น):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.confiscatedCards.map((c) => (
                      <span
                        key={c.id}
                        className="text-xs px-2 py-1 rounded bg-rose-950 border border-rose-700 text-rose-200"
                      >
                        {c.icon} {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.debtSettlement && result.debtSettlement.cardsSeizedToCreditor.length > 0 && (
                <div className="bg-amber-950/50 border border-amber-600/60 rounded-lg p-2.5 text-xs text-amber-200">
                  <span className="font-bold block text-amber-400">⚠️ เงินสดไม่พอจ่ายหนี้!</span>
                  สินค้าในโกดังถูกยึดชดใช้หนี้ {result.debtSettlement.cardsSeizedToCreditor.length} ชิ้น ให้สารวัตร
                </div>
              )}

              {result.debtSettlement && result.debtSettlement.debtForgiven > 0 && (
                <div className="bg-blue-950/50 border border-blue-600/60 rounded-lg p-2.5 text-xs text-blue-200">
                  <span className="font-bold block text-blue-400">🛡️ สิทธิคุ้มครองคนหมดตัว (Bankruptcy Protection):</span>
                  เนื่องจากไม่มีเงินและสินค้าเหลือ ระบบได้ยกหนี้ที่เหลือ \${result.debtSettlement.debtForgiven} ให้โดยไม่ต้องจ่าย!
                </div>
              )}
            </div>
          )}

          {/* Cards Display */}
          <div>
            <span className="text-xs text-vintage-paper/70 font-bold block mb-2">
              {isPassed && !isOwner
                ? 'สินค้าถูกกฎหมายที่เปิดเผยต่อสาธารณะ:'
                : 'สินค้าจริงที่อยู่ในลังไม้:'}
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {visibleCards.map((card) => (
                <CardItem key={card.id} card={card} small />
              ))}
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="w-full py-3 bg-gradient-to-r from-vintage-gold to-amber-600 hover:from-amber-400 hover:to-amber-500 text-vintage-dark font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]"
        >
          ดำเนินการต่อ (Continue)
        </button>
      </div>
    </div>
  );
};
