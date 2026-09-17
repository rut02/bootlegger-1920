import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { GameScoreResult } from '../../shared/types.js';
import { sounds } from '../utils/audio.js';
import { RulesModal } from './RulesModal.js';

interface GameOverModalProps {
  scores: GameScoreResult[];
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ scores, onRestart }) => {
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  useEffect(() => {
    sounds.playCoin();
    // Fire festive mafia confetti!
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#d4af37', '#f3e5ab', '#ffffff', '#8b0000'],
    });
  }, []);

  const winner = scores[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="vintage-box rounded-2xl max-w-xl w-full p-6 sm:p-8 border-2 border-vintage-gold shadow-[0_0_50px_rgba(212,175,55,0.4)] my-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2 animate-bounce">👑</div>
          <h1 className="text-2xl sm:text-3xl font-bold font-vintage gold-gradient-text tracking-wide">
            THE SUPREME DON OF CHICAGO
          </h1>
          <p className="text-sm text-vintage-paper/70 mt-1">
            การแข่งขันสิ้นสุดลงแล้ว ขอแสดงความยินดีกับเจ้าพ่อคนใหม่!
          </p>
        </div>

        {/* Winner Spotlight Banner */}
        {winner && (
          <div className="bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border-2 border-vintage-gold rounded-xl p-4 text-center mb-6 shadow-lg">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest block">
              🏆 ผู้ชนะเลิศอันดับหนึ่ง
            </span>
            <div className="text-2xl font-bold text-white mt-1">
              {winner.playerName}
            </div>
            <div className="text-lg font-bold text-vintage-gold mt-0.5">
              คะแนนรวม: {winner.totalScore} แต้ม
            </div>
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-bold text-vintage-paper/70 uppercase tracking-wider">
            ตารางสรุปคะแนน (Leaderboard):
          </h3>

          <div className="divide-y divide-white/10 rounded-xl overflow-hidden border border-vintage-gold/20 bg-black/40">
            {scores.map((score, index) => (
              <div
                key={score.playerId}
                className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  index === 0 ? 'bg-amber-950/30 font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      index === 0
                        ? 'bg-vintage-gold text-vintage-dark'
                        : index === 1
                        ? 'bg-zinc-400 text-black'
                        : index === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm text-white flex items-center gap-1.5">
                      <span>{score.playerName}</span>
                      {score.isWinner && <span className="text-xs">👑</span>}
                    </div>
                    <div className="text-[11px] text-vintage-paper/60">
                      เงินสด: \${score.cash} | มูลค่าสินค้า: \${score.goodsValue}
                    </div>
                  </div>
                </div>

                <div className="text-right sm:text-right pl-10 sm:pl-0">
                  <div className="text-base font-bold text-vintage-gold">
                    {score.totalScore} แต้ม
                  </div>
                  {score.bonuses.length > 0 && (
                    <div className="text-[10px] text-emerald-400">
                      โบนัส: +{score.bonuses.reduce((acc, b) => acc + b.bonusAmount, 0)} แต้ม
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rules & Scoring Breakdown Button */}
        <button
          type="button"
          onClick={() => setShowRulesModal(true)}
          className="w-full py-2.5 mb-3 rounded-xl border border-vintage-gold/50 bg-vintage-gold/15 hover:bg-vintage-gold/25 text-vintage-gold font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow active:scale-95"
        >
          <span>📜</span>
          <span>ดูกฎการคำนวณคะแนน & ตารางโบนัสราชา</span>
        </button>

        <RulesModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
        />

        {/* Restart / Back to Lobby Button */}
        <button
          onClick={onRestart}
          className="w-full py-3.5 bg-gradient-to-r from-vintage-gold to-amber-600 hover:from-amber-400 hover:to-amber-500 text-vintage-dark font-bold text-base rounded-xl shadow-lg transition-all active:scale-[0.98]"
        >
          กลับสู่ล็อบบี้ (Back to Lobby)
        </button>
      </div>
    </div>
  );
};
