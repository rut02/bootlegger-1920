import React, { useState } from 'react';
import { LegalGoodsType, PlayerWarehouse } from '../../shared/types.js';
import { THEMES, ThemeId } from '../../shared/themes.js';

interface WarehouseViewProps {
  warehouse: PlayerWarehouse;
  isOwner: boolean;
  playerName: string;
  themeId?: ThemeId;
}

const DEFAULT_GOODS_INFO: Record<LegalGoodsType, { icon: string; name: string }> = {
  flour: { icon: '🥖', name: 'แป้ง/ข้าว' },
  apples: { icon: '🍎', name: 'แอปเปิ้ล/ปลา' },
  coffee: { icon: '☕', name: 'กาแฟ/สมุนไพร' },
  cigars: { icon: '🚬', name: 'ซิการ์/หม้อดิน' },
};

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  warehouse,
  isOwner,
  playerName,
  themeId = 'mafia_1920',
}) => {
  const [showSecretVault, setShowSecretVault] = useState<boolean>(false);
  const theme = THEMES[themeId] || THEMES.mafia_1920;
  const legalTypes: LegalGoodsType[] = ['flour', 'apples', 'coffee', 'cigars'];

  const totalLegalCount = legalTypes.reduce(
    (acc, type) => acc + (warehouse.legal[type]?.length || 0),
    0
  );
  const totalItems = totalLegalCount + (warehouse.contrabandCount || 0);

  return (
    <div
      className={`vintage-box rounded-xl p-3 border text-xs shadow-md transition-all ${
        isOwner
          ? 'border-vintage-gold/80 bg-amber-950/20 ring-1 ring-vintage-gold/40'
          : 'border-vintage-gold/30 bg-black/40'
      }`}
    >
      <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-white/10">
        <span className={`font-bold flex items-center gap-1.5 ${isOwner ? 'text-vintage-gold' : 'text-vintage-gold/90'}`}>
          <span>🏛️</span>
          <span>{theme.warehouseTitle}: {playerName}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-vintage-paper/60">
            {totalItems} ชิ้น
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              isOwner
                ? 'bg-vintage-gold/30 text-amber-200 border border-vintage-gold/50'
                : 'bg-white/5 text-vintage-paper/50'
            }`}
          >
            {isOwner ? '👑 ของคุณ' : 'ผู้เล่นอื่น'}
          </span>
        </div>
      </div>

      {/* Legal Goods Grid */}
      <div className="grid grid-cols-4 gap-1.5 text-center mb-2">
        {legalTypes.map((type) => {
          const goodInfo = theme?.legalGoods?.[type] || DEFAULT_GOODS_INFO[type];
          const count = (warehouse.legal[type] || []).length;
          return (
            <div
              key={type}
              className={`p-1.5 rounded-lg border transition-all ${
                count > 0
                  ? 'bg-emerald-950/50 border-emerald-600/60 shadow-sm'
                  : 'bg-black/30 border-white/5 opacity-40'
              }`}
            >
              <div className="text-base">{goodInfo?.icon || '📦'}</div>
              <div className="text-[10px] text-vintage-paper/80 line-clamp-1">
                {goodInfo?.name.split(' ')[0] || type}
              </div>
              <div className="font-bold text-emerald-300 text-xs mt-0.5">x{count}</div>
            </div>
          );
        })}
      </div>

      {/* Contraband Banner */}
      <div className="bg-rose-950/30 border border-rose-800/40 rounded-lg p-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">☠️</span>
          <span className="text-[11px] text-rose-300 font-bold">ของเถื่อนที่รอดเข้ามา:</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-rose-400">{warehouse.contrabandCount} ชิ้น</span>
          {isOwner && warehouse.contrabandCount > 0 && (
            <button
              type="button"
              onClick={() => setShowSecretVault((prev) => !prev)}
              className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 border border-rose-600 text-rose-300 hover:bg-rose-900/60 transition-colors cursor-pointer active:scale-95 shadow-sm"
            >
              {showSecretVault ? '🔒 ซ่อน' : '👁️ ส่องดู'}
            </button>
          )}
        </div>
      </div>

      {/* Secret Contraband Vault for Owner */}
      {isOwner && showSecretVault && (
        <div className="mt-2 p-2.5 bg-black/70 rounded-lg border border-rose-700/60 animate-fadeIn">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-rose-300 font-bold flex items-center gap-1">
              <span>🔒</span>
              <span>สินค้าในโกดังลับ (มองเห็นแค่คุณคนเดียว):</span>
            </span>
            <span className="text-[10px] text-rose-400/80">
              รวม {warehouse.contrabandCards?.reduce((sum, c) => sum + c.value, 0) || 0} แต้ม
            </span>
          </div>
          {warehouse.contrabandCards && warehouse.contrabandCards.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {warehouse.contrabandCards.map((c, idx) => (
                <span
                  key={`${c.id}-${idx}`}
                  className="text-[10px] px-2 py-1 rounded-md bg-rose-950/90 border border-rose-700 text-rose-200 flex items-center gap-1 shadow"
                >
                  <span>{c.icon}</span>
                  <span className="font-bold">{c.name}</span>
                  <span className="text-vintage-gold font-bold">(\${c.value})</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-vintage-paper/50 italic">
              ไม่มีการ์ดของเถื่อนในโกดัง
            </div>
          )}
        </div>
      )}
    </div>
  );
};
