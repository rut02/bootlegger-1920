import React from 'react';
import { Crate, LegalGoodsType, Player, BribeOffer } from '../../shared/types.js';
import { THEMES, ThemeId } from '../../shared/themes.js';

interface CrateViewProps {
  crate: Crate | null;
  player: Player;
  isInspector: boolean;
  isTarget: boolean;
  themeId: ThemeId;
  bribeOffers: BribeOffer[];
  onSelectTarget?: () => void;
  onOpenBribePrompt?: (targetPlayerId: string) => void;
}

export const CrateView: React.FC<CrateViewProps> = ({
  crate,
  player,
  isInspector,
  isTarget,
  themeId,
  bribeOffers,
  onSelectTarget,
  onOpenBribePrompt,
}) => {
  const theme = THEMES[themeId] || THEMES.mafia_1920;

  if (!crate) {
    return (
      <div className="border border-dashed border-vintage-paper/20 rounded-xl p-3 text-center text-vintage-paper/50 text-xs bg-black/20">
        {player.isInspector ? (
          <div className="py-2 text-blue-300 font-bold flex items-center justify-center gap-1.5">
            <span>🛡️</span>
            <span>{theme.inspectorTitle.split(' ')[0]} (ผู้คุมด่าน ไม่ขนส่งสินค้า)</span>
          </div>
        ) : (
          <div className="py-2">
            ยังไม่ได้จัดของใส่ {theme.crateTitle}
          </div>
        )}
      </div>
    );
  }

  const declaredInfo = crate.declaredType ? theme.legalGoods[crate.declaredType] : null;
  const targetBribes = bribeOffers.filter((b) => b.targetPlayerId === player.id);

  return (
    <div
      onClick={onSelectTarget}
      className={`
        relative rounded-xl p-4 transition-all duration-200 vintage-box cursor-pointer
        ${isTarget ? 'ring-2 ring-vintage-gold shadow-[0_0_20px_rgba(212,175,55,0.3)] bg-vintage-card/90' : 'hover:border-vintage-gold/50'}
      `}
    >
      {/* Header: Player badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{player.avatar}</span>
          <div>
            <div className="font-bold text-vintage-gold text-sm flex items-center gap-1">
              <span>{player.name}</span>
              {player.isBot && <span className="text-[10px] bg-white/10 px-1 rounded text-vintage-paper/60">BOT</span>}
            </div>
            <span className="text-xs text-vintage-paper/50">เงินสด: \${player.cash}</span>
          </div>
        </div>

        {isTarget && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
            กำลังตรวจคันนี้ 🔍
          </span>
        )}
      </div>

      {/* Crate Visual */}
      <div className="bg-gradient-to-br from-[#382618] to-[#20150d] border border-[#5a412c] rounded-lg p-3 text-center shadow-inner relative overflow-hidden">
        <div className="text-3xl mb-1">{themeId === 'bang_rajan' ? '🐂' : '📦'}</div>
        <div className="text-xs font-bold text-amber-200">
          มีของซ่อนอยู่ {crate.cardsCount} ชิ้น
        </div>

        {/* Declaration Badge */}
        {crate.declaredType && (
          <div className="mt-2 bg-emerald-950/80 border border-emerald-700/60 rounded-md p-1.5 text-xs text-emerald-200">
            <span className="text-emerald-400 font-bold block text-[10px] uppercase tracking-wider">คำแจ้งของคนขับ:</span>
            <div className="flex items-center justify-center gap-1 font-bold mt-0.5">
              <span>{declaredInfo?.icon}</span>
              <span>{declaredInfo?.name}</span>
              <span className="text-vintage-gold font-bold">x {crate.declaredCount}</span>
            </div>
          </div>
        )}

        {/* Active Bribes on this cart */}
        {targetBribes.length > 0 && (
          <div className="mt-2 space-y-1">
            {targetBribes.map((b) => (
              <div
                key={b.id}
                className={`text-[10px] px-2 py-0.5 rounded text-left border ${
                  b.intent === 'inspect'
                    ? 'bg-rose-950/80 border-rose-600 text-rose-300'
                    : 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                }`}
              >
                💵 <strong>\${b.cash}</strong> ({b.intent === 'inspect' ? 'เชียร์ตรวจ!' : 'เชียร์ปล่อย!'})
              </div>
            ))}
          </div>
        )}

        {/* Button for other players to bribe on this cart */}
        {onOpenBribePrompt && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenBribePrompt(player.id);
            }}
            className="mt-2.5 w-full py-1 text-[11px] bg-amber-950/70 border border-amber-500/50 hover:bg-amber-900 text-amber-200 rounded font-bold transition-all"
          >
            💰 ยื่นสินบนเกี่ยวกับคันนี้
          </button>
        )}

        {/* Secret peek for owner only */}
        {crate.cards && crate.cards.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/10">
            <span className="text-[10px] text-vintage-gold/80 block mb-1">ความลับของคุณ (คนอื่นมองไม่เห็น):</span>
            <div className="flex flex-wrap gap-1 justify-center">
              {crate.cards.map((c) => (
                <span
                  key={c.id}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    c.category === 'legal' ? 'bg-emerald-900/80 text-emerald-300' : 'bg-rose-900/80 text-rose-300 font-bold'
                  }`}
                >
                  {c.icon} {c.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
